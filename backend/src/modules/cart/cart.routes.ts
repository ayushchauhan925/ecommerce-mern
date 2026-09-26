import { Router } from 'express';
import { cartController } from './cart.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { addCartItemSchema, updateCartItemSchema, cartItemParamSchema } from './cart.validation';

const router = Router();

router.use(requireAuth);

router.get('/', cartController.getCart);
router.post('/items', validate(addCartItemSchema), cartController.addItem);
router.patch('/items/:productId', validate(updateCartItemSchema), cartController.updateItem);
router.delete('/items/:productId', validate(cartItemParamSchema), cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;
