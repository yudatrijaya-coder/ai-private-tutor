import { NextResponse } from "next/server";
import { redis } from "@/queue/redis";
import { QUEUES } from "@/queue/definitions";
import { getLocalQueueStatus } from "@/queue/local";

/* ------------------------------------------------------------------ */
/*  GET /api/queues — queue monitoring (BullMQ + in-memory fallback)   */
/* ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";

export async function GET() {
  let redisOk = false;

  try {
    const pong = await redis.ping();
    redisOk = pong === "PONG";
  } catch {
    redisOk = false;
  }

  if (redisOk) {
    // Query each BullMQ queue in parallel.
    const queues: {
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed?: number;
    }[] = [];

    const entries = await Promise.allSettled(
      Object.values(QUEUES).map(async (def: { name: string; concurrency: number }) => {
        const { Queue } = await import("bullmq");
        const q = new Queue(def.name, { connection: redis as any });
        try {
          const counts = await q.getJobCounts("waiting", "active", "completed", "failed", "delayed");
          return {
            name: def.name,
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
          };
        } finally {
          await q.close();
        }
      }),
    );

    for (const entry of entries) {
      if (entry.status === "fulfilled") {
        queues.push(entry.value);
      }
    }

    return NextResponse.json({
      status: "connected",
      mode: "redis",
      queueCount: queues.length,
      queues,
    });
  }

  // ── Redis unavailable — use in-memory fallback ──
  const localQueues = getLocalQueueStatus();
  const allDefs = Object.values(QUEUES).map((def: { name: string }) => {
    const local = localQueues.find((q) => q.name === def.name);
    return {
      name: def.name,
      waiting: local?.waiting ?? 0,
      active: local?.active ?? 0,
      completed: local?.completed ?? 0,
      failed: local?.failed ?? 0,
    };
  });

  // Also add any local-only queues not in QUEUES defs
  for (const lq of localQueues) {
    if (!allDefs.find((d) => d.name === lq.name)) {
      allDefs.push(lq);
    }
  }

  return NextResponse.json({
    status: "disconnected",
    mode: "local",
    message: "Redis unavailable — using in-memory queue fallback",
    queues: allDefs,
  });
}
