const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/config/database');
const { hashPassword } = require('../../src/utils/password');
const { signAccessToken } = require('../../src/utils/jwt');
const { generateSlug } = require('../../src/utils/slug');

/**
 * Factories write straight to the database so each test can set up exactly
 * the state it needs without going through unrelated endpoints. The endpoint
 * under test is always exercised over HTTP via `api()`.
 */

const api = () => request(app);

const DEFAULT_PASSWORD = 'Password123!';
const SHIPPING_ADDRESS = '221B Baker Street, London NW1 6XE';

let sequence = 0;
const unique = () => `${Date.now().toString(36)}${(sequence++).toString(36)}`;

// bcrypt is deliberately slow; hash the shared test password once per file.
let passwordHash;

async function createUser(overrides = {}) {
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

const createAdmin = () => createUser({ role: 'ADMIN', name: 'Admin User' });

async function createCategory(name = `Category ${unique()}`) {
  return prisma.category.create({ data: { name, slug: generateSlug(name) } });
}

async function createProduct(overrides = {}) {
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

async function addToCart(userId, productId, quantity) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
}

async function createOrder(userId, items, status = 'PENDING') {
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

module.exports = {
  api,
  DEFAULT_PASSWORD,
  SHIPPING_ADDRESS,
  createUser,
  createAdmin,
  createCategory,
  createProduct,
  addToCart,
  createOrder,
};
