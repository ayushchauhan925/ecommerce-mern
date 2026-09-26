import { NextFunction, Response } from 'express';
import { cartService } from './cart.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const cartController = {
  async getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await cartService.getCart(req.user!.userId);
      sendSuccess(res, cart, 'Cart fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async addItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await cartService.addItem(req.user!.userId, req.body);
      sendSuccess(res, cart, 'Item added to cart', 201);
    } catch (err) {
      next(err);
    }
  },

  async updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await cartService.updateItem(
        req.user!.userId,
        req.params.productId,
        req.body.quantity,
      );
      sendSuccess(res, cart, 'Cart item updated');
    } catch (err) {
      next(err);
    }
  },

  async removeItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await cartService.removeItem(req.user!.userId, req.params.productId);
      sendSuccess(res, cart, 'Item removed from cart');
    } catch (err) {
      next(err);
    }
  },

  async clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await cartService.clearCart(req.user!.userId);
      sendSuccess(res, cart, 'Cart cleared');
    } catch (err) {
      next(err);
    }
  },
};
