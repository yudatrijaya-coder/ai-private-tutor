import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { MAX_RETRIES } from "./definitions";

/**
 * Check whether the attempt currently in flight is the job's last one.
 *
 * Pure predicate — it deliberately performs no database writes. It used to
 * write to `AgentLog` itself, which had two consequences:
 *
 *  - it filtered on `jobId` + `status: "RETRYING"`, but BullMQ recycles small
 *    integer job ids, so a dead-letter for job "3" also clobbered the
 *    `RETRYING` row of an unrelated earlier job "3";
 *  - the row it had just written could never match that filter (the worker
 *    wrote `RETRYING` *after* calling it), so no row was ever marked `FAILED`
 *    and **no dead letter was ever recorded** — 0 rows carrying the
 *    "Dead-lettered" marker in production, which is what `getDeadLetteredJobs`
 *    searches for.
 *
 * Closing the row is the worker's job now: it owns the row and updates it in
 * place, so the dead letter is recorded exactly once, on the right row.
 *
 * OFF-BY-ONE, verified against BullMQ at runtime: `job.attemptsMade` counts
 * attempts that have *already* failed, so while the processor is running the
 * current attempt is not yet included — it reads 0, 1, 2 across the three
 * attempts of a 3-attempt job, and only becomes 3 on the `failed` event that
 * fires after the catch block returns. Comparing `attemptsMade >= attempts`
 * therefore never fires, the row stays `RETRYING` forever, and the retry
 * budget is spent with nothing recorded. Hence the `+ 1`.
 */
export function shouldDeadLetter<T>(job: Job<T, unknown, string>): boolean {
  return job.attemptsMade + 1 >= (job.opts.attempts ?? MAX_RETRIES);
}

/**
 * Retrieve dead-lettered jobs from AgentLog.
 */
export async function getDeadLetteredJobs(limit = 50, offset = 0) {
  return prisma.agentLog.findMany({
    where: {
      status: "FAILED" as never,
      error: { contains: "Dead-lettered" },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Re-enqueue a dead-lettered job.
 */
export async function retryDeadLetteredJob(
  queue: import("bullmq").Queue,
  logId: string,
): Promise<string | null> {
  const log = await prisma.agentLog.findUnique({ where: { id: logId } });
  if (!log || !log.input) return null;

  const existingMeta = (log.metadata as Record<string, unknown> | null) ?? {};
  await prisma.agentLog.update({
    where: { id: logId },
    data: {
      status: "QUEUED" as never,
      error: null,
      output: null as never,
      metadata: JSON.parse(JSON.stringify({ ...existingMeta, retriedAt: new Date().toISOString() })),
    },
  });

  const newJob = await queue.add(log.action, log.input, {
    attempts: MAX_RETRIES,
    backoff: { type: "exponential", delay: 2000 },
  });

  return newJob.id ?? null;
}
