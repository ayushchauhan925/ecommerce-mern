import { randomUUID } from 'crypto';
import { stripe } from '../../src/config/stripe';
import { prisma } from '../../src/config/database';
import { emailQueue } from '../../src/jobs/queue';
import { api, createOrder, createProduct, createUser } from '../helpers/factories';

// src/config/stripe is mocked in tests/setup/integration.ts: the SDK is real,
// but paymentIntents.create is a jest.fn that never touches the network.
const createIntentMock = stripe.paymentIntents.create as unknown as jest.Mock;

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

function fakeIntent(id = `pi_test_${randomUUID().slice(0, 8)}`) {
  return { id, object: 'payment_intent', client_secret: `${id}_secret_abc123` };
}

async function createPendingOrder(price = 24.99, quantity = 2) {
  const customer = await createUser();
  const product = await createProduct({ price });
  const order = await createOrder(customer.user.id, [{ product, quantity }]);
  return { customer, order };
}

async function createPaymentFor(orderId: string, intentId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  return prisma.payment.create({
    data: { orderId, stripePaymentIntentId: intentId, amount: order.totalAmount },
  });
}

function stripeEvent(type: string, intentId: string) {
  return {
    id: `evt_${randomUUID().slice(0, 8)}`,
    object: 'event',
    type,
    data: { object: { id: intentId, object: 'payment_intent' } },
  };
}

/**
 * Sends a webhook exactly as Stripe would: raw JSON body plus a
 * `Stripe-Signature` header that is a real HMAC-SHA256 of the payload,
 * generated with the Stripe SDK's own test helper.
 */
function sendWebhook(event: object, { secret = WEBHOOK_SECRET, body }: { secret?: string; body?: string } = {}) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });

  return api()
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('Stripe-Signature', signature)
    .send(body ?? payload);
}

describe('POST /api/payments/create-intent', () => {
  it('creates a Stripe PaymentIntent with the order total in cents', async () => {
    const { customer, order } = await createPendingOrder(24.99, 2);
    createIntentMock.mockResolvedValueOnce(fakeIntent('pi_test_123'));

    const res = await api()
      .post('/api/payments/create-intent')
      .set('Authorization', customer.auth)
      .send({ orderId: order.id })
      .expect(201);

    expect(createIntentMock).toHaveBeenCalledTimes(1);
    expect(createIntentMock).toHaveBeenCalledWith({
      amount: 4998,
      currency: 'usd',
      metadata: { orderId: order.id, userId: customer.user.id },
    });
    expect(res.body.data).toEqual({
      clientSecret: 'pi_test_123_secret_abc123',
      paymentId: 'pi_test_123',
      amount: 49.98,
      currency: 'usd',
    });

    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(payment).toMatchObject({ stripePaymentIntentId: 'pi_test_123', status: 'PENDING' });
  });

  it('converts to cents without floating-point drift', async () => {
    // 19.99 * 100 === 1998.9999999999998 in JS; must still charge 1999.
    const { customer, order } = await createPendingOrder(19.99, 1);
    createIntentMock.mockResolvedValueOnce(fakeIntent());

    await api()
      .post('/api/payments/create-intent')
      .set('Authorization', customer.auth)
      .send({ orderId: order.id })
      .expect(201);

    expect(createIntentMock.mock.calls[0][0].amount).toBe(1999);
  });

  it('on retry, points the existing Payment row at the new PaymentIntent', async () => {
    const { customer, order } = await createPendingOrder();
    const previous = await createPaymentFor(order.id, 'pi_test_old');
    await prisma.payment.update({ where: { id: previous.id }, data: { status: 'FAILED' } });
    createIntentMock.mockResolvedValueOnce(fakeIntent('pi_test_new'));

    await api()
      .post('/api/payments/create-intent')
      .set('Authorization', customer.auth)
      .send({ orderId: order.id })
      .expect(201);

    const payments = await prisma.payment.findMany();
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ stripePaymentIntentId: 'pi_test_new', status: 'PENDING' });
  });

  it("refuses to charge for someone else's order, without calling Stripe", async () => {
    const { order } = await createPendingOrder();
    const stranger = await createUser();

    await api()
      .post('/api/payments/create-intent')
      .set('Authorization', stranger.auth)
      .send({ orderId: order.id })
      .expect(403);

    expect(createIntentMock).not.toHaveBeenCalled();
  });

  it('refuses an order that is no longer PENDING, without calling Stripe', async () => {
    const { customer, order } = await createPendingOrder();
    await prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } });

    const res = await api()
      .post('/api/payments/create-intent')
      .set('Authorization', customer.auth)
      .send({ orderId: order.id })
      .expect(409);

    expect(res.body.errorCode).toBe('INVALID_ORDER_STATUS');
    expect(createIntentMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/payments/webhook — signature verification', () => {
  it('accepts an event with a valid signature', async () => {
    const res = await sendWebhook(stripeEvent('customer.created', 'pi_unused')).expect(200);

    expect(res.body).toEqual({ received: true });
  });

  it('rejects an event signed with the wrong secret', async () => {
    const { order } = await createPendingOrder();
    await createPaymentFor(order.id, 'pi_test_forged');

    const res = await sendWebhook(stripeEvent('payment_intent.succeeded', 'pi_test_forged'), {
      secret: 'whsec_attacker_secret',
    }).expect(400);

    expect(res.body.errorCode).toBe('INVALID_WEBHOOK_SIGNATURE');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      'PENDING',
    );
  });

  it('rejects a payload that was modified after signing', async () => {
    const signedEvent = stripeEvent('payment_intent.payment_failed', 'pi_test_1');
    const tampered = JSON.stringify(stripeEvent('payment_intent.succeeded', 'pi_test_1'));

    await sendWebhook(signedEvent, { body: tampered }).expect(400);
  });

  it('rejects a request with no signature header', async () => {
    const res = await api()
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(stripeEvent('payment_intent.succeeded', 'pi_test_1')))
      .expect(400);

    expect(res.body.errorCode).toBe('MISSING_SIGNATURE');
  });
});

