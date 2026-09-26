const { Router } = require('express');
const { sendSuccess } = require('../utils/response');
const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const categoriesRoutes = require('../modules/categories/categories.routes');
const productsRoutes = require('../modules/products/products.routes');
const cartRoutes = require('../modules/cart/cart.routes');
const ordersRoutes = require('../modules/orders/orders.routes');
const paymentsRoutes = require('../modules/payments/payments.routes');
const productReviewsRoutes = require('../modules/reviews/reviews.routes');
const { reviewsRoutes } = productReviewsRoutes;

const router = Router();

router.get('/health', (_req, res) => {
  sendSuccess(res, null, 'API is running');
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/products', productReviewsRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', ordersRoutes);
router.use('/payments', paymentsRoutes);
router.use('/reviews', reviewsRoutes);

module.exports = router;
