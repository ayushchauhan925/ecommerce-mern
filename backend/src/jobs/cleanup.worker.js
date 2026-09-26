const { Worker } = require('bullmq');
const { bullmqConnection, cleanupQueue } = require('./queue');
const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

const CLEANUP_JOB_NAME = 'expired-refresh-token-cleanup';

const cleanupWorker = new Worker(
  'cleanup',
  async (job) => {
    if (job.name !== CLEANUP_JOB_NAME) return;

    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    logger.info({ deletedCount: result.count }, '🧹 Expired refresh token cleanup complete');
  },
  { connection: bullmqConnection },
);

cleanupWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, '❌ Cleanup job failed');
});

/**
 * Schedules the repeatable expired-refresh-token cleanup job.
 *
 * How BullMQ repeatable jobs work: instead of using an external cron
 * scheduler, you call `queue.upsertJobScheduler(schedulerId, repeatOpts, jobTemplate)`
 * (BullMQ v5+ moved repeat scheduling off `queue.add()` and into this
 * dedicated "Job Scheduler" API — passing `repeat` directly to `.add()` is
 * no longer supported in the version installed here). You give the
 * scheduler a stable ID and a repeat config (`{ every: ms }` for a fixed
 * interval, or `{ pattern: cronExpression }` for cron syntax). BullMQ then
 * automatically enqueues a new job instance on that schedule, indefinitely —
 * the schedule lives in Redis, not in application memory, so no
 * `setInterval` or long-running timer is needed in the Node process.
 *
 * Idempotency: `upsertJobScheduler` is literally an upsert keyed on
 * `jobSchedulerId` — calling this on every server startup is safe. It will
 * update the existing scheduler in place (e.g. if you change the interval)
 * rather than creating a duplicate, so restarting the server never produces
 * multiple overlapping hourly cleanup runs.
 */
async function scheduleCleanupJob() {
  await cleanupQueue.upsertJobScheduler(
    CLEANUP_JOB_NAME,
    { every: 60 * 60 * 1000 }, // every hour
    { name: CLEANUP_JOB_NAME },
  );
  logger.info('Scheduled repeatable job: expired refresh token cleanup (every 1h)');
}

module.exports = { cleanupWorker, scheduleCleanupJob };
