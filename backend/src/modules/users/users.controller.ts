import { NextFunction, Response } from 'express';
import { usersService } from './users.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const usersController = {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await usersService.getProfile(req.user!.userId);
      sendSuccess(res, profile, 'Profile fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await usersService.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = req.query as unknown as { page: number; limit: number };
      const result = await usersService.listUsers(page, limit);
      sendSuccess(res, result, 'Users fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getUserById(req.params.id);
      sendSuccess(res, user, 'User fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async updateUserRole(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateUserRole(req.params.id, req.body.role);
      sendSuccess(res, user, 'User role updated successfully');
    } catch (err) {
      next(err);
    }
  },
};