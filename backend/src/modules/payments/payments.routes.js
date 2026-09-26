const { Router } = require('express');
const { paymentsController } = require('./payments.controller');
const { validate } = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { createIntentSchema } = require('./payments.validation');
const { paymentRateLimiter } = require('../../middleware/rateLimit.middleware');

const router = Router();

router.post(
  '/create-intent',
  requireAuth,
  paymentRateLimiter,
  validate(createIntentSchema),
  paymentsController.createIntent,
);

module.exports = router;
