import request from 'supertest';
import { OrderStatus, Product, Role } from '@prisma/client';
import app from '../../src/app';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/password';
import { signAccessToken } from '../../src/utils/jwt';
import { generateSlug } from '../../src/utils/slug';

/**
 * Factories write straight to the database so each test can set up exactly
 * the state it needs without going through unrelated endpoints. The endpoint
 * under test is always exercised over HTTP via `api()`.
 */

export const api = () => request(app);

export const DEFAULT_PASSWORD = 'Password123!';
export const SHIPPING_ADDRESS = '221B Baker Street, London NW1 6XE';

let sequence = 0;
const unique = () => `${Date.now().toString(36)}${(sequence++).toString(36)}`;

// bcrypt is deliberately slow; hash the shared test password once per file.
let passwordHash: Promise<string> | undefined;

export async function createUser(overrides: { role?: Role; email?: string; name?: string } = {}) {
  passwordHash ??= hashPassword(DEFAULT_PASSWORD);

  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `user-${unique()}@example.com`,
      passwordHash: await passwordHash,
      role: overrides.role ?? 'CUSTOMER',
    },
  });

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  return { user, accessToken, auth: `Bearer ${accessToken}` };
}

export const createAdmin = () => createUser({ role: 'ADMIN', name: 'Admin User' });

export async function createCategory(name = `Category ${unique()}`) {
  return prisma.category.create({ data: { name, slug: generateSlug(name) } });
}

export async function createProduct(
  overrides: {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    categoryId?: string;
  } = {},
): Promise<Product> {
  const name = overrides.name ?? `Product ${unique()}`;
  const categoryId = overrides.categoryId ?? (await createCategory()).id;

  return prisma.product.create({
    data: {
      name,
      slug: generateSlug(name),
      description: overrides.description,
      price: overrides.price ?? 10,
      stock: overrides.stock ?? 10,
      categoryId,
    },
  });
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
}

export async function createOrder(
  userId: string,
  items: { product: Product; quantity: number }[],
  status: OrderStatus = 'PENDING',
) {
  const totalAmount = items.reduce(
    (sum, { product, quantity }) => sum + Number(product.price) * quantity,
    0,
  );

  return prisma.order.create({
    data: {
      userId,
      status,
      shippingAddress: SHIPPING_ADDRESS,
      totalAmount: Number(totalAmount.toFixed(2)),
      items: {
        create: items.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
          price: product.price,
        })),
      },
    },
  });
}
