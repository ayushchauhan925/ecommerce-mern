import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import routes from './routes';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { paymentsController } from './modules/payments/payments.controller';
import { globalRateLimiter } from './middleware/rateLimit.middleware';
import { docsRouter } from './docs/swagger';

const app: Application = express();

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

export default app;
