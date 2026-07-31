import { loadConfig } from '../config';
import { resetSyntheticData } from '../seed-service';
import { hashPassword, verifyPassword } from '../security';

const productionDatabaseUrl = 'postgresql://ptc_app:test-only@127.0.0.1:5432/ptc_test?schema=public';

it('hashes passwords with a random salt and verifies only the correct password', async () => {
  const first = await hashPassword('Strong-Test-Password-2026!');
  const second = await hashPassword('Strong-Test-Password-2026!');
  expect(first).not.toBe(second);
  await expect(verifyPassword('Strong-Test-Password-2026!', first)).resolves.toBe(true);
  await expect(verifyPassword('wrong-password', first)).resolves.toBe(false);
});

it('requires explicit database and cookie policy in production', () => {
  expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('DATABASE_URL must be explicitly set');
  expect(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: productionDatabaseUrl })).toThrow('COOKIE_SECURE must be explicitly set');
  expect(loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: productionDatabaseUrl,
    COOKIE_SECURE: 'true',
  }).cookieSecure).toBe(true);
});

it('blocks destructive synthetic reset in production mode', async () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: productionDatabaseUrl,
    COOKIE_SECURE: 'true',
    SEED_DEMO_PASSWORD: 'Strong-Test-Password-2026!',
  });
  await expect(resetSyntheticData(config)).rejects.toThrow('Synthetic reset is disabled');
});
