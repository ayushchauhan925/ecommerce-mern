import { cartRepository, CartWithItems } from './cart.repository';
import { AppError } from '../../middleware/error.middleware';
import { AddCartItemInput, CartResponse } from './cart.types';

function toCartResponse(cart: CartWithItems): CartResponse {
  const items = cart.items.map((item) => {
    const price = Number(item.product.price);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      price,
      quantity: item.quantity,
      subtotal: Number((price * item.quantity).toFixed(2)),
      imageUrl: item.product.images[0]?.url ?? null,
    };
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));

  return { id: cart.id, items, totalItems, totalAmount };
}

async function getOrCreateCart(userId: string): Promise<CartWithItems> {
  let cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    await cartRepository.createForUser(userId);
    cart = await cartRepository.findByUserId(userId);
  }
  return cart!;
}

export const cartService = {
  async getCart(userId: string): Promise<CartResponse> {
    const cart = await getOrCreateCart(userId);
    return toCartResponse(cart);
  },

  async addItem(userId: string, input: AddCartItemInput): Promise<CartResponse> {
    const product = await cartRepository.findProductById(input.productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const cart = await getOrCreateCart(userId);
    const existingItem = await cartRepository.findItem(cart.id, input.productId);
    const desiredQuantity = (existingItem?.quantity ?? 0) + input.quantity;

    if (desiredQuantity > product.stock) {
      throw new AppError(
        `Only ${product.stock} unit(s) available in stock`,
        409,
        'INSUFFICIENT_STOCK',
      );
    }

    if (existingItem) {
      await cartRepository.updateItemQuantity(cart.id, input.productId, desiredQuantity);
    } else {
      await cartRepository.addItem(cart.id, input.productId, input.quantity);
    }

    const updatedCart = await getOrCreateCart(userId);
    return toCartResponse(updatedCart);
  },

  async updateItem(userId: string, productId: string, quantity: number): Promise<CartResponse> {
    const cart = await getOrCreateCart(userId);
    const existingItem = await cartRepository.findItem(cart.id, productId);
    if (!existingItem) {
      throw new AppError('Item not found in cart', 404, 'CART_ITEM_NOT_FOUND');
    }

    const product = await cartRepository.findProductById(productId);
    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (quantity > product.stock) {
      throw new AppError(
        `Only ${product.stock} unit(s) available in stock`,
        409,
        'INSUFFICIENT_STOCK',
      );
    }

    await cartRepository.updateItemQuantity(cart.id, productId, quantity);
    const updatedCart = await getOrCreateCart(userId);
    return toCartResponse(updatedCart);
  },

  async removeItem(userId: string, productId: string): Promise<CartResponse> {
    const cart = await getOrCreateCart(userId);
    const existingItem = await cartRepository.findItem(cart.id, productId);
    if (!existingItem) {
      throw new AppError('Item not found in cart', 404, 'CART_ITEM_NOT_FOUND');
    }

    await cartRepository.removeItem(cart.id, productId);
    const updatedCart = await getOrCreateCart(userId);
    return toCartResponse(updatedCart);
  },

  async clearCart(userId: string): Promise<CartResponse> {
    const cart = await getOrCreateCart(userId);
    await cartRepository.clearItems(cart.id);
    const updatedCart = await getOrCreateCart(userId);
    return toCartResponse(updatedCart);
  },
};
