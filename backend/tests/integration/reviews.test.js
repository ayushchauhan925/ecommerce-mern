const { randomUUID } = require('crypto');
const { prisma } = require('../../src/config/database');
const { api, createAdmin, createOrder, createProduct, createUser } = require('../helpers/factories');

const postReview = (auth, productId, body = { rating: 5 }) =>
  api().post(`/api/products/${productId}/reviews`).set('Authorization', auth).send(body);

/** A customer who has a PAID order containing `product`. */
async function createVerifiedBuyer(product) {
  const buyer = await createUser();
  await createOrder(buyer.user.id, [{ product, quantity: 1 }], 'PAID');
  return buyer;
}

async function createReview(product) {
  const author = await createVerifiedBuyer(product);
  const res = await postReview(author.auth, product.id, { rating: 4, comment: 'Solid' }).expect(
    201,
  );
  return { author, reviewId: res.body.data.id };
}

describe('purchase-gated review creation', () => {
  it('rejects a review from someone who never ordered the product', async () => {
    const product = await createProduct();
    const { auth } = await createUser();

    const res = await postReview(auth, product.id).expect(403);

    expect(res.body.errorCode).toBe('PRODUCT_NOT_PURCHASED');
    expect(await prisma.review.count()).toBe(0);
  });

  it.each(['PENDING', 'CANCELLED'])(
    'rejects a review when the only order is %s (never actually paid)',
    async (status) => {
      const product = await createProduct();
      const { user, auth } = await createUser();
      await createOrder(user.id, [{ product, quantity: 1 }], status);

      await postReview(auth, product.id).expect(403);
    },
  );

  it("does not count someone else's purchase", async () => {
    const product = await createProduct();
    await createVerifiedBuyer(product);
    const { auth } = await createUser();

    await postReview(auth, product.id).expect(403);
  });

  it.each(['PAID', 'SHIPPED', 'DELIVERED'])(
    'accepts a review when the order is %s',
    async (status) => {
      const product = await createProduct();
      const { user, auth } = await createUser();
      await createOrder(user.id, [{ product, quantity: 1 }], status);

      const res = await postReview(auth, product.id, { rating: 5, comment: 'Great' }).expect(201);

      expect(res.body.data).toMatchObject({
        userId: user.id,
        productId: product.id,
        rating: 5,
        comment: 'Great',
        userName: 'Test User',
      });
    },
  );

  it('returns 404 for an unknown product', async () => {
    const { auth } = await createUser();
    await postReview(auth, randomUUID()).expect(404);
  });

  it('validates the rating', async () => {
    const product = await createProduct();
    const { auth } = await createVerifiedBuyer(product);

    await postReview(auth, product.id, { rating: 6 }).expect(400);
  });

  it('requires authentication', async () => {
    const product = await createProduct();
    await api().post(`/api/products/${product.id}/reviews`).send({ rating: 5 }).expect(401);
  });
});

describe('one review per product', () => {
  it('rejects a second review of the same product', async () => {
    const product = await createProduct();
    const buyer = await createVerifiedBuyer(product);
    await postReview(buyer.auth, product.id).expect(201);

    const res = await postReview(buyer.auth, product.id, { rating: 1 }).expect(409);

    expect(res.body.errorCode).toBe('REVIEW_ALREADY_EXISTS');
    expect(await prisma.review.count()).toBe(1);
  });

  it('still lets the same user review a different product', async () => {
    const a = await createProduct();
    const b = await createProduct();
    const buyer = await createUser();
    await createOrder(
      buyer.user.id,
      [
        { product: a, quantity: 1 },
        { product: b, quantity: 1 },
      ],
      'PAID',
    );

    await postReview(buyer.auth, a.id).expect(201);
    await postReview(buyer.auth, b.id).expect(201);
  });
});

describe('listing reviews', () => {
  it('is public and paginated', async () => {
    const product = await createProduct();
    await createReview(product);
    await createReview(product);

    const res = await api().get(`/api/products/${product.id}/reviews?limit=1`).expect(200);

    expect(res.body.data).toMatchObject({ total: 2, totalPages: 2, limit: 1 });
    expect(res.body.data.reviews).toHaveLength(1);
  });
});

describe('review ownership', () => {
  it('lets the author update their review', async () => {
    const product = await createProduct();
    const { author, reviewId } = await createReview(product);

    const res = await api()
      .patch(`/api/reviews/${reviewId}`)
      .set('Authorization', author.auth)
      .send({ rating: 2, comment: 'Broke after a week' })
      .expect(200);

    expect(res.body.data).toMatchObject({ rating: 2, comment: 'Broke after a week' });
  });

  it("forbids updating someone else's review", async () => {
    const product = await createProduct();
    const { reviewId } = await createReview(product);
    const other = await createVerifiedBuyer(product);

    const res = await api()
      .patch(`/api/reviews/${reviewId}`)
      .set('Authorization', other.auth)
      .send({ rating: 1 })
      .expect(403);

    expect(res.body.errorCode).toBe('FORBIDDEN');
    expect((await prisma.review.findUniqueOrThrow({ where: { id: reviewId } })).rating).toBe(4);
  });

  it('lets the author delete their review', async () => {
    const product = await createProduct();
    const { author, reviewId } = await createReview(product);

    await api().delete(`/api/reviews/${reviewId}`).set('Authorization', author.auth).expect(200);

    expect(await prisma.review.count()).toBe(0);
  });

  it("forbids deleting someone else's review", async () => {
    const product = await createProduct();
    const { reviewId } = await createReview(product);
    const other = await createUser();

    await api().delete(`/api/reviews/${reviewId}`).set('Authorization', other.auth).expect(403);

    expect(await prisma.review.count()).toBe(1);
  });

  it('returns 404 for an unknown review', async () => {
    const { auth } = await createUser();
    await api().delete(`/api/reviews/${randomUUID()}`).set('Authorization', auth).expect(404);
  });
});

describe('admin moderation', () => {
  it("lets an admin delete any customer's review", async () => {
    const product = await createProduct();
    const { reviewId } = await createReview(product);
    const admin = await createAdmin();

    await api().delete(`/api/reviews/${reviewId}`).set('Authorization', admin.auth).expect(200);

    expect(await prisma.review.count()).toBe(0);
  });

  it("does not let an admin edit a customer's words (moderation is removal only)", async () => {
    const product = await createProduct();
    const { reviewId } = await createReview(product);
    const admin = await createAdmin();

    await api()
      .patch(`/api/reviews/${reviewId}`)
      .set('Authorization', admin.auth)
      .send({ comment: 'Edited by admin' })
      .expect(403);
  });
});
