const { prisma } = require('../../config/database');
const { OrderStatus } = require('@prisma/client');
const { getSkip } = require('../../utils/pagination');

const orderInclude = {
  items: {
    include: {
      product: { select: { name: true } },
    },
  },
};

const ordersRepository = {
  findCartWithItems(userId) {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  },

  async decrementStockIfAvailable(tx, productId, quantity) {
    const result = await tx.product.updateMany({
      where: {
        id: productId,
        stock: { gte: quantity },
      },
      data: {
        stock: { decrement: quantity },
      },
    });
    return result.count;
  },

  async createOrderWithItems(userId, cartId, shippingAddress, items, totalAmount) {
    return prisma.$transaction(async (tx) => {
      for (const item of items) {
        const affectedRows = await this.decrementStockIfAvailable(tx, item.productId, item.quantity);
        if (affectedRows === 0) {
          throw new Error(`INSUFFICIENT_STOCK:${item.productId}`);
        }
      }

      const order = await tx.order.create({
        data: {
          userId,
          shippingAddress,
          totalAmount,
          status: OrderStatus.PENDING,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({ where: { cartId } });

      return order;
    });
  },

  findById(id) {
    return prisma.order.findUnique({ where: { id }, include: orderInclude });
  },

  async findManyByUser(userId, page, limit) {
    const skip = getSkip(page, limit);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId } }),
    ]);
    return { orders, total };
  },

  updateStatus(id, status) {
    return prisma.order.update({ where: { id }, data: { status } });
  },

  findUserById(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  },
};

module.exports = { ordersRepository };
