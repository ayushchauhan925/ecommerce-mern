import { prisma } from '../../config/database';
import { Review } from '@prisma/client';

const reviewInclude = {
  user: { select: { id: true, name: true } },
};

export type ReviewWithUser = Review & { user: { id: string; name: string } };

export const reviewsRepository = {
  findProductById(productId: string) {
    return prisma.product.findUnique({ where: { id: productId } });
  },

  /**
   * "Purchased" means the user has at least one OrderItem for this product
   * on an Order that has actually been paid for (PAID, SHIPPED, or
   * DELIVERED) — a PENDING order (never paid) or a CANCELLED one doesn't
   * count. This is checked server-side against real Order/OrderItem rows;
   * nothing here trusts anything the client sends.
   */
  async hasPurchased(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
        },
      },
      select: { id: true },
    });
    return item !== null;
  },

  findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    return prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  },

  create(data: {
    userId: string;
    productId: string;
    rating: number;
    comment?: string;
  }): Promise<ReviewWithUser> {
    return prisma.review.create({ data, include: reviewInclude }) as Promise<ReviewWithUser>;
  },

  findById(id: string): Promise<Review | null> {
    return prisma.review.findUnique({ where: { id } });
  },

  async findManyByProduct(
    productId: string,
    page: number,
    limit: number,
  ): Promise<{ reviews: ReviewWithUser[]; total: number }> {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { productId } }),
    ]);
    return { reviews: reviews as ReviewWithUser[], total };
  },

  update(
    id: string,
    data: { rating?: number; comment?: string },
  ): Promise<ReviewWithUser> {
    return prisma.review.update({
      where: { id },
      data,
      include: reviewInclude,
    }) as Promise<ReviewWithUser>;
  },

  delete(id: string): Promise<Review> {
    return prisma.review.delete({ where: { id } });
  },
};
