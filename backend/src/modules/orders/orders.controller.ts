import { NextFunction, Response } from 'express';
import { ordersService } from './orders.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const ordersController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.createFromCart(req.user!.userId, req.body);
      sendSuccess(res, order, 'Order created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await ordersService.listForUser(req.user!.userId, page, limit);
      sendSuccess(res, result, 'Orders fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.getById(
        req.params.id,
        req.user!.userId,
        req.user!.role,
      );
      sendSuccess(res, order, 'Order fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.cancelOrder(req.params.id, req.user!.userId);
      sendSuccess(res, order, 'Order cancelled successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.updateStatus(req.params.id, req.body.status);
      sendSuccess(res, order, 'Order status updated successfully');
    } catch (err) {
      next(err);
    }
  },
};
