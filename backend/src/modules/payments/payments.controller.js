const { stripe } = require('../../config/stripe');
const { env } = require('../../config/env');
const { paymentsService } = require('./payments.service');
const { sendSuccess } = require('../../utils/response');
const { AppError } = require('../../middleware/error.middleware');
const { logger } = require('../../utils/logger');

const paymentsController = {
  async createIntent(req, res, next) {
    try {
      const result = await paymentsService.createIntent(req.user.userId, req.body);
      sendSuccess(res, result, 'Payment intent created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async webhook(req, res, next) {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      next(new AppError('Missing Stripe signature header', 400, 'MISSING_SIGNATURE'));
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.warn({ err }, 'Stripe webhook signature verification failed');
      next(new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE'));
      return;
    }

    logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook received');

    try {
      await paymentsService.handleWebhookEvent(event);
      logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook processed successfully');
      // Always respond 200 quickly once the event is verified and processed,
      // so Stripe doesn't retry unnecessarily.
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ eventType: event.type, eventId: event.id, err }, 'Stripe webhook processing failed');
      next(err);
    }
  },
};

module.exports = { paymentsController };
