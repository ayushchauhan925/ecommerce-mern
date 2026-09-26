import { Router } from 'express';
import { productsController } from './products.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { upload } from '../../middleware/upload.middleware';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productQuerySchema,
} from './products.validation';

const router = Router();

// Public
router.get('/', validate(productQuerySchema), productsController.list);
router.get('/:id', validate(productIdParamSchema), productsController.getById);

// Admin only
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(createProductSchema),
  productsController.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateProductSchema),
  productsController.update,
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(productIdParamSchema),
  productsController.delete,
);

router.post(
  '/:id/images',
  requireAuth,
  requireRole('ADMIN'),
  upload.single('image'),
  productsController.uploadImage,
);
router.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('ADMIN'),
  productsController.deleteImage,
);

export default router;
