import { Worker, Job } from 'bullmq';
import { bullmqConnection, OrderJobData } from './queue';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export const orderWorker = new Worker<OrderJobData>(
  'order',
  async (job: Job<OrderJobData>) => {
    const { orderId } = job.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      // Order was deleted (or never existed) by the time this ran — nothing to do.
      logger.warn({ orderId }, 'Post-order processing job skipped: order not found');
      return;
    }

    // Log-only stub for real post-order work (e.g. notifying a warehouse /
    // fulfillment system, pushing a sales-analytics event). Kept as a
    // logged stub for the same reason as the email queue: this phase's
    // scope is the queue/worker infrastructure, not building out fake
    // external integrations.
    logger.info(
      {
        orderId: order.id,
        itemCount: order.items.length,
        totalAmount: Number(order.totalAmount),
      },
      '📦 [ORDER PROCESSING STUB] Post-order processing complete (would notify fulfillment/analytics systems)',
    );
  },
  { connection: bullmqConnection },
);

orderWorker.on('failed', (job, err) => {
  const attempts = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts.attempts ?? 1;

  if (job && attempts >= maxAttempts) {
    logger.error(
      { jobId: job.id, orderId: job.data.orderId, attempts, err },
      '❌ Order processing job failed permanently after all retries exhausted',
    );
  } else {
    logger.warn({ jobId: job?.id, attempt: attempts, err }, 'Order job failed, will retry');
  }
});
