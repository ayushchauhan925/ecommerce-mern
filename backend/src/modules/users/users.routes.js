const { Router } = require('express');
const { usersController } = require('./users.controller');
const { validate } = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const {
  updateProfileSchema,
  updateRoleSchema,
  listUsersQuerySchema,
  userIdParamSchema,
} = require('./users.validation');

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

module.exports = router;
