import { NextFunction, Request, Response } from 'express';
import { categoriesService } from './categories.service';
import { sendSuccess } from '../../utils/response';

export const categoriesController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoriesService.create(req.body);
      sendSuccess(res, category, 'Category created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await categoriesService.list();
      sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoriesService.getById(req.params.id);
      sendSuccess(res, category, 'Category fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = await categoriesService.update(req.params.id, req.body);
      sendSuccess(res, category, 'Category updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await categoriesService.delete(req.params.id);
      sendSuccess(res, null, 'Category deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
