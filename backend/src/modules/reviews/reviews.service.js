const { reviewsRepository } = require('./reviews.repository');
const { AppError } = require('../../middleware/error.middleware');

function toReviewResponse(review) {
  return {
    id: review.id,
    userId: review.userId,
    userName: review.user.name,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

const reviewsService = {
  async create(userId, productId, input) {
    const product = await reviewsRepository.findProductById(productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const purchased = await reviewsRepository.hasPurchased(userId, productId);
    if (!purchased) {
      throw new AppError(
        'You can only review products you have purchased',
        403,
        'PRODUCT_NOT_PURCHASED',
      );
    }

    // The DB's @@unique([userId, productId]) constraint (see schema.prisma /
    // `reviews_userId_productId_key` in MySQL) is the real source of truth
    // for "one review per product" — this check just lets us return a clean
    // 409 with a friendly message instead of a raw Prisma P2002 unique
    // constraint violation bubbling up as an unhandled 500.
    const existing = await reviewsRepository.findByUserAndProduct(userId, productId);
    if (existing) {
      throw new AppError('You have already reviewed this product', 409, 'REVIEW_ALREADY_EXISTS');
    }

    const review = await reviewsRepository.create({
      userId,
      productId,
      rating: input.rating,
      comment: input.comment,
    });

    return toReviewResponse(review);
  },

  async list(productId, page, limit) {
    const { reviews, total } = await reviewsRepository.findManyByProduct(productId, page, limit);
    return {
      reviews: reviews.map(toReviewResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async update(id, userId, input) {
    const review = await reviewsRepository.findById(id);
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }
    if (review.userId !== userId) {
      throw new AppError('You do not have permission to update this review', 403, 'FORBIDDEN');
    }

    const updated = await reviewsRepository.update(id, {
      rating: input.rating,
      comment: input.comment,
    });

    return toReviewResponse(updated);
  },

  async delete(id, userId, userRole) {
    const review = await reviewsRepository.findById(id);
    if (!review) {
      throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
    }
    if (review.userId !== userId && userRole !== 'ADMIN') {
      throw new AppError('You do not have permission to delete this review', 403, 'FORBIDDEN');
    }

    await reviewsRepository.delete(id);
  },
};

module.exports = { reviewsService };
