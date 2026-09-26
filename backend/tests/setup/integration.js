const { prisma } = require('../../src/config/database');
const { assertTestDatabaseUrl } = require('./loadTestEnv');
const { resetDatabase } = require('../helpers/db');
const { fakeRedis } = require('../helpers/fakeRedis');

/*
 * External services are swapped out for every integration test file.
 * These jest.mock() calls are hoisted above the imports, and because
 * setupFilesAfterEnv shares its module registry with the test file, the app
 * the test imports sees the mocked versions.
 */

// Caching + rate limiting → in-memory fake (same commands, no server needed).
jest.mock('../../src/config/redis', () => ({
  redis: jest.requireActual('../helpers/fakeRedis').fakeRedis,
}));

// BullMQ → queues become spies. Tests can assert a job was *enqueued* without
// Redis or a running worker; what the worker does with it is out of scope.
jest.mock('../../src/jobs/queue', () => {
  const makeQueue = () => ({ add: jest.fn().mockResolvedValue({ id: 'test-job' }) });
  return {
    bullmqConnection: {},
    emailQueue: makeQueue(),
    orderQueue: makeQueue(),
    cleanupQueue: makeQueue(),
  };
});

// Stripe → a REAL Stripe SDK instance (so webhooks.constructEvent does real
// HMAC signature verification, locally), with the one network-calling
// method the app uses replaced. Unless a test explicitly stubs it, calling it
// fails loudly instead of hitting api.stripe.com.
jest.mock('../../src/config/stripe', () => {
  const StripeModule = jest.requireActual('stripe');
  const Stripe = StripeModule.default ?? StripeModule;
  const stripe = new Stripe('sk_test_dummy_not_a_real_key');
  stripe.paymentIntents.create = jest.fn(() =>
    Promise.reject(new Error('stripe.paymentIntents.create was called without a test stub')),
  );
  return { stripe };
});

// Cloudinary → never upload anything.
jest.mock('../../src/utils/cloudinaryUpload', () => ({
  uploadImageToCloudinary: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
    public_id: 'ecommerce/products/test',
  }),
  deleteImageFromCloudinary: jest.fn().mockResolvedValue(undefined),
}));

jest.setTimeout(30_000);

beforeAll(() => {
  assertTestDatabaseUrl();
});

beforeEach(async () => {
  fakeRedis.reset();
  await resetDatabase();
});

afterEach(() => {
  // Undo any jest.spyOn() a test installed (e.g. the concurrency barrier),
  // so it can't leak into the next test.
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});
