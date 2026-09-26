const { prisma } = require('../../config/database');
const { getSkip } = require('../../utils/pagination');

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: true,
};

const productsRepository = {
  create(data) {
    return prisma.product.create({ data, include: productInclude });
  },

  findById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
  },

  findBySlug(slug) {
    return prisma.product.findUnique({ where: { slug } });
  },

  update(id, data) {
    return prisma.product.update({
      where: { id },
      data,
      include: productInclude,
    });
  },

  delete(id) {
    return prisma.product.delete({ where: { id } });
  },

  addImage(productId, url, publicId) {
    return prisma.productImage.create({ data: { productId, url, publicId } });
  },

  findImageById(imageId) {
    return prisma.productImage.findUnique({ where: { id: imageId } });
  },

  deleteImage(imageId) {
    return prisma.productImage.delete({ where: { id: imageId } });
  },

  async findMany(options) {
    const { page, limit, search, category, minPrice, maxPrice, sort } = options;
    const skip = getSkip(page, limit);

    const where = {};

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

    const orderBy =
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

    return { products, total };
  },
};

module.exports = { productsRepository };
