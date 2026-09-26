const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@ecommerce.com',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Phones, laptops, and gadgets',
    },
  });

  await prisma.product.upsert({
    where: { slug: 'sample-phone' },
    update: {},
    create: {
      name: 'Sample Phone',
      slug: 'sample-phone',
      description: 'A great sample phone for testing',
      price: 299.99,
      stock: 50,
      categoryId: electronics.id,
    },
  });

  console.log('Seed complete:', { adminId: admin.id, categoryId: electronics.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
