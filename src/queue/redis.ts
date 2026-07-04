import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedis(): Redis {
  const instance = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
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
