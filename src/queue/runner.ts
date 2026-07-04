import { Queue, type QueueOptions } from "bullmq";
import { redis } from "./redis";
import { QUEUES, type QueueName, type JobPayload } from "./definitions";
import type { JobProcessor } from "./worker";

/* ------------------------------------------------------------------ */
/*  Queue registry — lazily initialised queues                         */
/* ------------------------------------------------------------------ */

/**
 * Returns a shared BullMQ Queue instance for the given name.
 * Queues are cached so the same name always returns the same instance.
 */
const queueCache = new Map<QueueName, Queue>();

export function getQueue(name: QueueName, opts?: QueueOptions): Queue {
  let q = queueCache.get(name);
  if (!q) {
    q = new Queue(name, {
      // BullMQ v5 has a bundled ioredis peer; runtime-safe cast.
      connection: redis as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { age: 3600 * 24 * 3 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
      ...opts,
    });
    queueCache.set(name, q);
  }
  return q;
}

/** Helper to enqueue a typed job. */
export async function enqueue<T extends JobPayload>(
  payload: T,
): Promise<string | undefined> {
  const q = getQueue(payload.queue.name as QueueName);
  const job = await q.add(
    payload.queue.name,
    payload.data as unknown as Record<string, unknown>,
  );
  return job.id ?? undefined;
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

export interface QueueInitResult {
  ok: boolean;
  queues: { name: string; idle: boolean }[];
  error?: string;
}

/**
 * Initialise all queue workers.
 *
 * Call this once during app bootstrap (e.g. in `layout.tsx` or a
 * dedicated `instrumentation.ts` hook).  It gracefully skips when
 * Redis is unavailable so development doesn't break.
 *
 * ```ts
 * // app/layout.tsx or instrumentation.ts
 * if (typeof globalThis !== "undefined") {
 *   const { initQueues } = await import("@/queue/runner");
 *   initQueues();
 * }
 * ```
 */
export async function initQueues(
  processors?: Partial<Record<QueueName, JobProcessor>>,
): Promise<QueueInitResult> {
  const { createWorker } = await import("./worker");

  // Verify Redis connectivity before wiring up workers.
  try {
    if (redis.status !== "ready" && redis.status !== "connecting") {
      await redis.connect();
    }
    await redis.ping();
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Redis unavailable";
    console.warn("[queue/runner] Redis unavailable — queues are DISABLED:", msg);
    return { ok: false, queues: [], error: msg };
  }

  const results: { name: string; idle: boolean }[] = [];

  for (const def of Object.values(QUEUES)) {
    const name = def.name as QueueName;
    const processor = processors?.[name];

    if (processor) {
      createWorker(name, processor, { concurrency: def.concurrency });
    }

    results.push({ name, idle: true });
  }

  console.info(`[queue/runner] ${results.length} queue(s) initialised`);
  return { ok: true, queues: results };
}

/**
 * Gracefully close all queues and the Redis connection during shutdown.
 */
export async function shutdownQueues(): Promise<void> {
  for (const [name, q] of queueCache) {
    await q.close();
    queueCache.delete(name);
  }

  if (redis.status === "ready") {
    await redis.quit();
  }
}
