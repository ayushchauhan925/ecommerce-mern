const { prisma } = require('../../config/database');

const reviewInclude = {
  user: { select: { id: true, name: true } },
};

const reviewsRepository = {
  findProductById(productId) {
    return prisma.product.findUnique({ where: { id: productId } });
  },

  /**
   * "Purchased" means the user has at least one OrderItem for this product
   * on an Order that has actually been paid for (PAID, SHIPPED, or
   * DELIVERED) — a PENDING order (never paid) or a CANCELLED one doesn't
   * count. This is checked server-side against real Order/OrderItem rows;
   * nothing here trusts anything the client sends.
   */
  async hasPurchased(userId, productId) {
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

  findByUserAndProduct(userId, productId) {
    return prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  },

  create(data) {
    return prisma.review.create({ data, include: reviewInclude });
  },

  findById(id) {
    return prisma.review.findUnique({ where: { id } });
  },

  async findManyByProduct(productId, page, limit) {
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
    return { reviews, total };
  },

  update(id, data) {
    return prisma.review.update({
      where: { id },
      data,
      include: reviewInclude,
    });
  },

  delete(id) {
    return prisma.review.delete({ where: { id } });
  },
};

module.exports = { reviewsRepository };
