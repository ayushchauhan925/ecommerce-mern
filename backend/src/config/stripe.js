const Stripe = require('stripe');
const { env } = require('./env');

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-08-26.dahlia',
});

module.exports = { stripe };
