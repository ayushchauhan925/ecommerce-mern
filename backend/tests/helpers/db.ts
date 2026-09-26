import { prisma } from '../../src/config/database';

/**
 * Deletes every row, children before parents so no foreign key is violated.
 * Run in a single transaction so a partial wipe can't leave half a dataset
 * behind if one statement fails.
 *
 * (TRUNCATE would be faster but needs FOREIGN_KEY_CHECKS=0, which is
 * per-connection state — unreliable with Prisma's connection pool — and it
 * implicitly commits, so it can't be wrapped in a transaction. At this
 * suite's data volume, DELETE is a few milliseconds.)
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
