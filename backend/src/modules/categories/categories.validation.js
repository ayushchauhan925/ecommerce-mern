const { z } = require('zod');

const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    description: z.string().trim().max(500).optional(),
  }),
});

const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional(),
  }),
});

const categoryIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

module.exports = { createCategorySchema, updateCategorySchema, categoryIdParamSchema };
