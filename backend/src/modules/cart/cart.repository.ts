import { Prisma, Cart, CartItem } from '@prisma/client';
import { prisma } from '../../config/database';

const cartInclude = {
  items: {
    include: {
      product: {
        include: { images: true },
      },
    },
  },
};

export type CartWithItems = Cart & {
  items: (CartItem & {
    product: {
      id: string;
      name: string;
      slug: string;
      price: { toString(): string };
      stock: number;
      images: { url: string }[];
    };
  })[];
};

export const cartRepository = {
  findByUserId(userId: string): Promise<CartWithItems | null> {
    return prisma.cart.findUnique({
      where: { userId },
      include: cartInclude,
    }) as Promise<CartWithItems | null>;
  },

  createForUser(userId: string): Promise<Cart> {
    return prisma.cart.create({ data: { userId } });
  },

  findItem(cartId: string, productId: string): Promise<CartItem | null> {
    return prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  addItem(cartId: string, productId: string, quantity: number): Promise<CartItem> {
    return prisma.cartItem.create({ data: { cartId, productId, quantity } });
  },

  updateItemQuantity(cartId: string, productId: string, quantity: number): Promise<CartItem> {
    return prisma.cartItem.update({
      where: { cartId_productId: { cartId, productId } },
      data: { quantity },
    });
  },

  removeItem(cartId: string, productId: string): Promise<CartItem> {
    return prisma.cartItem.delete({
      where: { cartId_productId: { cartId, productId } },
    });
  },

  clearItems(cartId: string): Promise<Prisma.BatchPayload> {
    return prisma.cartItem.deleteMany({ where: { cartId } });
  },

  findProductById(productId: string) {
    return prisma.product.findUnique({ where: { id: productId } });
  },
};
