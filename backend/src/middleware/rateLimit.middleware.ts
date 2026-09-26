import { NextFunction, Request, Response } from 'express';
import { redis } from '../config/redis';
import { AppError } from './error.middleware';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowSeconds, maxRequests, keyPrefix } = options;

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
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

export const authRateLimiter = createRateLimiter({
  windowSeconds: 15 * 60,
  maxRequests: 10,
  keyPrefix: 'auth',
});

export const paymentRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 10,
  keyPrefix: 'payment',
});

export const globalRateLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 100,
  keyPrefix: 'global',
});
