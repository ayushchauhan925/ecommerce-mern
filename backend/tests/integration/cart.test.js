const { randomUUID } = require('crypto');
const { prisma } = require('../../src/config/database');
const { addToCart, api, createProduct, createUser } = require('../helpers/factories');

describe('Cart', () => {
  it('requires authentication', async () => {
    await api().get('/api/cart').expect(401);
  });

  it('returns an empty cart for a new user', async () => {
    const { auth } = await createUser();

    const res = await api().get('/api/cart').set('Authorization', auth).expect(200);

    expect(res.body.data).toMatchObject({ items: [], totalItems: 0, totalAmount: 0 });
  });

  describe('POST /api/cart/items', () => {
    it('adds an item and computes totals', async () => {
      const { auth } = await createUser();
      const product = await createProduct({ price: 12.5, stock: 10 });

      const res = await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: product.id, quantity: 2 })
        .expect(201);

      expect(res.body.data.items).toEqual([
        expect.objectContaining({ productId: product.id, quantity: 2, price: 12.5, subtotal: 25 }),
      ]);
      expect(res.body.data).toMatchObject({ totalItems: 2, totalAmount: 25 });
    });

    it('merges quantity when the same product is added again', async () => {
      const { auth } = await createUser();
      const product = await createProduct({ stock: 10 });

      await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: product.id, quantity: 2 });
      const res = await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: product.id, quantity: 3 })
        .expect(201);

      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(5);
    });

    it('rejects a quantity above available stock', async () => {
      const { auth } = await createUser();
      const product = await createProduct({ stock: 3 });

      const res = await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: product.id, quantity: 4 })
        .expect(409);

      expect(res.body.errorCode).toBe('INSUFFICIENT_STOCK');
      expect(await prisma.cartItem.count()).toBe(0);
    });

    it('checks stock against the combined quantity, not just the new amount', async () => {
      const { user, auth } = await createUser();
      const product = await createProduct({ stock: 5 });
      await addToCart(user.id, product.id, 3);

      await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: product.id, quantity: 3 })
        .expect(409);

      const item = await prisma.cartItem.findFirstOrThrow();
      expect(item.quantity).toBe(3);
    });

    it('returns 404 for a product that does not exist', async () => {
      const { auth } = await createUser();

      const res = await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: randomUUID(), quantity: 1 })
        .expect(404);

      expect(res.body.errorCode).toBe('PRODUCT_NOT_FOUND');
    });

    it('returns 400 for an invalid body', async () => {
      const { auth } = await createUser();

      await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: 'abc', quantity: 1 })
        .expect(400);
      await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: randomUUID(), quantity: 0 })
        .expect(400);
    });
  });

  describe('PATCH /api/cart/items/:productId', () => {
    it('sets the quantity', async () => {
      const { user, auth } = await createUser();
      const product = await createProduct({ price: 4, stock: 10 });
      await addToCart(user.id, product.id, 1);

      const res = await api()
        .patch(`/api/cart/items/${product.id}`)
        .set('Authorization', auth)
        .send({ quantity: 6 })
        .expect(200);

      expect(res.body.data).toMatchObject({ totalItems: 6, totalAmount: 24 });
    });

    it('rejects a quantity above stock', async () => {
      const { user, auth } = await createUser();
      const product = await createProduct({ stock: 2 });
      await addToCart(user.id, product.id, 1);

      await api()
        .patch(`/api/cart/items/${product.id}`)
        .set('Authorization', auth)
        .send({ quantity: 3 })
        .expect(409);
    });

    it('returns 404 for an item that is not in the cart', async () => {
      const { auth } = await createUser();
      const product = await createProduct();

      const res = await api()
        .patch(`/api/cart/items/${product.id}`)
        .set('Authorization', auth)
        .send({ quantity: 1 })
        .expect(404);

      expect(res.body.errorCode).toBe('CART_ITEM_NOT_FOUND');
    });
  });

  describe('DELETE /api/cart/items/:productId', () => {
    it('removes just that item', async () => {
      const { user, auth } = await createUser();
      const keep = await createProduct();
      const remove = await createProduct();
      await addToCart(user.id, keep.id, 1);
      await addToCart(user.id, remove.id, 1);

      const res = await api()
        .delete(`/api/cart/items/${remove.id}`)
        .set('Authorization', auth)
        .expect(200);

      expect(res.body.data.items.map((i) => i.productId)).toEqual([keep.id]);
    });

    it('returns 404 for an item that is not in the cart', async () => {
      const { auth } = await createUser();

      await api()
        .delete(`/api/cart/items/${randomUUID()}`)
        .set('Authorization', auth)
        .expect(404);
    });
  });

  describe('DELETE /api/cart', () => {
    it('clears every item', async () => {
      const { user, auth } = await createUser();
      await addToCart(user.id, (await createProduct()).id, 1);
      await addToCart(user.id, (await createProduct()).id, 2);

      const res = await api().delete('/api/cart').set('Authorization', auth).expect(200);

      expect(res.body.data).toMatchObject({ items: [], totalAmount: 0 });
      expect(await prisma.cartItem.count()).toBe(0);
    });
  });

  it("never exposes or modifies another user's cart", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const product = await createProduct();
    await addToCart(alice.user.id, product.id, 1);

    const bobsCart = await api().get('/api/cart').set('Authorization', bob.auth).expect(200);
    expect(bobsCart.body.data.items).toEqual([]);

    await api().delete('/api/cart').set('Authorization', bob.auth).expect(200);
    expect(await prisma.cartItem.count()).toBe(1);
  });
});
