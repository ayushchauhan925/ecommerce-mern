const { productsRepository } = require('./products.repository');
const { generateSlug } = require('../../utils/slug');
const { uploadImageToCloudinary, deleteImageFromCloudinary } = require('../../utils/cloudinaryUpload');
const { AppError } = require('../../middleware/error.middleware');
const { getCached, setCached, invalidateByPattern } = require('../../utils/cache');
const { buildPaginationMeta } = require('../../utils/pagination');

function toProductResponse(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    stock: product.stock,
    categoryId: product.categoryId,
    category: product.category,
    images: product.images.map((img) => ({ id: img.id, url: img.url, publicId: img.publicId })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function invalidateProductCaches(productId) {
  await invalidateByPattern('products:list:*');
  if (productId) {
    await invalidateByPattern(`product:${productId}`);
  }
}

const productsService = {
  async create(input) {
    const slug = generateSlug(input.name);

    const existing = await productsRepository.findBySlug(slug);
    if (existing) {
      throw new AppError('A product with this name already exists', 409, 'PRODUCT_EXISTS');
    }

    const product = await productsRepository.create({
      name: input.name,
      slug,
      description: input.description,
      price: input.price,
      stock: input.stock,
      categoryId: input.categoryId,
    });

    await invalidateProductCaches();

    return toProductResponse(product);
  },

  async getById(id) {
    const cacheKey = `product:${id}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    const product = await productsRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const response = toProductResponse(product);
    await setCached(cacheKey, response);
    return response;
  },

  async update(id, input) {
    const existing = await productsRepository.findById(id);
    if (!existing) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    let slug;
    if (input.name && input.name !== existing.name) {
      slug = generateSlug(input.name);
      const slugTaken = await productsRepository.findBySlug(slug);
      if (slugTaken && slugTaken.id !== id) {
        throw new AppError('A product with this name already exists', 409, 'PRODUCT_EXISTS');
      }
    }

    const product = await productsRepository.update(id, {
      name: input.name,
      slug,
      description: input.description,
      price: input.price,
      stock: input.stock,
      categoryId: input.categoryId,
    });

    await invalidateProductCaches(id);

    return toProductResponse(product);
  },

  async delete(id) {
    const existing = await productsRepository.findById(id);
    if (!existing) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    await Promise.allSettled(
      existing.images.map((img) => deleteImageFromCloudinary(img.publicId)),
    );

    await productsRepository.delete(id);
    await invalidateProductCaches(id);
  },

  async list(options) {
    const cacheKey = `products:list:${JSON.stringify(options)}`;
    const cached = await getCached(cacheKey);
    if (cached) return cached;

    const { products, total } = await productsRepository.findMany(options);
    const response = {
      products: products.map(toProductResponse),
      ...buildPaginationMeta(total, options.page, options.limit),
    };

    await setCached(cacheKey, response, 60);

    return response;
  },

  async addImage(productId, fileBuffer) {
    const existing = await productsRepository.findById(productId);
    if (!existing) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (existing.images.length >= 5) {
      throw new AppError('Maximum of 5 images per product', 400, 'MAX_IMAGES_REACHED');
    }

    const uploadResult = await uploadImageToCloudinary(fileBuffer);
    await productsRepository.addImage(productId, uploadResult.secure_url, uploadResult.public_id);

    await invalidateProductCaches(productId);

    const updated = await productsRepository.findById(productId);
    return toProductResponse(updated);
  },

  async deleteImage(productId, imageId) {
    const image = await productsRepository.findImageById(imageId);
    if (!image || image.productId !== productId) {
      throw new AppError('Image not found', 404, 'IMAGE_NOT_FOUND');
    }

    await deleteImageFromCloudinary(image.publicId);
    await productsRepository.deleteImage(imageId);

    await invalidateProductCaches(productId);
  },
};

module.exports = { productsService };
