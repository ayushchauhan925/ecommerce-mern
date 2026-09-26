import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['CUSTOMER', 'ADMIN']),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});