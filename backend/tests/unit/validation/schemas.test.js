const { randomUUID } = require('crypto');
const { loginSchema, registerSchema } = require('../../../src/modules/auth/auth.validation');
const {
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} = require('../../../src/modules/products/products.validation');
const { addCartItemSchema } = require('../../../src/modules/cart/cart.validation');
const {
  createOrderSchema,
  updateOrderStatusSchema,
} = require('../../../src/modules/orders/orders.validation');
const { createReviewSchema } = require('../../../src/modules/reviews/reviews.validation');
const { createIntentSchema } = require('../../../src/modules/payments/payments.validation');

/**
 * Schemas are validated in the same { body, query, params } envelope the
 * validate() middleware builds from the request.
 */

describe('auth validation', () => {
  it('accepts a valid registration and normalizes the email', () => {
    const result = registerSchema.parse({
      body: { name: '  Ada Lovelace ', email: '  Ada@Example.COM ', password: 'longenough' },
    });

    expect(result.body).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'longenough',
    });
  });

  it.each([
    ['a short password', { name: 'Ada', email: 'ada@example.com', password: 'short' }],
    ['an invalid email', { name: 'Ada', email: 'not-an-email', password: 'longenough' }],
    ['a one-character name', { name: 'A', email: 'ada@example.com', password: 'longenough' }],
    // bcrypt silently ignores bytes past 72, so longer passwords are refused
    ['a password over 72 chars', { name: 'Ada', email: 'ada@example.com', password: 'x'.repeat(73) }],
  ])('rejects %s', (_label, body) => {
    expect(registerSchema.safeParse({ body }).success).toBe(false);
  });

  it('login requires a non-empty password', () => {
    expect(loginSchema.safeParse({ body: { email: 'ada@example.com', password: '' } }).success).toBe(
      false,
    );
  });
});

describe('products validation', () => {
  const validProduct = { name: 'Desk Lamp', price: '19.99', stock: '5', categoryId: randomUUID() };

  it('accepts a valid product and coerces numeric strings (multipart/form bodies)', () => {
    const result = createProductSchema.parse({ body: validProduct });

    expect(result.body.price).toBe(19.99);
    expect(result.body.stock).toBe(5);
  });

  it.each([
    ['zero price', { price: 0 }],
    ['negative stock', { stock: -1 }],
    ['fractional stock', { stock: 1.5 }],
    ['non-uuid categoryId', { categoryId: 'electronics' }],
  ])('rejects %s', (_label, override) => {
    expect(createProductSchema.safeParse({ body: { ...validProduct, ...override } }).success).toBe(
      false,
    );
  });

  it('applies list defaults when the query string is empty', () => {
    expect(productQuerySchema.parse({ query: {} }).query).toEqual({
      page: 1,
      limit: 20,
      sort: 'newest',
    });
  });

  it('rejects a page size over 100 and an unknown sort', () => {
    expect(productQuerySchema.safeParse({ query: { limit: '101' } }).success).toBe(false);
    expect(productQuerySchema.safeParse({ query: { sort: 'popular' } }).success).toBe(false);
  });

  it('allows a partial update but still validates the id param', () => {
    expect(
      updateProductSchema.safeParse({ params: { id: randomUUID() }, body: { price: 5 } }).success,
    ).toBe(true);
    expect(updateProductSchema.safeParse({ params: { id: '42' }, body: {} }).success).toBe(false);
  });
});

describe('cart validation', () => {
  it('requires quantity >= 1', () => {
    const productId = randomUUID();
    expect(addCartItemSchema.safeParse({ body: { productId, quantity: 1 } }).success).toBe(true);
    expect(addCartItemSchema.safeParse({ body: { productId, quantity: 0 } }).success).toBe(false);
  });
});

describe('orders validation', () => {
  it('accepts a reasonable shipping address', () => {
    expect(
      createOrderSchema.safeParse({ body: { shippingAddress: '221B Baker Street, London' } })
        .success,
    ).toBe(true);
  });

  it('rejects a too-short shipping address', () => {
    expect(createOrderSchema.safeParse({ body: { shippingAddress: 'Home' } }).success).toBe(false);
  });

  it('rejects an unknown order status', () => {
    expect(
      updateOrderStatusSchema.safeParse({ params: { id: randomUUID() }, body: { status: 'LOST' } })
        .success,
    ).toBe(false);
  });
});

describe('reviews validation', () => {
  const params = { productId: randomUUID() };

  it.each([1, 5])('accepts rating %i', (rating) => {
    expect(createReviewSchema.safeParse({ params, body: { rating } }).success).toBe(true);
  });

  it.each([0, 6, 4.5])('rejects rating %s', (rating) => {
    expect(createReviewSchema.safeParse({ params, body: { rating } }).success).toBe(false);
  });

  it('rejects a comment over 1000 characters', () => {
    expect(
      createReviewSchema.safeParse({ params, body: { rating: 5, comment: 'x'.repeat(1001) } })
        .success,
    ).toBe(false);
  });
});

describe('payments validation', () => {
  it('requires a uuid orderId', () => {
    expect(createIntentSchema.safeParse({ body: { orderId: randomUUID() } }).success).toBe(true);
    expect(createIntentSchema.safeParse({ body: { orderId: 'order-1' } }).success).toBe(false);
  });
});
