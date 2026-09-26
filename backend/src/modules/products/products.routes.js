const { Router } = require('express');
const { productsController } = require('./products.controller');
const { validate } = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { upload } = require('../../middleware/upload.middleware');
const {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productQuerySchema,
} = require('./products.validation');

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

module.exports = router;
