const { reviewsService } = require('./reviews.service');
const { sendSuccess } = require('../../utils/response');

const reviewsController = {
  async create(req, res, next) {
    try {
      const review = await reviewsService.create(
        req.user.userId,
        req.params.productId,
        req.body,
      );
      sendSuccess(res, review, 'Review created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await reviewsService.list(req.params.productId, page, limit);
      sendSuccess(res, result, 'Reviews fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const review = await reviewsService.update(req.params.id, req.user.userId, req.body);
      sendSuccess(res, review, 'Review updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      await reviewsService.delete(req.params.id, req.user.userId, req.user.role);
      sendSuccess(res, null, 'Review deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { reviewsController };
