const { Router } = require('express');
const { authController } = require('./auth.controller');
const { validate } = require('../../middleware/validate.middleware');
const { registerSchema, loginSchema, refreshSchema, logoutSchema } = require('./auth.validation');
const { authRateLimiter } = require('../../middleware/rateLimit.middleware');

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(logoutSchema), authController.logout);

module.exports = router;
