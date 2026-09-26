import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../../config/stripe';
import { env } from '../../config/env';
import { paymentsService } from './payments.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';

export const paymentsController = {
  async createIntent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.createIntent(req.user!.userId, req.body);
      sendSuccess(res, result, 'Payment intent created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      next(new AppError('Missing Stripe signature header', 400, 'MISSING_SIGNATURE'));
      return;
    }

    let event: Stripe.Event;

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
