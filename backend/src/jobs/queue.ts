import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// BullMQ's Workers use blocking Redis commands internally and require a
// connection configured with `maxRetriesPerRequest: null` — otherwise
// ioredis will time out and error on the long-lived blocking calls BullMQ
// depends on. This is deliberately a SEPARATE connection from the one in
// `config/redis.ts` (used for caching and rate limiting), which wants the
// opposite behavior: fail fast rather than block. Queues and Workers below
// share this one connection, which is fine for a single-process app of this
// scope; a horizontally-scaled deployment would typically give each Worker
// its own connection instead.
export const bullmqConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

bullmqConnection.on('error', (err) => {
  logger.error({ err }, 'BullMQ Redis connection error');
});

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export type EmailJobData =
  | { type: 'welcome'; to: string; name: string }
  | { type: 'order_confirmation'; to: string; name: string; orderId: string; totalAmount: number }
  | { type: 'payment_confirmation'; to: string; name: string; orderId: string; amount: number }
  | { type: 'password_reset'; to: string; name: string; resetToken: string };

export interface OrderJobData {
  type: 'post_order_processing';
  orderId: string;
}

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: bullmqConnection,
  defaultJobOptions,
});

export const orderQueue = new Queue<OrderJobData>('order', {
  connection: bullmqConnection,
  defaultJobOptions,
});

export const cleanupQueue = new Queue('cleanup', {
  connection: bullmqConnection,
  defaultJobOptions,
});
