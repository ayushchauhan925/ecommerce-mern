const { randomUUID } = require('crypto');
const SwaggerParser = require('@apidevtools/swagger-parser');
const app = require('../../src/app');
const { OPENAPI_SPEC_PATH } = require('../../src/docs/swagger');
const { stripe } = require('../../src/config/stripe');
const { prisma } = require('../../src/config/database');
const {
  addToCart,
  api,
  createAdmin,
  createProduct,
  createUser,
  SHIPPING_ADDRESS,
} = require('../helpers/factories');
const { createContractChecker, listSpecOperations } = require('../helpers/openapi');

/**
 * These tests are what keep docs/openapi.yaml from drifting away from the
 * code. Add or change a route, a response field, a status code, or an auth
 * requirement without updating the spec, and something here fails.
 */

// ───────────────────────── Express route discovery ─────────────────────────

/** "/api" from the regexp Express 4 builds for app.use('/api', router). */
function mountPath(regexp) {
  if (regexp.fast_slash) return '';
  const match = regexp.source.match(/^\^\\\/(.*?)\\\/\?\(\?=\\\/\|\$\)$/);
  if (!match) throw new Error(`Cannot parse mount path from ${regexp}`);
  return `/${match[1].replace(/\\\//g, '/')}`;
}

/** Every route registered on the app, as "METHOD /path" in OpenAPI template form. */
function listExpressRoutes() {
  const routes = [];

  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        const path = layer.route.path === '/' ? prefix : prefix + layer.route.path;
        for (const method of Object.keys(layer.route.methods)) {
          routes.push(`${method.toUpperCase()} ${path}`);
        }
      } else if (layer.name === 'router' && layer.handle.stack) {
        walk(layer.handle.stack, prefix + mountPath(layer.regexp));
      }
    }
  };

  walk(app._router.stack, '');

  return routes
    .map((route) => route.replace(' /api', ' ').replace(/:(\w+)/g, '{$1}'))
    .map((route) => route.replace(/ (?!\/)/, ' /'))
    .filter((route) => !route.includes(' /docs')) // the docs UI itself
    .sort();
}

// ─────────────────────────────── Tests ───────────────────────────────

describe('docs/openapi.yaml', () => {
  it('is a valid OpenAPI 3.1 document', async () => {
    await expect(SwaggerParser.validate(OPENAPI_SPEC_PATH)).resolves.toBeDefined();
  });

  it('documents exactly the routes the app serves', () => {
    const served = listExpressRoutes();
    const documented = listSpecOperations()
      .map((op) => op.key)
      .sort();

    expect({
      servedButUndocumented: served.filter((r) => !documented.includes(r)),
      documentedButNotServed: documented.filter((r) => !served.includes(r)),
    }).toEqual({ servedButUndocumented: [], documentedButNotServed: [] });
  });
});

describe('documented auth requirements match real behaviour', () => {
  const cases = listSpecOperations().map(({ key, method, template, operation }) => ({
    key,
    method,
    url: `/api${template.replace(/\{[^}]+\}/g, randomUUID())}`,
    level: operation['x-required-role']
      ? 'admin'
      : operation.security?.length
        ? 'authenticated'
        : 'public',
  }));

  const send = (method, url, auth) => {
    let req = api()[method](url);
    if (auth) req = req.set('Authorization', auth);
    return ['post', 'patch', 'put'].includes(method) ? req.send({}) : req;
  };

  it.each(cases)('$key is $level', async ({ method, url, level }) => {
    const anonymous = await send(method, url);

    if (level === 'public') {
      expect(anonymous.status).not.toBe(401);
      return;
    }

    expect(anonymous.status).toBe(401);

    const customer = await createUser();
    const asCustomer = await send(method, url, customer.auth);

    if (level === 'admin') {
      expect(asCustomer.status).toBe(403);
      expect(asCustomer.body.errorCode).toBe('FORBIDDEN');
    } else {
      expect([401, 403]).not.toContain(asCustomer.status);
    }
  });
});

/**
 * Drives every documented operation through realistic success and error
 * paths, validating each real response against the spec (status code
 * documented + body matches schema). The final test asserts that nothing in
 * the spec went unexercised.
 */
