import { Router } from 'express';
import { ordersController } from './orders.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import {
  createOrderSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} from './orders.validation';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createOrderSchema), ordersController.create);
router.get('/', validate(listOrdersQuerySchema), ordersController.list);
router.get('/:id', validate(orderIdParamSchema), ordersController.getById);
router.patch('/:id/cancel', validate(orderIdParamSchema), ordersController.cancel);

router.patch(
  '/:id/status',
  requireRole('ADMIN'),
  validate(updateOrderStatusSchema),
  ordersController.updateStatus,
);

export default router;
