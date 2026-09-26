const { AppError } = require('./error.middleware');

function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
}

module.exports = { requireRole };
