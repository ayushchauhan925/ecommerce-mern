import { execSync } from 'child_process';
import { assertTestDatabaseUrl, loadTestEnv } from './loadTestEnv';

/**
 * Runs once, in the parent Jest process, before any integration test file.
 * Applies every migration in prisma/migrations to the test database (and
 * creates the database if it doesn't exist yet). Idempotent: already-applied
 * migrations are skipped, so this is fast on every run after the first.
 */
export default function globalSetup(): void {
  loadTestEnv();
  assertTestDatabaseUrl();

  try {
    execSync('npx prisma migrate deploy', { env: process.env, stdio: 'pipe' });
  } catch (err) {
    const output = err as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      'Failed to apply migrations to the test database. Is MySQL running and ' +
        'is DATABASE_URL in .env.test correct?\n\n' +
        `${output.stdout?.toString() ?? ''}${output.stderr?.toString() ?? ''}`,
    );
  }
}