describe('real responses match the documented contract', () => {
  let contract;
  let check;

  beforeAll(async () => {
    contract = await createContractChecker();
    check = contract.check;
  });

  it('Health', async () => {
    check(await api().get('/api/health'), 'GET /health');
  });

  it('Auth and Users', async () => {
    const credentials = { email: 'ada@example.com', password: 'Analytical-Engine-1843' };

    const registered = await api()
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', ...credentials });
    check(registered, 'POST /auth/register');
    check(
      await api()
        .post('/api/auth/register')
        .send({ name: 'Ada Lovelace', ...credentials }),
      'POST /auth/register', // 409
    );
    check(await api().post('/api/auth/register').send({ email: 'nope' }), 'POST /auth/register'); // 400

    const loggedIn = await api().post('/api/auth/login').send(credentials);
    check(loggedIn, 'POST /auth/login');
    check(
      await api()
        .post('/api/auth/login')
        .send({ ...credentials, password: 'wrong-password' }),
      'POST /auth/login', // 401
    );

    const { accessToken, refreshToken } = loggedIn.body.data.tokens;
    const auth = `Bearer ${accessToken}`;

    check(await api().post('/api/auth/refresh').send({ refreshToken }), 'POST /auth/refresh');
    check(
      await api().post('/api/auth/refresh').send({ refreshToken: 'garbage' }),
      'POST /auth/refresh', // 401
    );

    check(await api().get('/api/users/me').set('Authorization', auth), 'GET /users/me');
    check(await api().get('/api/users/me'), 'GET /users/me'); // 401
    check(
      await api().patch('/api/users/me').set('Authorization', auth).send({ name: 'Ada King' }),
      'PATCH /users/me',
    );

    const admin = await createAdmin();
    const userId = registered.body.data.user.id;
    check(await api().get('/api/users?limit=10').set('Authorization', admin.auth), 'GET /users');
    check(await api().get('/api/users').set('Authorization', auth), 'GET /users'); // 403
    check(
      await api().get(`/api/users/${userId}`).set('Authorization', admin.auth),
      'GET /users/{id}',
    );
    check(
      await api().get(`/api/users/${randomUUID()}`).set('Authorization', admin.auth),
      'GET /users/{id}', // 404
    );
    check(
      await api()
        .patch(`/api/users/${userId}/role`)
        .set('Authorization', admin.auth)
        .send({ role: 'ADMIN' }),
      'PATCH /users/{id}/role',
    );

    check(await api().post('/api/auth/logout').send({ refreshToken }), 'POST /auth/logout');
  });

  it('Categories and Products', async () => {
    const admin = await createAdmin();
    const asAdmin = { Authorization: admin.auth };

    const category = await api()
      .post('/api/categories')
      .set(asAdmin)
      .send({ name: 'Home Office', description: 'Desks, chairs, and lighting.' });
    check(category, 'POST /categories');
    check(
      await api().post('/api/categories').set(asAdmin).send({ name: 'Home Office' }),
      'POST /categories', // 409
    );
    const categoryId = category.body.data.id;

    check(await api().get('/api/categories'), 'GET /categories');
    check(await api().get(`/api/categories/${categoryId}`), 'GET /categories/{id}');
    check(await api().get(`/api/categories/${randomUUID()}`), 'GET /categories/{id}'); // 404
    check(
      await api()
        .patch(`/api/categories/${categoryId}`)
        .set(asAdmin)
        .send({ description: 'Everything for your desk setup.' }),
      'PATCH /categories/{id}',
    );

    const product = await api().post('/api/products').set(asAdmin).send({
      name: 'Brass Desk Lamp',
      description: 'Adjustable brass desk lamp with a warm LED bulb.',
      price: 49.99,
      stock: 25,
      categoryId,
    });
    check(product, 'POST /products');
    const productId = product.body.data.id;

    check(
      await api().get(
        '/api/products?search=lamp&category=home-office&minPrice=10&maxPrice=100&sort=price_asc',
      ),
      'GET /products',
    );
    check(await api().get('/api/products?limit=1000'), 'GET /products'); // 400
    check(await api().get(`/api/products/${productId}`), 'GET /products/{id}');
    check(
      await api().patch(`/api/products/${productId}`).set(asAdmin).send({ price: 44.99 }),
      'PATCH /products/{id}',
    );

    const uploaded = await api()
      .post(`/api/products/${productId}/images`)
      .set(asAdmin)
      .attach('image', Buffer.from('fake-jpeg-bytes'), {
        filename: 'lamp.jpg',
        contentType: 'image/jpeg',
      });
    check(uploaded, 'POST /products/{id}/images');
    check(
      await api().post(`/api/products/${productId}/images`).set(asAdmin),
      'POST /products/{id}/images', // 400 no file
    );
    const imageId = uploaded.body.data.images[0].id;
    check(
      await api().delete(`/api/products/${productId}/images/${imageId}`).set(asAdmin),
      'DELETE /products/{id}/images/{imageId}',
    );

    check(
      await api().delete(`/api/categories/${categoryId}`).set(asAdmin),
      'DELETE /categories/{id}', // 409 still has products
    );
    check(await api().delete(`/api/products/${productId}`).set(asAdmin), 'DELETE /products/{id}');
    check(await api().delete(`/api/categories/${categoryId}`).set(asAdmin), 'DELETE /categories/{id}');
  });

  it('Cart, Orders, Payments, and Reviews', async () => {
    const customer = await createUser({ name: 'Grace Hopper' });
    const admin = await createAdmin();
    const asCustomer = { Authorization: customer.auth };
    const lamp = await createProduct({ name: 'Brass Desk Lamp', price: 49.99, stock: 5 });
    const mat = await createProduct({ name: 'Felt Desk Mat', price: 24.5, stock: 5 });

    // Cart
    check(
      await api().post('/api/cart/items').set(asCustomer).send({ productId: lamp.id, quantity: 2 }),
      'POST /cart/items',
    );
    check(
      await api().post('/api/cart/items').set(asCustomer).send({ productId: lamp.id, quantity: 10 }),
      'POST /cart/items', // 409
    );
    check(
      await api().patch(`/api/cart/items/${lamp.id}`).set(asCustomer).send({ quantity: 1 }),
      'PATCH /cart/items/{productId}',
    );
    await api().post('/api/cart/items').set(asCustomer).send({ productId: mat.id, quantity: 1 });
    check(await api().get('/api/cart').set(asCustomer), 'GET /cart');
    check(
      await api().delete(`/api/cart/items/${mat.id}`).set(asCustomer),
      'DELETE /cart/items/{productId}',
    );
    check(
      await api().delete(`/api/cart/items/${mat.id}`).set(asCustomer),
      'DELETE /cart/items/{productId}', // 404
    );

    // Orders
    const order = await api()
      .post('/api/orders')
      .set(asCustomer)
      .send({ shippingAddress: SHIPPING_ADDRESS });
    check(order, 'POST /orders');
    const orderId = order.body.data.id;
    check(
      await api().post('/api/orders').set(asCustomer).send({ shippingAddress: SHIPPING_ADDRESS }),
      'POST /orders', // 400 empty cart
    );
    check(await api().get('/api/orders').set(asCustomer), 'GET /orders');
    check(await api().get(`/api/orders/${orderId}`).set(asCustomer), 'GET /orders/{id}');

    // Payments
    stripe.paymentIntents.create.mockResolvedValueOnce({
      id: 'pi_3Q8xYz2eZvKYlo2C1a2b3c4d',
      client_secret: 'pi_3Q8xYz2eZvKYlo2C1a2b3c4d_secret_Kq9L0mN1',
    });
    check(
      await api().post('/api/payments/create-intent').set(asCustomer).send({ orderId }),
      'POST /payments/create-intent',
    );

    const event = JSON.stringify({
      id: 'evt_3Q8xYz2eZvKYlo2C0x1y2z3a',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_3Q8xYz2eZvKYlo2C1a2b3c4d', object: 'payment_intent' } },
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: event,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    check(
      await api()
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(event),
      'POST /payments/webhook',
    );
    check(
      await api().post('/api/payments/webhook').set('Content-Type', 'application/json').send(event),
      'POST /payments/webhook', // 400 missing signature
    );
    check(
      await api().post('/api/payments/create-intent').set(asCustomer).send({ orderId }),
      'POST /payments/create-intent', // 409 now PAID
    );

    // Order lifecycle
    check(
      await api().patch(`/api/orders/${orderId}/cancel`).set(asCustomer),
      'PATCH /orders/{id}/cancel', // 409 already paid
    );
    check(
      await api()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', admin.auth)
        .send({ status: 'SHIPPED' }),
      'PATCH /orders/{id}/status',
    );
    check(
      await api()
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', admin.auth)
        .send({ status: 'PENDING' }),
      'PATCH /orders/{id}/status', // 409 invalid transition
    );

    await addToCart(customer.user.id, mat.id, 1);
    const pending = await api()
      .post('/api/orders')
      .set(asCustomer)
      .send({ shippingAddress: SHIPPING_ADDRESS });
    check(
      await api().patch(`/api/orders/${pending.body.data.id}/cancel`).set(asCustomer),
      'PATCH /orders/{id}/cancel',
    );

    // Reviews (the SHIPPED order makes the customer a verified purchaser)
    const review = await api()
      .post(`/api/products/${lamp.id}/reviews`)
      .set(asCustomer)
      .send({ rating: 5, comment: 'Warm light, solid build.' });
    check(review, 'POST /products/{productId}/reviews');
    check(
      await api().post(`/api/products/${lamp.id}/reviews`).set(asCustomer).send({ rating: 4 }),
      'POST /products/{productId}/reviews', // 409
    );
    check(
      await api().post(`/api/products/${mat.id}/reviews`).set(asCustomer).send({ rating: 4 }),
      'POST /products/{productId}/reviews', // 403 cancelled order doesn't count
    );
    check(
      await api().get(`/api/products/${lamp.id}/reviews`),
      'GET /products/{productId}/reviews',
    );
    const reviewId = review.body.data.id;
    check(
      await api().patch(`/api/reviews/${reviewId}`).set(asCustomer).send({ rating: 4 }),
      'PATCH /reviews/{id}',
    );
    check(
      await api().delete(`/api/reviews/${reviewId}`).set('Authorization', admin.auth),
      'DELETE /reviews/{id}',
    );

    await addToCart(customer.user.id, lamp.id, 1);
    check(await api().delete('/api/cart').set(asCustomer), 'DELETE /cart');
    expect(await prisma.cartItem.count()).toBe(0);
  });

  // Must stay last in this describe block.
  it('exercised every documented operation', () => {
    expect(contract.uncoveredOperations()).toEqual([]);
  });
});
