const { Router } = require('express');
const { cartController } = require('./cart.controller');
const { validate } = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const {
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParamSchema,
} = require('./cart.validation');

const router = Router();

router.use(requireAuth);

router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addItem);
router.patch('/items/:productId', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:productId', validate(cartItemParamSchema), cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
