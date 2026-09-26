const { z } = require('zod');

const addCartItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  }),
});

const updateCartItemSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
  body: z.object({
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  }),
});

const cartItemParamSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
});

module.exports = { addCartItemSchema, updateCartItemSchema, cartItemParamSchema };
