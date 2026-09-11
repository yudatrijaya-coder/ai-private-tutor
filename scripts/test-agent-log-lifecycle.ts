/**
 * Regression test for the AgentLog lifecycle (ledger C-10).
 *
 * BUG THIS LOCKS DOWN
 *   `createWorker` wrote the lifecycle as three separate `agentLog.create`
 *   calls and never updated the row it opened. Every attempt therefore left a
 *   permanently-`ACTIVE` orphan behind: 2,703 of them accumulated in
 *   production, which made every manual inspection misleading — a row stuck on
 *   ACTIVE looks like a job still running months after it died.
 *
 * INVARIANTS ASSERTED
 *   1. After a job reaches a final state, ZERO rows for that job are in a
 *      non-terminal state (QUEUED / ACTIVE / RETRYING).
 *   2. A successful job leaves exactly ONE row, and it is COMPLETED.
 *   3. A job that exhausts its retries leaves exactly ONE row per attempt,
 *      every one of them terminal.
 *
 * ISOLATION
 *   Uses Redis database 9 while the application uses database 0, so the
 *   production workers cannot consume these jobs and this test cannot
 *   interfere with production. Rows are tagged with a unique jobId and removed
 *   in a `finally` block.
 *
 * USAGE
 *   npx tsx scripts/test-agent-log-lifecycle.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

// Must be set before `@/queue/redis` is imported — it reads REDIS_URL once at
// module init. Isolates this test onto its own Redis database.
const TEST_DB = "9";
process.env.REDIS_URL = `redis://localhost:6379/${TEST_DB}`;

const NON_TERMINAL = ["QUEUED", "ACTIVE", "RETRYING"] as const;

let failures = 0;
let checks = 0;

function check(label: string, got: unknown, want: unknown) {
  checks++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  (got ${JSON.stringify(got)} want ${JSON.stringify(want)})`}`,
  );
}

/** Run one job to completion and return the jobId it was tagged with. */
async function runJob(
  tag: string,
  processor: () => Promise<void>,
  attempts: number | undefined,
): Promise<string> {
  const { Queue, Worker } = await import("bullmq");
  const { redis } = await import("../src/queue/redis");

  // `redis` is created with `lazyConnect: true`, so the socket is not open
  // until someone asks. `initQueues` does this explicitly before wiring
  // workers up; without it BullMQ's Worker waits forever on a dead connection
  // and the job is never picked up.
  if (redis.status === "wait") {
    await redis.connect();
  }
  await redis.ping();

  const jobId = `${tag}-${randomUUID().slice(0, 8)}`;
  const queueName = "guardian-report" as const;

  // `attempts === undefined` means "do not specify it anywhere" — exactly what
  // a bare `new Queue(...).add(...)` does. BullMQ then runs the processor ONCE
  // while reporting `job.opts.attempts` as 0. That is the configuration that
  // used to strand a row on RETRYING forever, so it gets its own case.
  const queue = new Queue(queueName, {
    connection: redis as never,
    defaultJobOptions: {
      ...(attempts === undefined ? {} : { attempts }),
      backoff: { type: "fixed", delay: 10 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  // What BullMQ will really do — mirrors `effectiveAttempts` in dlq.ts.
  const effective = Math.max(1, attempts ?? 0);

  // A dedicated Worker on the same (isolated) database, mirroring exactly how
  // `initQueues` wires workers up in production.
  const { createWorker } = await import("../src/queue/worker");
  const worker = createWorker(queueName, processor as never, { concurrency: 1 });

  const settled = new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    worker.on("completed", finish);
    // BullMQ emits `failed` after EVERY attempt, not just the last one. Waiting
    // on the first event would assert while a retry is still pending and read a
    // row that is legitimately still RETRYING.
    worker.on("failed", (job) => {
      if (job && job.attemptsMade >= effective) finish();
    });
    setTimeout(finish, 20_000).unref?.();
  });

  await queue.add(queueName, { test: true, tag }, { jobId });

  // Hard ceiling so a wedged connection fails the test instead of hanging the
  // whole run.
  await Promise.race([
    settled,
    new Promise<void>((r) => setTimeout(r, 25_000)),
  ]);

  // Confirm the queue agrees the job is done before reading AgentLog — the
  // final write happens inside the worker, after BullMQ records the attempt.
  for (let i = 0; i < 60; i++) {
    const j = await queue.getJob(jobId);
    if (!j) break;
    const state = await j.getState();
    if (state === "completed") break;
    if (state === "failed" && j.attemptsMade >= effective) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Let any trailing AgentLog write land before asserting.
  await new Promise((r) => setTimeout(r, 500));

  await worker.close();
  await queue.close();

  return jobId;
}

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  /** Count rows and the non-terminal subset for a jobId. */
  async function survey(jobId: string) {
    const rows = await prisma.agentLog.findMany({
      where: { jobId },
      select: { status: true, error: true, metadata: true },
    });
    const nonTerminal = rows.filter((r) =>
      (NON_TERMINAL as readonly string[]).includes(r.status as string),
    ).length;
    return {
      total: rows.length,
      nonTerminal,
      statuses: rows.map((r) => r.status as string),
      errors: rows.map((r) => r.error),
    };
  }

  const created: string[] = [];

  try {
    console.log("=== 1. job berhasil ===");
    {
      const jobId = await runJob("ok", async () => {}, 1);
      created.push(jobId);
      const s = await survey(jobId);
      console.log(`  statuses: ${JSON.stringify(s.statuses)}`);
      check("tepat 1 baris", s.total, 1);
      check("status COMPLETED", s.statuses, ["COMPLETED"]);
      check("0 baris non-terminal (tidak ada ACTIVE yatim)", s.nonTerminal, 0);
    }

    console.log("\n=== 2. job gagal habis retry ===");
    {
      const jobId = await runJob(
        "fail",
        async () => {
          throw new Error("test: kegagalan yang disengaja");
        },
        3,
      );
      created.push(jobId);
      const s = await survey(jobId);
      console.log(`  statuses: ${JSON.stringify(s.statuses)}`);
      console.log(`  errors  : ${JSON.stringify(s.errors)}`);
      check("0 baris non-terminal (tidak ada ACTIVE/RETRYING yatim)", s.nonTerminal, 0);
      check("semua baris terminal", s.statuses.every((x) => ["COMPLETED", "FAILED"].includes(x)), true);
      check("tepat 1 baris FAILED (dead-letter)", s.statuses.filter((x) => x === "FAILED").length, 1);
      // `getDeadLetteredJobs` finds dead letters by this marker — without it the
      // row is FAILED but invisible to the DLQ viewer and to manual retry.
      check(
        "baris FAILED memuat penanda Dead-lettered",
        (s.errors[0] ?? "").includes("Dead-lettered"),
        true,
      );
    }

    console.log("\n=== 3. job gagal TANPA `attempts` (BullMQ mencoba sekali) ===");
    {
      // The trap: `job.opts.attempts` reads 0 here, and BullMQ runs the
      // processor exactly once. A predicate that falls back to MAX_RETRIES
      // waits for a retry that never arrives and leaves the row RETRYING
      // forever — the original bug, recreated.
      const jobId = await runJob(
        "noattempts",
        async () => {
          throw new Error("test: gagal sekali tanpa retry");
        },
        undefined,
      );
      created.push(jobId);
      const s = await survey(jobId);
      console.log(`  statuses: ${JSON.stringify(s.statuses)}`);
      console.log(`  errors  : ${JSON.stringify(s.errors)}`);
      check("tepat 1 baris", s.total, 1);
      check("status FAILED (bukan RETRYING yang menggantung)", s.statuses, ["FAILED"]);
      check("0 baris non-terminal", s.nonTerminal, 0);
      check(
        "penanda Dead-lettered menyebut 1 percobaan",
        (s.errors[0] ?? "").includes("Dead-lettered after 1"),
        true,
      );
    }

    console.log("\n=== 4. tidak ada baris yatim untuk job uji ===");
    {
      for (const jobId of created) {
        const s = await survey(jobId);
        check(`jobId ${jobId.slice(0, 14)}… bebas non-terminal`, s.nonTerminal, 0);
      }
    }
  } finally {
    if (created.length) {
      const del = await prisma.agentLog.deleteMany({ where: { jobId: { in: created } } });
      console.log(`\nbersih-bersih: ${del.count} baris uji dihapus`);
    }
    await prisma.$disconnect();
    // Close the isolated Redis connection too, then force exit: a lingering
    // handle would otherwise keep the process alive past the summary.
    const { redis } = await import("../src/queue/redis");
    if (redis.status === "ready") await redis.quit();
  }

  console.log(`\nlulus: ${checks - failures}/${checks}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
