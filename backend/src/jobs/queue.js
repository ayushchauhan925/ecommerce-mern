const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

// BullMQ's Workers use blocking Redis commands internally and require a
// connection configured with `maxRetriesPerRequest: null` — otherwise
// ioredis will time out and error on the long-lived blocking calls BullMQ
// depends on. This is deliberately a SEPARATE connection from the one in
// `config/redis.ts` (used for caching and rate limiting), which wants the
// opposite behavior: fail fast rather than block. Queues and Workers below
// share this one connection, which is fine for a single-process app of this
// scope; a horizontally-scaled deployment would typically give each Worker
// its own connection instead.
const bullmqConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

bullmqConnection.on('error', (err) => {
  logger.error({ err }, 'BullMQ Redis connection error');
});

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

const emailQueue = new Queue('email', {
  connection: bullmqConnection,
  defaultJobOptions,
});

const orderQueue = new Queue('order', {
  connection: bullmqConnection,
  defaultJobOptions,
});

const cleanupQueue = new Queue('cleanup', {
  connection: bullmqConnection,
  defaultJobOptions,
});

module.exports = { bullmqConnection, emailQueue, orderQueue, cleanupQueue };
