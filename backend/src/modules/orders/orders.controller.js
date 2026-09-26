const { ordersService } = require('./orders.service');
const { sendSuccess } = require('../../utils/response');

const ordersController = {
  async create(req, res, next) {
    try {
      const order = await ordersService.createFromCart(req.user.userId, req.body);
      sendSuccess(res, order, 'Order created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await ordersService.listForUser(req.user.userId, page, limit);
      sendSuccess(res, result, 'Orders fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const order = await ordersService.getById(
        req.params.id,
        req.user.userId,
        req.user.role,
      );
      sendSuccess(res, order, 'Order fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async cancel(req, res, next) {
    try {
      const order = await ordersService.cancelOrder(req.params.id, req.user.userId);
      sendSuccess(res, order, 'Order cancelled successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const order = await ordersService.updateStatus(req.params.id, req.body.status);
      sendSuccess(res, order, 'Order status updated successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { ordersController };
