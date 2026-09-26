/**
 * Two Jest "projects" so each kind of test only pays for the setup it needs:
 *
 *  - unit:        pure functions, no database, no HTTP server.
 *  - integration: real Express app via Supertest against a real MySQL test
 *                 database. External services (Redis, BullMQ, Stripe network
 *                 calls, Cloudinary) are replaced with in-process fakes.
 *
 * Integration tests share one database, so the suite must run serially:
 * `npm test` passes --runInBand.
 */

const shared = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json'],
  clearMocks: true,
};

/** @type {import('jest').Config} */
module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    // Process bootstrap and BullMQ workers need a live Redis and aren't
    // exercised by this suite; excluding them keeps the coverage number honest
    // about what the tests actually cover.
    '!src/server.js',
    '!src/jobs/*.worker.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'text', 'lcov'],
  projects: [
    {
      ...shared,
      displayName: 'unit',
      roots: ['<rootDir>/tests/unit'],
      setupFiles: ['<rootDir>/tests/setup/env.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/silenceLogger.js'],
    },
    {
      ...shared,
      displayName: 'integration',
      roots: ['<rootDir>/tests/integration'],
      globalSetup: '<rootDir>/tests/setup/globalSetup.js',
      setupFiles: ['<rootDir>/tests/setup/env.js'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/silenceLogger.js',
        '<rootDir>/tests/setup/integration.js',
      ],
    },
  ],
};
