const { logger } = require('../utils/logger');
const { env } = require('../config/env');

class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    logger.warn({ errorCode: err.errorCode }, err.message);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
    });
    return;
  }

  // Unexpected error — log full details, but never leak them to the client
  logger.error({ err }, 'Unexpected error');

  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    errorCode: 'INTERNAL_ERROR',
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
