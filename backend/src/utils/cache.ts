import { redis } from '../config/redis';
import { logger } from './logger';

const DEFAULT_TTL_SECONDS = 300;

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch (err) {
    logger.warn({ err, key }, 'Redis GET failed, falling back to source');
    return null;
  }
}

export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'Redis SET failed, continuing without cache');
  }
}

export async function invalidateByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn({ err, pattern }, 'Redis cache invalidation failed');
  }
}
