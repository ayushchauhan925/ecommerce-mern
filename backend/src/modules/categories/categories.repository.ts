import { prisma } from '../../config/database';
import { Category } from '@prisma/client';

export const categoriesRepository = {
  create(data: { name: string; slug: string; description?: string }): Promise<Category> {
    return prisma.category.create({ data });
  },

  findAll(): Promise<Category[]> {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  },

  findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  },

  findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { slug } });
  },

  update(
    id: string,
    data: { name?: string; slug?: string; description?: string },
  ): Promise<Category> {
    return prisma.category.update({ where: { id }, data });
  },

  delete(id: string): Promise<Category> {
    return prisma.category.delete({ where: { id } });
  },

  countProductsInCategory(categoryId: string): Promise<number> {
    return prisma.product.count({ where: { categoryId } });
  },
};
