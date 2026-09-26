import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/config/database';
import { emailQueue, orderQueue } from '../../src/jobs/queue';
import { ordersRepository } from '../../src/modules/orders/orders.repository';
import {
  addToCart,
  api,
  createProduct,
  createUser,
  SHIPPING_ADDRESS,
} from '../helpers/factories';

const placeOrder = (auth: string) =>
  api().post('/api/orders').set('Authorization', auth).send({ shippingAddress: SHIPPING_ADDRESS });

const stockOf = async (productId: string) =>
  (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock;

/** Snapshot of everything order creation is allowed to touch. */
async function orderSideEffects() {
  return {
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    cartItems: await prisma.cartItem.count(),
  };
}

describe('POST /api/orders', () => {
  it('creates the order, decrements stock, snapshots prices, and empties the cart', async () => {
    const { user, auth } = await createUser();
    const lamp = await createProduct({ price: 19.99, stock: 10 });
    const desk = await createProduct({ price: 250, stock: 2 });
    await addToCart(user.id, lamp.id, 3);
    await addToCart(user.id, desk.id, 1);

    const res = await placeOrder(auth).expect(201);

    expect(res.body.data).toMatchObject({
      userId: user.id,
      status: 'PENDING',
      totalAmount: 309.97, // 3 × 19.99 + 250
      shippingAddress: SHIPPING_ADDRESS,
    });
    expect(res.body.data.items).toHaveLength(2);
    expect(await stockOf(lamp.id)).toBe(7);
    expect(await stockOf(desk.id)).toBe(1);
    expect(await prisma.cartItem.count()).toBe(0);

    // A later price change must not rewrite what the customer was charged.
    await prisma.product.update({ where: { id: lamp.id }, data: { price: 99 } });
    const item = await prisma.orderItem.findFirstOrThrow({ where: { productId: lamp.id } });
    expect(Number(item.price)).toBe(19.99);
  });

  it('enqueues the confirmation email and post-order job (no worker required)', async () => {
    const { user, auth } = await createUser();
    const product = await createProduct();
    await addToCart(user.id, product.id, 1);

    const res = await placeOrder(auth).expect(201);

    expect(emailQueue.add).toHaveBeenCalledWith(
      'order-confirmation-email',
      expect.objectContaining({ type: 'order_confirmation', orderId: res.body.data.id }),
    );
    expect(orderQueue.add).toHaveBeenCalledWith('post-order-processing', {
      type: 'post_order_processing',
      orderId: res.body.data.id,
    });
  });

  it('rejects an empty cart', async () => {
    const { auth } = await createUser();

    const res = await placeOrder(auth).expect(400);

    expect(res.body.errorCode).toBe('CART_EMPTY');
    expect(await prisma.order.count()).toBe(0);
  });

  describe('insufficient stock', () => {
    it('rejects the order and leaves no partial state behind', async () => {
      const { user, auth } = await createUser();
      const product = await createProduct({ stock: 5 });
      await addToCart(user.id, product.id, 3);
      // Someone else bought most of the stock after this item was carted.
      await prisma.product.update({ where: { id: product.id }, data: { stock: 2 } });

      const res = await placeOrder(auth).expect(409);

      expect(res.body.errorCode).toBe('INSUFFICIENT_STOCK');
      expect(await stockOf(product.id)).toBe(2);
      expect(await orderSideEffects()).toEqual({ orders: 0, orderItems: 0, cartItems: 1 });
    });

    it('rolls back stock already reserved for other items in the same cart', async () => {
      const { user, auth } = await createUser();
      const plenty = await createProduct({ stock: 10 });
      const scarce = await createProduct({ stock: 1 });
      await addToCart(user.id, plenty.id, 4);
      await addToCart(user.id, scarce.id, 1);
      await prisma.product.update({ where: { id: scarce.id }, data: { stock: 0 } });

      await placeOrder(auth).expect(409);

      expect(await stockOf(plenty.id)).toBe(10);
      expect(await stockOf(scarce.id)).toBe(0);
      expect(await orderSideEffects()).toEqual({ orders: 0, orderItems: 0, cartItems: 2 });
    });
  });

  describe('invalid or nonexistent products', () => {
    it('refuses to put a nonexistent product in the cart in the first place', async () => {
      const { auth } = await createUser();

      await api()
        .post('/api/cart/items')
        .set('Authorization', auth)
        .send({ productId: randomUUID(), quantity: 1 })
        .expect(404);
      await placeOrder(auth).expect(400);
      expect(await prisma.order.count()).toBe(0);
    });

    it('rejects the order if the only carted product was deleted before checkout', async () => {
      const { user, auth } = await createUser();
      const product = await createProduct();
      await addToCart(user.id, product.id, 1);

      // cart_items.productId is ON DELETE CASCADE, so deleting the product
      // removes it from every cart; there's no way to end up ordering a
      // product that no longer exists.
      await prisma.product.delete({ where: { id: product.id } });

      const res = await placeOrder(auth).expect(400);

      expect(res.body.errorCode).toBe('CART_EMPTY');
      expect(await prisma.order.count()).toBe(0);
    });
  });

  /**
   * CONCURRENCY
   *
   * Supertest sends each request to the same in-process Express app, but
   * every order runs `prisma.$transaction(...)` on its OWN pooled MySQL
   * connection. While one request is awaiting the database, Node's event loop
   * services the other, so MySQL genuinely sees two open transactions at once.
   *
   * What prevents overselling is the shape of the stock update:
   *
   *   UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?
   *
   * InnoDB takes an exclusive row lock for the UPDATE and evaluates the WHERE
   * clause against the latest COMMITTED row (a "locking read"), not the
   * transaction's snapshot. The second transaction blocks on the lock until
   * the first commits, then re-checks `stock >= 1` against stock = 0, matches
   * zero rows, and the repository throws → the whole transaction rolls back.
   * A read-then-write ("SELECT stock; if ok UPDATE") would oversell, because
   * both transactions could read stock = 1 before either writes.
   */
  describe('concurrent orders for the same stock', () => {
    it('only one of two simultaneous orders gets the last unit', async () => {
      const product = await createProduct({ stock: 1, price: 50 });
      const buyers = [await createUser(), await createUser()];
      for (const { user } of buyers) await addToCart(user.id, product.id, 1);

      // Barrier: hold each transaction right before its stock UPDATE until
      // BOTH have reached that point. Without this, the first request could
      // finish before the second even starts, and the test would pass without
      // ever exercising a race. With it, both transactions are provably open
      // at the same time when they contend for the row.
      const realDecrement = ordersRepository.decrementStockIfAvailable.bind(ordersRepository);
      let arrived = 0;
      let releaseBarrier!: () => void;
      const barrier = new Promise<void>((resolve) => (releaseBarrier = resolve));
      const safetyTimeout = setTimeout(releaseBarrier, 5_000); // never hang the suite

      jest
        .spyOn(ordersRepository, 'decrementStockIfAvailable')
        .mockImplementation(async (tx, productId, quantity) => {
          arrived += 1;
          if (arrived === buyers.length) releaseBarrier();
          await barrier;
          return realDecrement(tx, productId, quantity);
        });

      const responses = await Promise.all(buyers.map(({ auth }) => placeOrder(auth)));
      clearTimeout(safetyTimeout);

      expect(arrived).toBe(2); // both really were inside a transaction concurrently
      expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);

      const loser = responses.find((r) => r.status === 409)!;
      expect(loser.body.errorCode).toBe('INSUFFICIENT_STOCK');

      expect(await stockOf(product.id)).toBe(0);
      // Winner's cart was cleared; the loser's is untouched so they can retry.
      expect(await orderSideEffects()).toEqual({ orders: 1, orderItems: 1, cartItems: 1 });
    });

    it('never sells more than exists under a burst of simultaneous orders', async () => {
      const product = await createProduct({ stock: 3 });
      const buyers = await Promise.all(Array.from({ length: 6 }, () => createUser()));
      for (const { user } of buyers) await addToCart(user.id, product.id, 1);

      const responses = await Promise.all(buyers.map(({ auth }) => placeOrder(auth)));
      const statuses = responses.map((r) => r.status);

      expect(statuses.filter((s) => s === 201)).toHaveLength(3);
      expect(statuses.filter((s) => s === 409)).toHaveLength(3);
      expect(await stockOf(product.id)).toBe(0);
      expect(await prisma.orderItem.count()).toBe(3);
    });
  });

  /**
   * ROLLBACK
   *
   * Order creation writes, in one transaction: stock decrements → order row →
   * order_items rows → cart clear. The tests below make a step fail AFTER
   * earlier writes have really happened (and prove they happened by reading
   * them back through the same transaction), then assert none of it was
   * committed.
   */
  describe('transaction rollback', () => {
    it('rolls back an earlier stock decrement when a later one fails', async () => {
      const { user, auth } = await createUser();
      const first = await createProduct({ stock: 5 });
      const second = await createProduct({ stock: 5 });
      await addToCart(user.id, first.id, 2);
      await addToCart(user.id, second.id, 2);

      const realDecrement = ordersRepository.decrementStockIfAvailable.bind(ordersRepository);
      let calls = 0;
      let decrementedFirst = '';
      let stockSeenInsideTx: number | undefined;

      // Let the first decrement run for real; make the second one fail.
      jest
        .spyOn(ordersRepository, 'decrementStockIfAvailable')
        .mockImplementation(async (tx, productId, quantity) => {
          calls += 1;
          if (calls === 1) {
            decrementedFirst = productId;
            return realDecrement(tx, productId, quantity);
          }
          stockSeenInsideTx = (
            await tx.product.findUniqueOrThrow({ where: { id: decrementedFirst } })
          ).stock;
          throw new Error('Simulated database failure mid-transaction');
        });

      const res = await placeOrder(auth).expect(500);

      expect(res.body.errorCode).toBe('INTERNAL_ERROR');
      expect(calls).toBe(2);
      expect(stockSeenInsideTx).toBe(3); // 5 − 2: the first decrement DID happen inside the tx…
      expect(await stockOf(first.id)).toBe(5); // …and was rolled back
      expect(await stockOf(second.id)).toBe(5);
      expect(await orderSideEffects()).toEqual({ orders: 0, orderItems: 0, cartItems: 2 });
    });

    it('rolls back the order, its items, and stock when the final step (cart clear) fails', async () => {
      const { user, auth } = await createUser();
      const product = await createProduct({ stock: 5 });
      await addToCart(user.id, product.id, 2);

      // Wrap the transaction client so `tx.cartItem.deleteMany` — the last
      // statement in createOrderWithItems — throws. By then the stock UPDATE
      // and the order + order_items INSERTs have all executed.
      let seenInsideTx: { orders: number; orderItems: number; stock: number } | undefined;
      const realTransaction = prisma.$transaction.bind(prisma) as (
        fn: (tx: Prisma.TransactionClient) => Promise<unknown>,
        options?: unknown,
      ) => Promise<unknown>;

      jest.spyOn(prisma, '$transaction').mockImplementation(((
        fn: (tx: Prisma.TransactionClient) => Promise<unknown>,
        options?: unknown,
      ) =>
        realTransaction(async (tx) => {
          const sabotaged = new Proxy(tx, {
            get(target, prop, receiver) {
              if (prop !== 'cartItem') return Reflect.get(target, prop, receiver);
              return {
                deleteMany: async () => {
                  seenInsideTx = {
                    orders: await tx.order.count(),
                    orderItems: await tx.orderItem.count(),
                    stock: (await tx.product.findUniqueOrThrow({ where: { id: product.id } }))
                      .stock,
                  };
                  throw new Error('Simulated failure clearing the cart');
                },
              };
            },
          });
          return fn(sabotaged);
        }, options)) as typeof prisma.$transaction);

      await placeOrder(auth).expect(500);

      expect(seenInsideTx).toEqual({ orders: 1, orderItems: 1, stock: 3 });
      jest.restoreAllMocks();

      expect(await stockOf(product.id)).toBe(5);
      expect(await orderSideEffects()).toEqual({ orders: 0, orderItems: 0, cartItems: 1 });
      expect(emailQueue.add).not.toHaveBeenCalled();
    });
  });
});

describe('order access control', () => {
  it("lets the owner and admins view an order, but not other customers", async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const admin = await createUser({ role: 'ADMIN' });
    const product = await createProduct();
    await addToCart(owner.user.id, product.id, 1);
    const orderId = (await placeOrder(owner.auth).expect(201)).body.data.id;

    await api().get(`/api/orders/${orderId}`).set('Authorization', owner.auth).expect(200);
    await api().get(`/api/orders/${orderId}`).set('Authorization', admin.auth).expect(200);
    await api().get(`/api/orders/${orderId}`).set('Authorization', stranger.auth).expect(403);
  });
});
