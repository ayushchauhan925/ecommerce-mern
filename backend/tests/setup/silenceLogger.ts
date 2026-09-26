// The real logger uses the pino-pretty transport outside production, which
// spawns a worker thread per test file (slow, noisy, and it keeps Jest from
// exiting). A silent in-process pino instance is a drop-in replacement —
// pino-http in src/app.ts still gets a real pino logger to wrap.
jest.mock('../../src/utils/logger', () => {
  const pino = jest.requireActual('pino');
  return { logger: pino({ level: 'silent' }) };
});
