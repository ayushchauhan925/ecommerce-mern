const { redis } = require('../config/redis');
const { logger } = require('./logger');

const DEFAULT_TTL_SECONDS = 300;

async function getCached(key) {
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.warn({ err, key }, 'Redis GET failed, falling back to source');
    return null;
  }
}

async function setCached(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'Redis SET failed, continuing without cache');
  }
}

async function invalidateByPattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn({ err, pattern }, 'Redis cache invalidation failed');
  }
}

module.exports = { getCached, setCached, invalidateByPattern };
