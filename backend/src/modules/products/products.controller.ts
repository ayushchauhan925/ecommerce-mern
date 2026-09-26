import { NextFunction, Request, Response } from 'express';
import { productsService } from './products.service';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../middleware/error.middleware';

export const productsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.create(req.body);
      sendSuccess(res, product, 'Product created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        sort: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
      };
      const result = await productsService.list(query);
      sendSuccess(res, result, 'Products fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.getById(req.params.id);
      sendSuccess(res, product, 'Product fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await productsService.update(req.params.id, req.body);
      sendSuccess(res, product, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await productsService.delete(req.params.id);
      sendSuccess(res, null, 'Product deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400, 'NO_FILE_PROVIDED');
      }
      const product = await productsService.addImage(req.params.id, req.file.buffer);
      sendSuccess(res, product, 'Image uploaded successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async deleteImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await productsService.deleteImage(req.params.id, req.params.imageId);
      sendSuccess(res, null, 'Image deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};
