import Redis from 'ioredis';

type RedisGlobal = {
  redis: Redis | undefined;
  redisCleanupRegistered?: boolean;
};

const globalForRedis = globalThis as unknown as RedisGlobal;

const requiredVars = ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'] as const;

let instance: Redis | undefined;
let warnedUnconfigured = false;

export function isRedisConfigured(): boolean {
  return requiredVars.every((key) => Boolean(process.env[key]));
}

function createClient(): Redis {
  const client = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET'];
      if (targetErrors.some((code) => err.message.includes(code))) {
        return true;
      }
      return false;
    },
    lazyConnect: false,
    enableReadyCheck: true,
    showFriendlyErrorStack: process.env.NODE_ENV === 'development',
  });

  client.on('connect', () => {
    console.log('[Redis] Connected to Redis Cloud');
  });

  client.on('ready', () => {
    console.log('[Redis] Redis client ready');
  });

  client.on('error', (err) => {
    console.error('[Redis] Redis error:', err);
  });

  client.on('close', () => {
    console.warn('[Redis] Redis connection closed');
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting to Redis...');
  });

  if (!globalForRedis.redisCleanupRegistered) {
    process.on('SIGTERM', async () => {
      console.log('[Redis] SIGTERM received, closing Redis connection');
      try {
        await client.quit();
      } catch (error) {
        console.error('[Redis] Error closing connection on SIGTERM:', error);
      }
    });

    globalForRedis.redisCleanupRegistered = true;
  }

  return client;
}

/**
 * Returns the shared Redis client, creating it on first use.
 *
 * Redis is an optional hot cache. When REDIS_HOST, REDIS_PORT or REDIS_PASSWORD
 * is missing this returns null (and logs once) instead of throwing, so importing
 * this module never fails and callers can treat it as a cache miss.
 */
export function getRedisClient(): Redis | null {
  const existing = instance ?? globalForRedis.redis;
  if (existing) {
    instance = existing;
    return existing;
  }

  if (!isRedisConfigured()) {
    if (!warnedUnconfigured) {
      const missing = requiredVars.filter((key) => !process.env[key]);
      console.warn(
        `[Redis] Not configured (missing ${missing.join(', ')}); continuing without the hot cache.`,
      );
      warnedUnconfigured = true;
    }
    return null;
  }

  instance = createClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = instance;
  }

  return instance;
}
