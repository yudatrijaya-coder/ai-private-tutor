import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedis(): Redis {
  const instance = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    // BullMQ requires `maxRetriesPerRequest: null` so blocking commands can wait
    // out a reconnect instead of failing fast.
    maxRetriesPerRequest: null,
    // Ledger C-09: `enableOfflineQueue: false` was the root of the Redis error
    // storm (`Stream isn't writeable and enableOfflineQueue options is false`,
    // 45 errors on 2026-09-11, 110 on 2026-09-05). With the offline queue
    // disabled, any command issued during the milliseconds Redis is
    // reconnecting throws immediately; with ten workers each holding a
    // connection, a single Redis blip became a ten-process crash and an OOM
    // kill on the build host. The default (true) queues the command until the
    // connection is back, which is what BullMQ expects.
    enableOfflineQueue: true,
    lazyConnect: true,
    retryStrategy(times: number) {
      const delay = Math.min(1000 * 2 ** (times - 1), 30_000);
      return delay;
    },
  });

  instance.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[queue/redis] Redis connection error:", err.message);
    }
  });

  return instance;
}

export const redis = (globalForRedis.redis ??= createRedis());

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
