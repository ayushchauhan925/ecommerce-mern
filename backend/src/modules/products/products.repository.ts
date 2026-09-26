import { Prisma, Product, ProductImage } from '@prisma/client';
import { prisma } from '../../config/database';
import { ProductQueryOptions } from './products.types';
import { getSkip } from '../../utils/pagination';

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: true,
};

export type ProductWithRelations = Product & {
  category: { id: string; name: string; slug: string };
  images: ProductImage[];
};

export const productsRepository = {
  create(data: {
    name: string;
    slug: string;
    description?: string;
    price: number;
    stock: number;
    categoryId: string;
  }): Promise<ProductWithRelations> {
    return prisma.product.create({ data, include: productInclude }) as Promise<ProductWithRelations>;
  },

  findById(id: string): Promise<ProductWithRelations | null> {
    return prisma.product.findUnique({
      where: { id },
      include: productInclude,
    }) as Promise<ProductWithRelations | null>;
  },

  findBySlug(slug: string): Promise<Product | null> {
    return prisma.product.findUnique({ where: { slug } });
  },

  update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      price: number;
      stock: number;
      categoryId: string;
    }>,
  ): Promise<ProductWithRelations> {
    return prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    }) as Promise<ProductWithRelations>;
  },

  delete(id: string): Promise<Product> {
    return prisma.product.delete({ where: { id } });
  },

  addImage(productId: string, url: string, publicId: string): Promise<ProductImage> {
    return prisma.productImage.create({ data: { productId, url, publicId } });
  },

  findImageById(imageId: string): Promise<ProductImage | null> {
    return prisma.productImage.findUnique({ where: { id: imageId } });
  },

  deleteImage(imageId: string): Promise<ProductImage> {
    return prisma.productImage.delete({ where: { id: imageId } });
  },

  async findMany(
    options: ProductQueryOptions,
  ): Promise<{ products: ProductWithRelations[]; total: number }> {
    const { page, limit, search, category, minPrice, maxPrice, sort } = options;
    const skip = getSkip(page, limit);

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'price_asc'
        ? { price: 'asc' }
        : sort === 'price_desc'
          ? { price: 'desc' }
          : sort === 'oldest'
            ? { createdAt: 'asc' }
            : { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products: products as ProductWithRelations[], total };
  },
};
