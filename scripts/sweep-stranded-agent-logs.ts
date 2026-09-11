/**
 * One-time sweep of the stranded AgentLog rows left by the pre-fix worker
 * lifecycle (ledger C-10).
 *
 * WHY THESE ROWS EXIST
 *   `createWorker` used to open a row with `agentLog.create({status:"ACTIVE"})`
 *   and then never update it: the COMPLETED / RETRYING / FAILED transitions were
 *   *new rows* rather than updates. Two separate defects followed:
 *
 *   1. Every attempt leaked a permanently-`ACTIVE` row. 2,703 accumulated.
 *   2. `shouldDeadLetter` compared `attemptsMade >= attempts`, which is never
 *      true while the processor runs (`attemptsMade` is 0-based there), so the
 *      final failure was never recorded — the row stayed `RETRYING` and the
 *      job's retry budget was spent with nothing to show for it.
 *
 *   Both are fixed in the worker. This script cleans up the residue. It is NOT
 *   meant to run on a schedule — after the fix no new rows are stranded.
 *
 * THE LABEL IS DERIVED, NOT ASSUMED
 *   A stranded row is not automatically a failure. For `guardian-report` there
 *   are 12 `ACTIVE` rows and 12 `COMPLETED` rows: those jobs *succeeded*, and
 *   the `ACTIVE` row is simply the copy nobody updated. Calling those rows
 *   FAILED would plant a false diagnosis in the data — exactly the kind of
 *   misleading record this whole audit exists to remove. So each row is
 *   classified by what actually happened to its job, and the `error` string
 *   says which case it is.
 *
 * SAFETY
 *   - Dry run by default; nothing is written without `--apply`.
 *   - Terminal rows (COMPLETED / FAILED) are never touched.
 *   - Rows younger than `--days` (default 7) are never touched, so a job that
 *     is genuinely still in flight cannot be caught by this.
 *   - `--apply` writes a rollback snapshot (id + original status + error) first.
 *
 * USAGE
 *   npx tsx scripts/sweep-stranded-agent-logs.ts            # dry run
 *   npx tsx scripts/sweep-stranded-agent-logs.ts --apply
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const NON_TERMINAL = ["QUEUED", "ACTIVE", "RETRYING"] as const;
const TERMINAL = ["COMPLETED", "FAILED"] as const;

const LABEL = {
  completed:
    "superseded: job completed, this row was never updated (lifecycle bug, fixed)",
  failed:
    "superseded: job failed and was recorded, this row was never updated (lifecycle bug, fixed)",
  exhausted:
    "stale: retries exhausted with no terminal record (lifecycle bug, fixed)",
  stranded: "stale: attempt never reached a terminal state",
} as const;

function parseArgs(argv: string[]) {
  let days = 7;
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--days") {
      const parsed = Number(argv[++i]);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--days butuh angka > 0`);
      }
      days = parsed;
    } else if (arg.startsWith("--days=")) {
      const parsed = Number(arg.slice("--days=".length));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--days butuh angka > 0`);
      }
      days = parsed;
    }
  }
  return { days, apply };
}

type Plan = {
  id: string;
  status: string;
  agentType: string;
  action: string;
  updatedAt: Date;
  newStatus: "COMPLETED" | "FAILED";
  label: string;
};

async function main() {
  const { days, apply } = parseArgs(process.argv.slice(2));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`Mode   : ${apply ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"}`);
  console.log(`Cutoff : ${cutoff.toISOString()} (> ${days} hari)`);
  console.log("");

  const stranded = await prisma.agentLog.findMany({
    where: {
      status: { in: NON_TERMINAL as unknown as never[] },
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      jobId: true,
      agentType: true,
      action: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  if (stranded.length === 0) {
    console.log("Tidak ada baris non-terminal melewati cutoff.");
    return;
  }

  // Classify each stranded row by what happened to its job. A terminal sibling
  // created later is the evidence that the job actually finished — but BullMQ
  // recycles small integer job ids, so a `COMPLETED` row sharing the same
  // `jobId` might belong to a completely different job from a different week.
  // Only a sibling created within an hour of the stranded row is treated as
  // evidence; anything further apart is not trustworthy and falls back to the
  // conservative `stale` classification.
  const SIBLING_WINDOW_MS = 60 * 60 * 1000;
  const plans: Plan[] = [];
  for (const row of stranded) {
    const siblings = await prisma.agentLog.findMany({
      where: {
        jobId: row.jobId,
        id: { not: row.id },
        status: { in: TERMINAL as unknown as never[] },
        createdAt: {
          gt: row.createdAt,
          lt: new Date(row.createdAt.getTime() + SIBLING_WINDOW_MS),
        },
      },
      select: { status: true },
      orderBy: { createdAt: "desc" },
    });

    const completed = siblings.find((s) => s.status === "COMPLETED");
    const failed = siblings.find((s) => s.status === "FAILED");

    let newStatus: "COMPLETED" | "FAILED";
    let label: string;
    if (completed) {
      newStatus = "COMPLETED";
      label = LABEL.completed;
    } else if (failed) {
      newStatus = "FAILED";
      label = LABEL.failed;
    } else if (row.status === "RETRYING") {
      newStatus = "FAILED";
      label = LABEL.exhausted;
    } else {
      newStatus = "FAILED";
      label = LABEL.stranded;
    }

    plans.push({
      id: row.id,
      status: row.status,
      agentType: row.agentType,
      action: row.action,
      updatedAt: row.updatedAt,
      newStatus,
      label,
    });
  }

  const summary = new Map<string, number>();
  for (const p of plans) {
    const key = `${p.status} -> ${p.newStatus}  |  ${p.label}`;
    summary.set(key, (summary.get(key) ?? 0) + 1);
  }

  console.log(`Kandidat: ${plans.length} baris`);
  console.log("");
  console.log("Rencana (status asal -> status baru | alasan -> jumlah):");
  for (const [key, n] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key} -> ${n}`);
  }

  console.log("");
  console.log("Per agentType/action:");
  const byAction = new Map<string, number>();
  for (const p of plans) {
    const key = `${p.agentType} | ${p.action}`;
    byAction.set(key, (byAction.get(key) ?? 0) + 1);
  }
  for (const [key, n] of [...byAction.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key} -> ${n}`);
  }

  if (!apply) {
    console.log("");
    console.log("DRY-RUN selesai. Jalankan ulang dengan --apply untuk menulis.");
    return;
  }

  const snapshotPath = `docs/designs/${new Date().toISOString().slice(0, 10)}-c10-stranded-sweep-rollback.json`;
  writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        days,
        cutoff: cutoff.toISOString(),
        count: plans.length,
        rows: plans.map((p) => ({ id: p.id, status: p.status, newStatus: p.newStatus })),
      },
      null,
      2,
    ),
  );
  console.log("");
  console.log(`Snapshot rollback: ${snapshotPath}`);

  // Group by target status so each write is a single statement.
  let written = 0;
  for (const target of ["COMPLETED", "FAILED"] as const) {
    const ids = plans.filter((p) => p.newStatus === target).map((p) => p.id);
    if (ids.length === 0) continue;
    const res = await prisma.agentLog.updateMany({
      where: { id: { in: ids } },
      data: { status: target as never },
    });
    written += res.count;
    console.log(`  ${target}: ${res.count} baris`);
  }
  console.log(`Total ditulis: ${written}`);

  // The error/label differs per row, so write it individually — and verify by
  // reading back rather than trusting the counts above.
  for (const p of plans) {
    await prisma.agentLog.update({
      where: { id: p.id },
      data: { error: p.label },
    });
  }

  const remaining = await prisma.agentLog.count({
    where: {
      status: { in: NON_TERMINAL as unknown as never[] },
      updatedAt: { lt: cutoff },
    },
  });
  console.log(`Sisa non-terminal melewati cutoff: ${remaining}`);
  if (remaining !== 0) {
    console.log("PERINGATAN: masih ada sisa, periksa manual.");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
