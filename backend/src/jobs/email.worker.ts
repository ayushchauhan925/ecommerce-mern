import { Worker, Job } from 'bullmq';
import { bullmqConnection, EmailJobData } from './queue';
import { logger } from '../utils/logger';

export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { data } = job;

    // Log-only stub: no real SMTP/provider integration yet. Swapping this
    // for a real provider (SES, SendGrid, Resend, etc.) later only requires
    // changing this function's body — producers and the queue/job contract
    // stay exactly the same.
    switch (data.type) {
      case 'welcome':
        logger.info(
          { to: data.to, subject: 'Welcome!', template: 'welcome', name: data.name },
          '📧 [EMAIL STUB] Sent welcome email',
        );
        break;

      case 'order_confirmation':
        logger.info(
          {
            to: data.to,
            subject: `Order Confirmation - ${data.orderId}`,
            template: 'order_confirmation',
            orderId: data.orderId,
            totalAmount: data.totalAmount,
          },
          '📧 [EMAIL STUB] Sent order confirmation email',
        );
        break;

      case 'payment_confirmation':
        logger.info(
          {
            to: data.to,
            subject: `Payment Received - Order ${data.orderId}`,
            template: 'payment_confirmation',
            orderId: data.orderId,
            amount: data.amount,
          },
          '📧 [EMAIL STUB] Sent payment confirmation email',
        );
        break;

      case 'password_reset':
        logger.info(
          { to: data.to, subject: 'Password Reset Request', template: 'password_reset' },
          '📧 [EMAIL STUB] Sent password reset email',
        );
        break;
    }
  },
  { connection: bullmqConnection },
);

emailWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id, type: job.data.type }, 'Email job completed');
});

emailWorker.on('failed', (job, err) => {
  const attempts = job?.attemptsMade ?? 0;
  const maxAttempts = job?.opts.attempts ?? 1;

  if (job && attempts >= maxAttempts) {
    logger.error(
      { jobId: job.id, type: job.data.type, attempts, err },
      '❌ Email job failed permanently after all retries exhausted',
    );
  } else {
    logger.warn({ jobId: job?.id, attempt: attempts, err }, 'Email job failed, will retry');
  }
});
