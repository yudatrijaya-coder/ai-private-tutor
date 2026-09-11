/**
 * Production proof for the C-10 lifecycle fix.
 *
 * WHAT THIS PROVES
 *   The regression test (`test-agent-log-lifecycle.ts`) runs on an isolated
 *   Redis database with its own worker. That is good for repeatability but it
 *   does not prove the *deployed* worker behaves correctly. This script enqueues
 *   jobs onto the real queue (Redis database 0) and lets the running production
 *   worker consume them, then reads the resulting `AgentLog` rows.
 *
 *   Two jobs, chosen so neither has a third-party side effect:
 *
 *     1. `assessment-generate` with an unknown student and topic.
 *        `processAssessmentGenerate` finds no matching material and returns —
 *        no LLM call, no database write. It exercises the SUCCESS path, and it
 *        is the exact queue that accumulated 2,637 stranded rows.
 *
 *     2. `improvement-analysis` with an `attemptId` that does not exist.
 *        `analyzeExamAttempt` throws at the lookup, before any LLM call. It
 *        exercises the FAILURE path — retries exhausted, dead letter recorded.
 *        That path had never once fired in production: 0 of 5,497 rows carried
 *        the "Dead-lettered" marker before the fix.
 *
 *   Deliberately NOT used: `guardian-report`. It always calls
 *   `sendWeeklyReportToParent`, and would additionally run LLM-backed report
 *   generation and early-warning checks. The invariant under test is the
 *   lifecycle, which any job exercises — so there is no reason to accept those
 *   side effects.
 *
 * SAFETY
 *   Refuses to run unless Redis is pointed at database 0 (the application's
 *   database). Rows are identified by an explicit, unique `jobId`.
 *
 * USAGE
 *   npx tsx scripts/verify-c10-in-production.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

const NON_TERMINAL = ["QUEUED", "ACTIVE", "RETRYING"] as const;

function check(label: string, got: unknown, want: unknown): boolean {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  (got ${JSON.stringify(got)} want ${JSON.stringify(want)})`}`,
  );
  return ok;
}

async function main() {
  const { Queue } = await import("bullmq");
  const { redis } = await import("../src/queue/redis");
  const { prisma } = await import("../src/lib/prisma");

  // Guard: this script writes to whatever database REDIS_URL selects. The
  // application uses database 0; anything else means the environment is not
  // what we think it is.
  const db = (redis.options as { db?: number }).db ?? 0;
  if (db !== 0) {
    throw new Error(
      `Redis database is ${db}, expected 0 (the application database). Aborting.`,
    );
  }
  if (redis.status !== "ready" && redis.status !== "connecting") {
    await redis.connect();
  }
  await redis.ping();
  console.log(`Redis: database ${db}, status ${redis.status}`);
  console.log("");

  const run = randomUUID().slice(0, 8);
  const successJobId = `verify-c10-ok-${run}`;
  const failJobId = `verify-c10-fail-${run}`;

  // Use the application's own queue factory so these jobs carry the same
  // `defaultJobOptions` (attempts: 3, exponential back-off) that real jobs get.
  // A bare `new Queue(...)` leaves `attempts` unset, and BullMQ then runs the
  // job exactly ONCE — the retry/resume path would go untested, which is
  // precisely the path this verification exists to prove.
  const { getQueue } = await import("../src/queue/runner");
  const genQueue = getQueue("assessment-generate");
  const impQueue = getQueue("improvement-analysis");

  console.log(`jobId uji: ${successJobId} / ${failJobId}`);
  console.log("");

  await genQueue.add(
    "assessment-generate",
    {
      // Unknown student + unknown topic: no material matches, so the processor
      // returns without doing any work.
      studentId: "00000000-0000-4000-8000-000000000000",
      topic: `__c10_verify_${run}__`,
      gradeLevel: "SMP_1",
      questionCount: 5,
    },
    { jobId: successJobId },
  );
  console.log(`[1] enqueued assessment-generate (harapan: COMPLETED, tanpa efek)`);

  await impQueue.add(
    "improvement-analysis",
    { attemptId: "00000000-0000-4000-8000-000000000000" },
    { jobId: failJobId },
  );
  console.log(`[2] enqueued improvement-analysis (harapan: FAILED + dead-letter)`);
  console.log("");

  // The production worker picks these up asynchronously. The failing job has an
  // exponential backoff (2s, 4s), so allow generous headroom.
  const deadline = Date.now() + 90_000;
  let rows: { jobId: string; status: string; error: string | null }[] = [];

  while (Date.now() < deadline) {
    rows = await prisma.agentLog.findMany({
      where: { jobId: { in: [successJobId, failJobId] } },
      select: { jobId: true, status: true, error: true },
    });
    const okDone = rows.some(
      (r) => r.jobId === successJobId && r.status === "COMPLETED",
    );
    const failDone = rows.some(
      (r) => r.jobId === failJobId && r.status === "FAILED",
    );
    if (okDone && failDone) break;
    await new Promise((r) => setTimeout(r, 2_000));
  }

  console.log("Baris AgentLog yang dihasilkan:");
  for (const r of rows) {
    console.log(`  ${r.jobId}  ${r.status}  ${r.error ?? "-"}`);
  }
  console.log("");

  let pass = 0;
  let total = 0;

  for (const [label, jobId, wantStatus] of [
    ["job sukses", successJobId, "COMPLETED"],
    ["job gagal", failJobId, "FAILED"],
  ] as const) {
    console.log(`=== ${label} (${jobId}) ===`);
    const mine = rows.filter((r) => r.jobId === jobId);
    total += wantStatus === "FAILED" ? 5 : 4;
    if (check("tepat 1 baris AgentLog", mine.length, 1)) pass++;
    if (check("status terminal", mine[0]?.status ?? null, wantStatus)) pass++;
    if (
      check(
        "0 baris non-terminal",
        mine.filter((r) =>
          (NON_TERMINAL as readonly string[]).includes(r.status),
        ).length,
        0,
      )
    )
      pass++;
    if (wantStatus === "FAILED") {
      if (
        check(
          "memuat penanda Dead-lettered",
          (mine[0]?.error ?? "").includes("Dead-lettered"),
          true,
        )
      )
        pass++;
      // The retry budget must have actually been spent. A bare `new Queue`
      // would leave `attempts` unset, BullMQ would run the job once, and this
      // assertion is what catches that.
      if (
        check(
          "retry benar-benar dihabiskan (3 percobaan)",
          (mine[0]?.error ?? "").includes("after 3 failed attempts"),
          true,
        )
      )
        pass++;
    } else {
      if (check("tanpa error", mine[0]?.error ?? null, null)) pass++;
    }
    console.log("");
  }

  console.log(`lulus: ${pass}/${total}`);

  await genQueue.close();
  await impQueue.close();
  await prisma.$disconnect();

  if (pass !== total) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
