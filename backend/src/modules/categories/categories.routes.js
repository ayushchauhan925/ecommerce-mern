const { Router } = require('express');
const { categoriesController } = require('./categories.controller');
const { validate } = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} = require('./categories.validation');

const router = Router();

router.get('/', categoriesController.list);
router.get('/:id', validate(categoryIdParamSchema), categoriesController.getById);

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createCategorySchema),
  categoriesController.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateCategorySchema),
  categoriesController.update,
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(categoryIdParamSchema),
  categoriesController.delete,
);

module.exports = router;
