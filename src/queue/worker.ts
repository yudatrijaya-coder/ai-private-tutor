import { Worker, type Job, type WorkerOptions } from "bullmq";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { redis } from "./redis";
import {
  type QueueName,
  queueNameToAgentType,
  MAX_RETRIES,
  defaultConcurrency,
} from "./definitions";
import { shouldDeadLetter } from "./dlq";

export type JobProcessor<T = unknown> = (
  job: Job<T, unknown, string>,
) => Promise<void>;

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

/**
 * Create a BullMQ Worker with built-in:
 *  - AgentLog lifecycle (QUEUED, ACTIVE, COMPLETED, FAILED)
 *  - Retry policy (exponential back-off)
 *  - Dead-letter queue integration (auto-DLQ after MAX_RETRIES)
 */
export function createWorker<T>(
  queueName: QueueName,
  processor: JobProcessor<T>,
  options?: {
    concurrency?: number;
    attempts?: number;
    backoffDelay?: number;
  },
): Worker {
  const concurrency = options?.concurrency ?? defaultConcurrency(queueName);
  const attempts = options?.attempts ?? MAX_RETRIES;
  const backoffDelay = options?.backoffDelay ?? 2_000;

  const workerOpts: WorkerOptions = {
    connection: redis as any,
    concurrency,
  };

  const worker = new Worker<T>(
    queueName,
    async (job) => {
      const jobId = String(job.id);
      const agentType = queueNameToAgentType(queueName);

      // --- lifecycle: ONE row per JOB, resumed on retry ---
      //
      // Ledger C-10: this used to call `agentLog.create` for every transition
      // (ACTIVE, then COMPLETED/RETRYING) and never update the row it opened.
      // Every attempt therefore leaked a permanently-ACTIVE row — 2,703 of them
      // accumulated in production, each one looking like a job that had been
      // running since July. A retry must *resume* the row the previous attempt
      // left behind, so look for a row still in a transient state first.
      //
      // Filtering on the transient statuses is what makes this safe when
      // BullMQ recycles a job id: a previous job's row is already terminal and
      // will not match, so the recycled id opens a fresh row.
      const openRow = await prisma.agentLog.findFirst({
        where: {
          jobId,
          status: { in: ["QUEUED", "ACTIVE", "RETRYING"] as never[] },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });

      const logId =
        openRow?.id ??
        (
          await prisma.agentLog.create({
            data: {
              agentType,
              jobId,
              action: queueName,
              status: "ACTIVE" as never,
              input: toJson(job.data),
            },
            select: { id: true },
          })
        ).id;

      if (openRow) {
        await prisma.agentLog.update({
          where: { id: logId },
          data: { status: "ACTIVE" as never },
        });
      }

      try {
        await processor(job);

        // --- lifecycle: mark COMPLETED ---
        await prisma.agentLog.update({
          where: { id: logId },
          data: {
            status: "COMPLETED" as never,
            output: toJson(job.returnvalue),
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const maxAttempts = job.opts.attempts ?? MAX_RETRIES;

        // If this is the last attempt, close the row as FAILED and stop.
        const dead = shouldDeadLetter(job);

        // --- lifecycle: log failure (may still retry) ---
        await prisma.agentLog.update({
          where: { id: logId },
          data: {
            status: (dead ? "FAILED" : "RETRYING") as never,
            // `getDeadLetteredJobs` finds dead letters by this marker, so the
            // final failure must carry it.
            error: dead
              ? `Dead-lettered after ${maxAttempts} failed attempts`
              : errorMessage,
            metadata: dead
              ? toJson({
                  attemptsMade: job.attemptsMade,
                  failedReason: job.failedReason,
                })
              : undefined,
          },
        });

        if (dead) {
          // Do not re-throw: BullMQ would schedule another attempt for a job we
          // have already declared dead.
          return;
        }

        // Re-throw so BullMQ applies exponential back-off and retry.
        throw err;
      }
    },
    workerOpts,
  );

  // Set worker-level default job options
  // (BullMQ Worker doesn't accept defaultJobOptions in its constructor options;
  //  they are set per-job or via queue defaults.)
  worker.on("error", (err) => {
    console.error(`[worker/${queueName}] unhandled error:`, err.message);
  });

  return worker;
}
