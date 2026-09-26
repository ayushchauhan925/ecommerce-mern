const { redis } = require('../config/redis');
const { AppError } = require('./error.middleware');
const { logger } = require('../utils/logger');

function createRateLimiter(options) {
  const { windowSeconds, maxRequests, keyPrefix } = options;

  return async (req, _res, next) => {
    const identifier = req.ip ?? 'unknown';
    const key = `ratelimit:${keyPrefix}:${identifier}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        next(
          new AppError(
            'Too many requests. Please try again later.',
            429,
            'RATE_LIMIT_EXCEEDED',
          ),
        );
        return;
      }

      next();
    } catch (err) {
      logger.warn({ err }, 'Rate limiter failed, allowing request through');
      next();
    }
  };
}

const authRateLimiter = createRateLimiter({
  windowSeconds: 15 * 60,
  maxRequests: 10,
  keyPrefix: 'auth',
});

const paymentRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 10,
  keyPrefix: 'payment',
});

const globalRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 100,
  keyPrefix: 'global',
});

module.exports = { createRateLimiter, authRateLimiter, paymentRateLimiter, globalRateLimiter };
