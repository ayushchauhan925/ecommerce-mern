import { Router } from 'express';
import { categoriesController } from './categories.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from './categories.validation';

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

export default router;
