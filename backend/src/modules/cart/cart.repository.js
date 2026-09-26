const { prisma } = require('../../config/database');

const cartInclude = {
  items: {
    include: {
      product: {
        include: { images: true },
      },
    },
  },
};

const cartRepository = {
  findByUserId(userId) {
    return prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    });
  },

  createForUser(userId) {
    return prisma.cart.create({ data: { userId } });
  },

  findItem(cartId, productId) {
    return prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  addItem(cartId, productId, quantity) {
    return prisma.cartItem.create({ data: { cartId, productId, quantity } });
  },

  updateItemQuantity(cartId, productId, quantity) {
    return prisma.cartItem.update({
      where: { cartId_productId: { cartId, productId } },
      data: { quantity },
    });
  },

  removeItem(cartId, productId) {
    return prisma.cartItem.delete({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  clearItems(cartId) {
    return prisma.cartItem.deleteMany({ where: { cartId } });
  },

  findProductById(productId) {
    return prisma.product.findUnique({ where: { id: productId } });
  },
};

module.exports = { cartRepository };
