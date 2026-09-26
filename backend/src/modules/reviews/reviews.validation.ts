import { z } from 'zod';

export const createReviewSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
  body: z.object({
    rating: z.coerce
      .number()
      .int()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5'),
    comment: z.string().trim().max(1000).optional(),
  }),
});

export const listReviewsSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid review ID'),
  }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(1000).optional(),
  }),
});

export const reviewIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid review ID'),
  }),
});
