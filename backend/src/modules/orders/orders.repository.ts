import { prisma } from '../../config/database';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { getSkip } from '../../utils/pagination';

const orderInclude = {
  items: {
    include: {
      product: { select: { name: true } },
    },
  },
};

export type OrderWithItems = Order & {
  items: {
    id: string;
    productId: string;
    quantity: number;
    price: Prisma.Decimal;
    product: { name: string };
  }[];
};

export const ordersRepository = {
  findCartWithItems(userId: string) {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  },

  async decrementStockIfAvailable(
    tx: Prisma.TransactionClient,
    productId: string,
    quantity: number,
  ): Promise<number> {
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

  async createOrderWithItems(
    userId: string,
    cartId: string,
    shippingAddress: string,
    items: { productId: string; quantity: number; price: number }[],
    totalAmount: number,
  ): Promise<OrderWithItems> {
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

      return order as OrderWithItems;
    });
  },

  findById(id: string): Promise<OrderWithItems | null> {
    return prisma.order.findUnique({ where: { id }, include: orderInclude }) as Promise<OrderWithItems | null>;
  },

  async findManyByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ orders: OrderWithItems[]; total: number }> {
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
    return { orders: orders as OrderWithItems[], total };
  },

  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return prisma.order.update({ where: { id }, data: { status } });
  },

  findUserById(userId: string): Promise<{ id: string; name: string; email: string } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
  },
};
