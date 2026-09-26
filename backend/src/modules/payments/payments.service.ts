import { stripe } from '../../config/stripe';
import { paymentsRepository } from './payments.repository';
import { AppError } from '../../middleware/error.middleware';
import { CreateIntentInput, CreateIntentResponse } from './payments.types';
import Stripe from 'stripe';
import { emailQueue } from '../../jobs/queue';

export const paymentsService = {
  async createIntent(userId: string, input: CreateIntentInput): Promise<CreateIntentResponse> {
    const order = await paymentsRepository.findOrderById(input.orderId);
    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }
    if (order.userId !== userId) {
      throw new AppError('You do not have permission to pay for this order', 403, 'FORBIDDEN');
    }
    if (order.status !== 'PENDING') {
      throw new AppError(
        `Cannot create a payment for an order with status ${order.status}`,
        409,
        'INVALID_ORDER_STATUS',
      );
    }

    const existingPayment = await paymentsRepository.findPaymentByOrderId(order.id);
    if (existingPayment && existingPayment.status === 'SUCCEEDED') {
      throw new AppError('This order has already been paid', 409, 'ORDER_ALREADY_PAID');
    }

    const amountInCents = Math.round(Number(order.totalAmount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: { orderId: order.id, userId },
    });

    if (existingPayment) {
      // A prior PENDING/FAILED attempt exists for this order; this is a retry.
      // We just created a BRAND NEW Stripe PaymentIntent above, so the Payment
      // row must be updated to track this new intent's ID — otherwise the
      // eventual webhook for the new intent won't match any Payment record,
      // and the order would never be marked PAID despite a successful charge.
      await paymentsRepository.updatePaymentForRetry(
        existingPayment.id,
        paymentIntent.id,
      );
    } else {
      await paymentsRepository.createPayment({
        orderId: order.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: Number(order.totalAmount),
        currency: 'usd',
      });
    }

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentId: paymentIntent.id,
      amount: Number(order.totalAmount),
      currency: 'usd',
    };
  },

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await paymentsRepository.findPaymentByIntentId(intent.id);
        if (!payment) return;
        if (payment.status === 'SUCCEEDED') return;

        await paymentsRepository.updatePaymentStatus(payment.id, 'SUCCEEDED');
        await paymentsRepository.updateOrderStatus(payment.orderId, 'PAID');

        const order = await paymentsRepository.findOrderById(payment.orderId);
        if (order) {
          const user = await paymentsRepository.findUserById(order.userId);
          if (user) {
            await emailQueue.add('payment-confirmation-email', {
              type: 'payment_confirmation',
              to: user.email,
              name: user.name,
              orderId: order.id,
              amount: Number(payment.amount),
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await paymentsRepository.findPaymentByIntentId(intent.id);
        if (!payment) return;
        if (payment.status === 'FAILED') return;

        await paymentsRepository.updatePaymentStatus(payment.id, 'FAILED');
        break;
      }

      default:
        break;
    }
  },
};
