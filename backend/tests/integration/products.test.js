const { randomUUID } = require('crypto');
const { prisma } = require('../../src/config/database');
const { api, createAdmin, createCategory, createProduct, createUser } = require('../helpers/factories');

describe('GET /api/products', () => {
  async function seedCatalog() {
    const lighting = await createCategory('Lighting');
    const furniture = await createCategory('Furniture');
    await createProduct({ name: 'Desk Lamp', price: 25, categoryId: lighting.id });
    await createProduct({ name: 'Floor Lamp', price: 80, categoryId: lighting.id });
    await createProduct({
      name: 'Oak Desk',
      price: 300,
      categoryId: furniture.id,
      description: 'Solid oak writing desk',
    });
  }

  const names = (res) => res.body.data.products.map((p) => p.name);

  it('lists products with pagination metadata', async () => {
    await seedCatalog();

    const res = await api().get('/api/products').expect(200);

    expect(res.body.data).toMatchObject({ total: 3, page: 1, limit: 20, totalPages: 1 });
    expect(res.body.data.products).toHaveLength(3);
    expect(res.body.data.products[0]).toMatchObject({
      price: expect.any(Number), // Decimal serialized as a number, not a string
      category: { slug: expect.any(String) },
    });
  });

  it('paginates', async () => {
    await seedCatalog();

    const page1 = await api().get('/api/products?page=1&limit=2&sort=price_asc').expect(200);
    const page2 = await api().get('/api/products?page=2&limit=2&sort=price_asc').expect(200);

    expect(names(page1)).toEqual(['Desk Lamp', 'Floor Lamp']);
    expect(names(page2)).toEqual(['Oak Desk']);
    expect(page2.body.data).toMatchObject({ total: 3, totalPages: 2, page: 2 });
  });

  it('filters by category slug', async () => {
    await seedCatalog();

    const res = await api().get('/api/products?category=lighting').expect(200);

    expect(names(res).sort()).toEqual(['Desk Lamp', 'Floor Lamp']);
  });

  it('filters by price range (inclusive)', async () => {
    await seedCatalog();

    const res = await api().get('/api/products?minPrice=25&maxPrice=80').expect(200);

    expect(names(res).sort()).toEqual(['Desk Lamp', 'Floor Lamp']);
  });

  it('searches name and description', async () => {
    await seedCatalog();

    expect(names(await api().get('/api/products?search=lamp'))).toHaveLength(2);
    expect(names(await api().get('/api/products?search=oak'))).toEqual(['Oak Desk']);
  });

  it('sorts by price descending', async () => {
    await seedCatalog();

    const res = await api().get('/api/products?sort=price_desc').expect(200);

    expect(names(res)).toEqual(['Oak Desk', 'Floor Lamp', 'Desk Lamp']);
  });

  it('rejects an invalid query with 400', async () => {
    await api().get('/api/products?limit=500').expect(400);
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product', async () => {
    const product = await createProduct({ name: 'Desk Lamp', price: 25.5 });

    const res = await api().get(`/api/products/${product.id}`).expect(200);

    expect(res.body.data).toMatchObject({ id: product.id, name: 'Desk Lamp', price: 25.5 });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await api().get(`/api/products/${randomUUID()}`).expect(404);
    expect(res.body.errorCode).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    await api().get('/api/products/not-a-uuid').expect(400);
  });
});

describe('admin product management', () => {
  it('lets an admin create a product (slug derived from the name)', async () => {
    const { auth } = await createAdmin();
    const category = await createCategory();

    const res = await api()
      .post('/api/products')
      .set('Authorization', auth)
      .send({ name: 'Brass Desk Lamp', price: 49.99, stock: 7, categoryId: category.id })
      .expect(201);

    expect(res.body.data).toMatchObject({ slug: 'brass-desk-lamp', price: 49.99, stock: 7 });
    expect(await prisma.product.count()).toBe(1);
  });

  it('rejects a product whose name collides with an existing slug', async () => {
    const { auth } = await createAdmin();
    const existing = await createProduct({ name: 'Desk Lamp' });

    const res = await api()
      .post('/api/products')
      .set('Authorization', auth)
      .send({ name: 'desk lamp', price: 10, stock: 1, categoryId: existing.categoryId })
      .expect(409);

    expect(res.body.errorCode).toBe('PRODUCT_EXISTS');
  });

  it('lets an admin update a product, and the cached copy is invalidated', async () => {
    const { auth } = await createAdmin();
    const product = await createProduct({ price: 10 });

    // Prime the cache
    await api().get(`/api/products/${product.id}`).expect(200);

    await api()
      .patch(`/api/products/${product.id}`)
      .set('Authorization', auth)
      .send({ price: 12.5 })
      .expect(200);

    const res = await api().get(`/api/products/${product.id}`).expect(200);
    expect(res.body.data.price).toBe(12.5);
  });

  it('lets an admin delete a product', async () => {
    const { auth } = await createAdmin();
    const product = await createProduct();

    await api().delete(`/api/products/${product.id}`).set('Authorization', auth).expect(200);

    await api().get(`/api/products/${product.id}`).expect(404);
    expect(await prisma.product.count()).toBe(0);
  });

  describe('non-admins are blocked', () => {
    it('401 without a token', async () => {
      const product = await createProduct();

      await api().post('/api/products').send({}).expect(401);
      await api().patch(`/api/products/${product.id}`).send({ price: 1 }).expect(401);
      await api().delete(`/api/products/${product.id}`).expect(401);
    });

    it('403 for a customer, and nothing changes', async () => {
      const { auth } = await createUser();
      const product = await createProduct({ price: 10 });

      const create = await api()
        .post('/api/products')
        .set('Authorization', auth)
        .send({ name: 'Sneaky', price: 1, stock: 1, categoryId: product.categoryId })
        .expect(403);
      expect(create.body.errorCode).toBe('FORBIDDEN');

      await api()
        .patch(`/api/products/${product.id}`)
        .set('Authorization', auth)
        .send({ price: 0.01 })
        .expect(403);
      await api().delete(`/api/products/${product.id}`).set('Authorization', auth).expect(403);

      const after = await prisma.product.findMany();
      expect(after).toHaveLength(1);
      expect(Number(after[0].price)).toBe(10);
    });
  });
});
