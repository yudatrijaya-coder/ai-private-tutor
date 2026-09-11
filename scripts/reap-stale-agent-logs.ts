/**
 * Reap stale non-terminal AgentLog rows (ledger C-10).
 *
 * `AgentLog` rows are written as QUEUED → ACTIVE → (COMPLETED|FAILED), with
 * RETRYING when a worker schedules a retry. When the process dies mid-job, or
 * when a retry is scheduled and never picked up, the row is stranded in a
 * non-terminal state forever. The C-01 incident left 5,366 such rows: they make
 * every manual inspection misleading, because a permanently-`ACTIVE` row looks
 * like a job that is still running months after it died.
 *
 * This marks rows that have not been touched for `--days` (default 7) as
 * FAILED with a recognisable error string. It never touches rows in a terminal
 * state, and never touches rows that a live worker might still be updating.
 *
 * SAFETY
 *   - Dry run by default. Nothing is written unless `--apply` is passed.
 *   - `--apply` writes a rollback snapshot (ids + original status) before
 *     touching anything.
 *   - Only QUEUED / ACTIVE / RETRYING rows are eligible.
 *
 * USAGE
 *   npx tsx scripts/reap-stale-agent-logs.ts                 # dry run, 7 days
 *   npx tsx scripts/reap-stale-agent-logs.ts --days 30       # dry run, 30 days
 *   npx tsx scripts/reap-stale-agent-logs.ts --apply         # write
 *   npx tsx scripts/reap-stale-agent-logs.ts --apply --days 30
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

const STALE_ERROR = "stale: never reached terminal state";

const NON_TERMINAL = ["QUEUED", "ACTIVE", "RETRYING"] as const;

/** Parse `--days N` / `--apply`. */
function parseArgs(argv: string[]) {
  let days = 7;
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--days") {
      const raw = argv[++i];
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--days butuh angka > 0, dapat: ${raw}`);
      }
      days = parsed;
    } else if (arg.startsWith("--days=")) {
      const parsed = Number(arg.slice("--days=".length));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`--days butuh angka > 0, dapat: ${arg}`);
      }
      days = parsed;
    }
  }
  return { days, apply };
}

async function main() {
  const { days, apply } = parseArgs(process.argv.slice(2));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`Mode   : ${apply ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"}`);
  console.log(`Cutoff : ${cutoff.toISOString()} (tidak disentuh > ${days} hari)`);
  console.log(`Status : ${NON_TERMINAL.join(", ")}`);
  console.log("");

  // Rows the reaper would touch, oldest first.
  const stale = await prisma.agentLog.findMany({
    where: {
      status: { in: NON_TERMINAL as unknown as never[] },
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      agentType: true,
      action: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "asc" },
  });

  if (stale.length === 0) {
    console.log("Tidak ada baris non-terminal yang melewati cutoff.");
    return;
  }

  // Breakdown by agentType/action/status so the blast radius is visible before
  // anything is written.
  const groups = new Map<string, number>();
  for (const row of stale) {
    const key = `${row.agentType} | ${row.action} | ${row.status}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  console.log(`Kandidat: ${stale.length} baris`);
  console.log("");
  console.log("Rincian (agentType | action | status -> jumlah):");
  for (const [key, count] of [...groups.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key} -> ${count}`);
  }

  console.log("");
  console.log(`Tertua : ${stale[0].updatedAt.toISOString()} (${stale[0].agentType}/${stale[0].action})`);
  console.log(`Terbaru: ${stale[stale.length - 1].updatedAt.toISOString()}`);

  if (!apply) {
    console.log("");
    console.log("DRY-RUN selesai. Jalankan ulang dengan --apply untuk menulis.");
    return;
  }

  // Snapshot before writing — rollback needs id + original status only.
  const snapshotPath = `docs/designs/${new Date().toISOString().slice(0, 10)}-c10-reap-rollback.json`;
  writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        days,
        cutoff: cutoff.toISOString(),
        count: stale.length,
        rows: stale.map((r) => ({ id: r.id, status: r.status })),
      },
      null,
      2,
    ),
  );
  console.log("");
  console.log(`Snapshot rollback: ${snapshotPath}`);

  const result = await prisma.agentLog.updateMany({
    where: {
      id: { in: stale.map((r) => r.id) },
    },
    data: {
      status: "FAILED",
      error: STALE_ERROR,
    },
  });

  console.log(`Ditandai FAILED: ${result.count} baris`);

  // Read back — never trust updateMany's own count as proof.
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
