const { categoriesRepository } = require('./categories.repository');
const { generateSlug } = require('../../utils/slug');
const { AppError } = require('../../middleware/error.middleware');

const categoriesService = {
  async create(input) {
    const slug = generateSlug(input.name);

    const existing = await categoriesRepository.findBySlug(slug);
    if (existing) {
      throw new AppError('A category with this name already exists', 409, 'CATEGORY_EXISTS');
    }

    return categoriesRepository.create({
      name: input.name,
      slug,
      description: input.description,
    });
  },

  async list() {
    return categoriesRepository.findAll();
  },

  async getById(id) {
    const category = await categoriesRepository.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }
    return category;
  },

  async update(id, input) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    let slug;
    if (input.name && input.name !== existing.name) {
      slug = generateSlug(input.name);
      const slugTaken = await categoriesRepository.findBySlug(slug);
      if (slugTaken && slugTaken.id !== id) {
        throw new AppError('A category with this name already exists', 409, 'CATEGORY_EXISTS');
      }
    }

    return categoriesRepository.update(id, {
      name: input.name,
      slug,
      description: input.description,
    });
  },

  async delete(id) {
    const existing = await categoriesRepository.findById(id);
    if (!existing) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    const productCount = await categoriesRepository.countProductsInCategory(id);
    if (productCount > 0) {
      throw new AppError(
        `Cannot delete category with ${productCount} product(s). Reassign or delete them first.`,
        409,
        'CATEGORY_HAS_PRODUCTS',
      );
    }

    await categoriesRepository.delete(id);
  },
};

module.exports = { categoriesService };
