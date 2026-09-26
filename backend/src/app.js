const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { env } = require('./config/env');
const { logger } = require('./utils/logger');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { paymentsController } = require('./modules/payments/payments.controller');
const { globalRateLimiter } = require('./middleware/rateLimit.middleware');
const { docsRouter } = require('./docs/swagger');

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.webhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(pinoHttp({ logger }));

// Mounted before the /api rate limiter so loading the docs UI's static assets
// doesn't eat into a client's request budget.
app.use('/api/docs', docsRouter);

app.use('/api', globalRateLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
