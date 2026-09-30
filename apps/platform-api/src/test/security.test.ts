import { loadConfig } from '../config';
import { resetSyntheticData } from '../seed-service';
import { hashPassword, sessionExpiryForActivity, verifyPassword } from '../security';

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


it('uses a 30-day session lifetime by default', () => {
  const config = loadConfig({ DATABASE_URL: productionDatabaseUrl });
  expect(config.sessionTtlHours).toBe(720);
  expect(config.sessionAbsoluteTtlHours).toBe(720);

  const createdAt = new Date('2026-09-29T00:00:00.000Z');
  const activeAt = new Date('2026-09-29T06:00:00.000Z');
  expect(sessionExpiryForActivity(createdAt, activeAt, config).toISOString())
    .toBe('2026-10-29T00:00:00.000Z');

  const nearAbsoluteCap = new Date('2026-10-28T20:00:00.000Z');
  expect(sessionExpiryForActivity(createdAt, nearAbsoluteCap, config).toISOString())
    .toBe('2026-10-29T00:00:00.000Z');
});

it('rejects an absolute session lifetime shorter than the rolling lifetime', () => {
  expect(() => loadConfig({
    DATABASE_URL: productionDatabaseUrl,
    SESSION_TTL_HOURS: '12',
    SESSION_ABSOLUTE_TTL_HOURS: '8',
  })).toThrow('SESSION_ABSOLUTE_TTL_HOURS must be greater than or equal to SESSION_TTL_HOURS');
});
