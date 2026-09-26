const { ZodError } = require('zod');
const { AppError } = require('./error.middleware');

function validate(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) {
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params !== undefined) {
        Object.assign(req.params, parsed.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new AppError(message, 400, 'VALIDATION_ERROR'));
        return;
      }
      next(err);
    }
  };
}

module.exports = { validate };
