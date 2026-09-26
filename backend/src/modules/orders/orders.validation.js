const { z } = require('zod');

const createOrderSchema = z.object({
  body: z.object({
    shippingAddress: z.string().trim().min(10, 'Shipping address is too short').max(500),
  }),
});

const orderIdParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const listOrdersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

const updateOrderStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  }),
});

module.exports = {
  createOrderSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
};
