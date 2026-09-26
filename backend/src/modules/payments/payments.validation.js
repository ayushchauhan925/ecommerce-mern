const { z } = require('zod');

const createIntentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
});

module.exports = { createIntentSchema };
