const { categoriesService } = require('./categories.service');
const { sendSuccess } = require('../../utils/response');

const categoriesController = {
  async create(req, res, next) {
    try {
      const category = await categoriesService.create(req.body);
      sendSuccess(res, category, 'Category created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  async list(_req, res, next) {
    try {
      const categories = await categoriesService.list();
      sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const category = await categoriesService.getById(req.params.id);
      sendSuccess(res, category, 'Category fetched successfully');
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const category = await categoriesService.update(req.params.id, req.body);
      sendSuccess(res, category, 'Category updated successfully');
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      await categoriesService.delete(req.params.id);
      sendSuccess(res, null, 'Category deleted successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = { categoriesController };
