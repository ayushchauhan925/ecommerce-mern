import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  createReviewSchema,
  listReviewsSchema,
  updateReviewSchema,
  reviewIdParamSchema,
} from './reviews.validation';

// Nested under /api/products — create/list are product-scoped, matching the
// public URL shape from the spec (POST/GET /api/products/:productId/reviews).
// Mounted alongside productsRoutes at the same '/products' prefix in
// routes/index.ts, rather than inside products.routes.ts itself, so the
// reviews module stays fully self-contained.
export const productReviewsRoutes = Router();

productReviewsRoutes.post(
  '/:productId/reviews',
  requireAuth,
  validate(createReviewSchema),
  reviewsController.create,
);

productReviewsRoutes.get(
  '/:productId/reviews',
  validate(listReviewsSchema),
  reviewsController.list,
);

// Flat under /api/reviews — update/delete act on a review by its own ID,
// not scoped to a product in the URL.
export const reviewsRoutes = Router();

reviewsRoutes.patch(
  '/:id',
  requireAuth,
  validate(updateReviewSchema),
  reviewsController.update,
);

reviewsRoutes.delete(
  '/:id',
  requireAuth,
  validate(reviewIdParamSchema),
  reviewsController.delete,
);

export default productReviewsRoutes;
