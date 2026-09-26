const { productsService } = require('./products.service');
const { sendSuccess } = require('../../utils/response');
const { AppError } = require('../../middleware/error.middleware');

const productsController = {
  async create(req, res, next) {
    try {
      const product = await productsService.create(req.body);
      sendSuccess(res, product, 'Product created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const query = req.query;
      const result = await productsService.list(query);
      sendSuccess(res, result, 'Products fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const product = await productsService.getById(req.params.id);
      sendSuccess(res, product, 'Product fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const product = await productsService.update(req.params.id, req.body);
      sendSuccess(res, product, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      await productsService.delete(req.params.id);
      sendSuccess(res, null, 'Product deleted successfully');
    } catch (err) {
      next(err);
    }
  },

  async uploadImage(req, res, next) {
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

  async deleteImage(req, res, next) {
    try {
      await productsService.deleteImage(req.params.id, req.params.imageId);
      sendSuccess(res, null, 'Image deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { productsController };
