import { Router } from 'express';
import { usersController } from './users.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  updateProfileSchema,
  updateRoleSchema,
  listUsersQuerySchema,
  userIdParamSchema,
} from './users.validation';

const router = Router();

// Self-service (any authenticated user)
router.get('/me', requireAuth, usersController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema), usersController.updateMe);

// Admin-only user management
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(listUsersQuerySchema),
  usersController.listUsers,
);
router.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(userIdParamSchema),
  usersController.getUserById,
);
router.patch(
  '/:id/role',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateRoleSchema),
  usersController.updateUserRole,
);

export default router;