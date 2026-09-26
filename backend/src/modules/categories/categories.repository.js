const { prisma } = require('../../config/database');

const categoriesRepository = {
  create(data) {
    return prisma.category.create({ data });
  },

  findAll() {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },

  findById(id) {
    return prisma.category.findUnique({ where: { id } });
  },

  findBySlug(slug) {
    return prisma.category.findUnique({ where: { slug } });
  },

  update(id, data) {
    return prisma.category.update({ where: { id }, data });
  },

  delete(id) {
    return prisma.category.delete({ where: { id } });
  },

  countProductsInCategory(categoryId) {
    return prisma.product.count({ where: { categoryId } });
  },
};

module.exports = { categoriesRepository };
