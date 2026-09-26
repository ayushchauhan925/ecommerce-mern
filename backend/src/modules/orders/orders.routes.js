const { Router } = require('express');
const { ordersController } = require('./orders.controller');
const { validate } = require('../../middleware/validate.middleware');
const { requireAuth } = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const {
  createOrderSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
  updateOrderStatusSchema,
} = require('./orders.validation');

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

module.exports = router;
