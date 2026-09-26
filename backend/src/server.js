const app = require('./app');
const { env } = require('./config/env');
const { logger } = require('./utils/logger');
const { emailWorker } = require('./jobs/email.worker');
const { orderWorker } = require('./jobs/order.worker');
const { cleanupWorker, scheduleCleanupJob } = require('./jobs/cleanup.worker');

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on ${env.API_BASE_URL} (${env.NODE_ENV})`);
});

// Workers are already running as soon as the modules above are imported
// (the Worker constructor starts consuming immediately). This just
// registers the one-time repeatable cleanup schedule.
scheduleCleanupJob().catch((err) => {
  logger.error({ err }, 'Failed to schedule cleanup job');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection');
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  Promise.allSettled([emailWorker.close(), orderWorker.close(), cleanupWorker.close()]).finally(
    () => {
      server.close(() => process.exit(0));
    },
  );
});
