import { loadTestEnv } from './loadTestEnv';

// Jest `setupFiles`: runs in every test file's sandbox before the test file
// (and therefore before src/config/env.ts) is imported.
loadTestEnv();
