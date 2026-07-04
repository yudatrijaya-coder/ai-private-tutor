import { NextResponse } from "next/server";
import { redis } from "@/queue/redis";
import { QUEUES } from "@/queue/definitions";

/* ------------------------------------------------------------------ */
/*  GET /api/queues — queue monitoring                                 */
/* ------------------------------------------------------------------ */

export async function GET() {
  const queues: {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed?: number;
  }[] = [];

  let redisOk = false;

  try {
    // Quick connectivity check
    const pong = await redis.ping();
    redisOk = pong === "PONG";
  } catch {
    redisOk = false;
  }

  if (!redisOk) {
    // Return empty status — the status field tells clients queues are down.
    return NextResponse.json({
      status: "disconnected",
      message: "Redis is not available. Queues are disabled.",
      queues: Object.values(QUEUES).map((def) => ({
        name: def.name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      })),
    });
  }

  // Query each queue in parallel.
  const entries = await Promise.allSettled(
    Object.values(QUEUES).map(async (def) => {
      const { Queue } = await import("bullmq");
      const q = new Queue(def.name, { connection: redis as any });
      try {
        const counts = await q.getJobCounts(
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed",
        );
        return {
          name: def.name,
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
          delayed: counts.delayed ?? 0,
        };
      } finally {
        // Avoid dangling connections — close immediately after reading.
        await q.close();
      }
    }),
  );

  for (const entry of entries) {
    if (entry.status === "fulfilled") {
      queues.push(entry.value);
    } else {
      // If a queue object doesn't exist yet in Redis, still report it as 0.
      const name = entry.reason?.message?.match(/'([^']+)'/) ?? [null, "unknown"];
      queues.push({
        name: name[1],
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      });
    }
  }

  return NextResponse.json({
    status: "connected",
    queueCount: queues.length,
    queues,
  });
}
