import { NextFunction, Request, Response } from 'express';
import { reviewsService } from './reviews.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const reviewsController = {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewsService.create(
        req.user!.userId,
        req.params.productId,
        req.body,
      );
      sendSuccess(res, review, 'Review created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await reviewsService.list(req.params.productId, page, limit);
      sendSuccess(res, result, 'Reviews fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewsService.update(req.params.id, req.user!.userId, req.body);
      sendSuccess(res, review, 'Review updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewsService.delete(req.params.id, req.user!.userId, req.user!.role);
      sendSuccess(res, null, 'Review deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
