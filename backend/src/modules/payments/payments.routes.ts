import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { createIntentSchema } from './payments.validation';
import { paymentRateLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

router.post(
  '/create-intent',
  requireAuth,
  paymentRateLimiter,
  validate(createIntentSchema),
  paymentsController.createIntent,
);

export default router;
