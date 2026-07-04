import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { MAX_RETRIES, type QueueName, queueNameToAgentType } from "./definitions";

/** Serialise arbitrary data to Prisma-compatible Json value. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

/**
 * Check whether a job has exhausted its retry quota.
 * If so, write a final FAILED entry to AgentLog.
 */
export async function shouldDeadLetter<T>(job: Job<T, unknown, string>): Promise<boolean> {
  const attemptsMade = job.attemptsMade;
  if (attemptsMade < MAX_RETRIES) return false;

  await prisma.agentLog.updateMany({
    where: { jobId: String(job.id), status: "RETRYING" as never },
    data: { status: "FAILED" as never, error: `Exceeded ${MAX_RETRIES} retries` },
  });

  await prisma.agentLog.create({
    data: {
      agentType: queueNameToAgentType(job.queueName as QueueName),
      jobId: String(job.id),
      action: job.queueName,
      status: "FAILED" as never,
      error: `Dead-lettered after ${MAX_RETRIES} failed attempts`,
      input: toJson(job.data),
      metadata: toJson({ attemptsMade, failedReason: job.failedReason }),
    },
  });

  return true;
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
