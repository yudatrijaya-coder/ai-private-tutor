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
      // --- lifecycle: mark ACTIVE ---
      await prisma.agentLog.create({
        data: {
          agentType: queueNameToAgentType(queueName),
          jobId: String(job.id),
          action: queueName,
          status: "ACTIVE" as never,
          input: toJson(job.data),
        },
      });

      try {
        await processor(job);

        // --- lifecycle: mark COMPLETED ---
        await prisma.agentLog.create({
          data: {
            agentType: queueNameToAgentType(queueName),
            jobId: String(job.id),
            action: queueName,
            status: "COMPLETED" as never,
            input: toJson(job.data),
            output: toJson(job.returnvalue),
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        // --- lifecycle: log failure (may still retry) ---
        await prisma.agentLog.create({
          data: {
            agentType: queueNameToAgentType(queueName),
            jobId: String(job.id),
            action: queueName,
            status: "RETRYING" as never,
            error: errorMessage,
            input: toJson(job.data),
          },
        });

        // If past retry limit, write DLQ record and stop.
        const dead = await shouldDeadLetter(job);
        if (dead) {
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
