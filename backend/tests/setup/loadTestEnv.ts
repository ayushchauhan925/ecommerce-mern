import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const ENV_TEST_PATH = path.resolve(__dirname, '../../.env.test');

// Satisfies src/config/env.ts's `DATABASE_URL is required` check for unit
// tests (which never connect), while deliberately failing
// assertTestDatabaseUrl() so integration tests can't silently fall back to it.
const UNCONFIGURED_DATABASE_URL = 'mysql://unconfigured@localhost:3306/not_configured';

/**
 * Populates process.env for tests. Must run BEFORE anything imports
 * src/config/env.ts — that module calls dotenv.config() on the real `.env`,
 * but dotenv never overwrites a variable that's already set, so every value
 * assigned here wins over the developer's `.env`.
 *
 * Secrets for external services are always forced to dummies, so even a
 * missing mock can never reach real Stripe/Cloudinary with real credentials.
 */
export function loadTestEnv(): void {
  const fileVars = fs.existsSync(ENV_TEST_PATH)
    ? dotenv.parse(fs.readFileSync(ENV_TEST_PATH))
    : {};

  // Only .env.test or an explicit TEST_DATABASE_URL (handy in CI) may choose
  // the database. A DATABASE_URL inherited from the shell or .env is ignored.
  process.env.DATABASE_URL =
    fileVars.DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? UNCONFIGURED_DATABASE_URL;

  Object.assign(process.env, {
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:3000',

    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',

    // Never connected to — src/config/redis.ts and src/jobs/queue.ts are mocked.
    REDIS_URL: 'redis://localhost:6379',

    STRIPE_SECRET_KEY: 'sk_test_dummy_not_a_real_key',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_dummy_not_a_real_key',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_dummy_webhook_secret',

    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  });
}

/**
 * Integration tests delete every row between tests. Refuse to touch any
 * database whose name doesn't end in `_test`, so a misconfigured env can
 * never wipe development data.
 */
export function assertTestDatabaseUrl(url = process.env.DATABASE_URL): void {
  let dbName = '';
  try {
    dbName = new URL(url ?? '').pathname.replace(/^\//, '');
  } catch {
    // fall through to the error below
  }

  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against database "${dbName || url}". ` +
        'Create .env.test (see .env.test.example) with a DATABASE_URL whose ' +
        'database name ends in "_test", or set TEST_DATABASE_URL.',
    );
  }
}