describe('POST /api/payments/webhook — event handling', () => {
  it('payment_intent.succeeded marks the payment SUCCEEDED and the order PAID', async () => {
    const { customer, order } = await createPendingOrder();
    await createPaymentFor(order.id, 'pi_test_ok');

    await sendWebhook(stripeEvent('payment_intent.succeeded', 'pi_test_ok')).expect(200);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(payment.status).toBe('SUCCEEDED');
    expect(updatedOrder.status).toBe('PAID');
    expect(emailQueue.add).toHaveBeenCalledWith(
      'payment-confirmation-email',
      expect.objectContaining({
        type: 'payment_confirmation',
        to: customer.user.email,
        orderId: order.id,
      }),
    );
  });

  it('is idempotent when Stripe redelivers the same succeeded event', async () => {
    const { order } = await createPendingOrder();
    await createPaymentFor(order.id, 'pi_test_dup');
    const event = stripeEvent('payment_intent.succeeded', 'pi_test_dup');

    await sendWebhook(event).expect(200);
    await sendWebhook(event).expect(200);

    expect(emailQueue.add).toHaveBeenCalledTimes(1);
  });

  it('payment_intent.payment_failed marks the payment FAILED and leaves the order PENDING', async () => {
    const { order } = await createPendingOrder();
    await createPaymentFor(order.id, 'pi_test_declined');

    const res = await sendWebhook(
      stripeEvent('payment_intent.payment_failed', 'pi_test_declined'),
    ).expect(200);

    expect(res.body).toEqual({ received: true });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(payment.status).toBe('FAILED');
    // Still PENDING so the customer can retry payment on the same order.
    expect(updatedOrder.status).toBe('PENDING');
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('acknowledges events for PaymentIntents it does not know about without crashing', async () => {
    await sendWebhook(stripeEvent('payment_intent.succeeded', 'pi_unknown')).expect(200);
    await sendWebhook(stripeEvent('payment_intent.payment_failed', 'pi_unknown')).expect(200);
  });
});
