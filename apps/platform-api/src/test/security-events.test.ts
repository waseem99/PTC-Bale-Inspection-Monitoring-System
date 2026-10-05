import request from 'supertest';
import { loadConfig } from '../config';
import { connectDatabase, disconnectDatabase, prisma } from '../db';
import { createRuntimeApp } from '../runtime-app';
import { hashToken } from '../security';
import { resetSyntheticData, seedSyntheticData } from '../seed-service';

const password = 'Security-Logging-Test-Password-2026!';
const serviceToken = 'Security-Logging-Machine-Token-2026!';
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://ptc_app:ptc_local_change_me@127.0.0.1:5432/ptc_bale_test?schema=public';
const rtspSecret = 'rtsp://camera-user:camera-password@10.0.0.10/stream';
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
  SEED_DEMO_PASSWORD: password,
  INGESTION_SERVICE_TOKEN: serviceToken,
  SIMULATOR_ENABLED: 'true',
  DATABASE_URL: databaseUrl,
  ALLOWED_ORIGINS: 'http://localhost',
});
const app = createRuntimeApp(config);

type SecurityRecord = Record<string, unknown> & { recordType?: string; eventType?: string };
let logSpy: jest.SpyInstance;
let captured: string[] = [];

function securityRecords(): SecurityRecord[] {
  return captured.flatMap((line) => {
    try {
      const parsed = JSON.parse(line) as SecurityRecord;
      return parsed.recordType === 'security_event' ? [parsed] : [];
    } catch {
      return [];
    }
  });
}

function eventTypes(): string[] {
  return securityRecords().map((record) => String(record.eventType));
}

async function flushLogs(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function login(username: string, target = app) {
  const agent = request.agent(target);
  const response = await agent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost')
    .send({ username, password });
  expect(response.status).toBe(200);
  await flushLogs();
  return agent;
}

beforeAll(async () => {
  await connectDatabase();
  await seedSyntheticData(config, true);
});

beforeEach(() => {
  captured = [];
  logSpy = jest.spyOn(console, 'log').mockImplementation((value?: unknown) => {
    captured.push(String(value ?? ''));
  });
});

afterEach(() => {
  logSpy.mockRestore();
});

afterAll(async () => {
  await resetSyntheticData(config);
  await disconnectDatabase();
});

it('logs authentication, origin, rate-limit and invalid machine credential events without secrets', async () => {
  const viewer = await login('viewer');
  expect(eventTypes()).toContain('auth.login.succeeded');

  await request(app)
    .post('/api/auth/login')
    .set('Origin', 'http://localhost')
    .set('X-Debug-RTSP', rtspSecret)
    .send({ username: 'viewer', password: 'definitely-wrong-password' });
  await flushLogs();
  expect(eventTypes()).toContain('auth.login.failed');

  await request(app)
    .post('/api/auth/login')
    .set('Origin', 'https://not-allowed.example')
    .send({ username: 'viewer', password });
  await flushLogs();
  expect(eventTypes()).toContain('origin.denied');

  await request(app)
    .post('/api/ingest/events')
    .set('Authorization', 'Bearer invalid-ingestion-secret')
    .send({ invalid: true });
  await flushLogs();
  expect(eventTypes()).toContain('ingestion.credential.invalid');

  const rateLimitApp = createRuntimeApp(config);
  for (let attempt = 0; attempt < 11; attempt += 1) {
    await request(rateLimitApp)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost')
      .send({ username: 'rate-limit-user', password: 'wrong-password' });
  }
  await flushLogs();
  expect(eventTypes()).toContain('rate_limit.triggered');

  await viewer.post('/api/auth/logout').set('Origin', 'http://localhost');
  await flushLogs();
  expect(eventTypes()).toContain('auth.logout');
  expect(eventTypes()).toContain('auth.session.revoked');

  const serialized = securityRecords().map((record) => JSON.stringify(record)).join('\n');
  expect(serialized).not.toContain(password);
  expect(serialized).not.toContain(serviceToken);
  expect(serialized).not.toContain('invalid-ingestion-secret');
  expect(serialized).not.toContain(databaseUrl);
  expect(serialized).not.toContain(rtspSecret);
  expect(serialized).not.toContain('camera-password');
});

it('logs protected access, review, evidence, report and export actions with actor context', async () => {
  const viewer = await login('viewer');
  captured = [];
  const forbidden = await viewer
    .post('/api/operations/evidence/retention')
    .set('Origin', 'http://localhost')
    .send({ olderThanDays: 30, dryRun: true });
  expect(forbidden.status).toBe(403);
  await flushLogs();
  expect(eventTypes()).toContain('auth.access.denied');

  const supervisor = await login('supervisor');
  captured = [];
  const evidence = await prisma.evidenceMetadata.findFirst({
    where: { state: 'available' },
    select: { id: true, eventId: true },
  });
  expect(evidence).not.toBeNull();

  const metadata = await supervisor.get(`/api/events/${evidence!.eventId}/evidence`);
  expect(metadata.status).toBe(200);
  if (metadata.body.contentUrl) {
    const content = await supervisor.get(metadata.body.contentUrl as string);
    expect(content.status).toBe(200);
  }

  const pdf = await supervisor.get('/api/reports/pdf');
  expect(pdf.status).toBe(200);
  const csv = await supervisor
    .post('/api/exports/events')
    .set('Origin', 'http://localhost')
    .send({ format: 'csv' });
  expect(csv.status).toBe(200);

  const event = await prisma.inspectionEvent.findUnique({
    where: { id: evidence!.eventId },
    select: { version: true },
  });
  const review = await supervisor
    .patch(`/api/events/${evidence!.eventId}/review`)
    .set('Origin', 'http://localhost')
    .send({ reviewStatus: 'confirmed', remarks: 'Security logging acceptance.', expectedVersion: event!.version });
  expect(review.status).toBe(200);
  await flushLogs();

  const types = eventTypes();
  expect(types).toContain('evidence.metadata.accessed');
  if (metadata.body.contentUrl) expect(types).toContain('evidence.content.accessed');
  expect(types).toContain('report.generated');
  expect(types).toContain('export.generated');
  expect(types).toContain('event.review.updated');

  const privileged = securityRecords().filter((record) => [
    'evidence.metadata.accessed', 'evidence.content.accessed', 'report.generated', 'export.generated', 'event.review.updated',
  ].includes(String(record.eventType)));
  expect(privileged.length).toBeGreaterThanOrEqual(4);
  expect(privileged.every((record) => typeof record.actorId === 'string' && typeof record.actorRole === 'string')).toBe(true);
});

it('distinguishes expired and revoked sessions, logs disabled users, and records health transitions', async () => {
  const viewer = await prisma.user.findUnique({ where: { username: 'viewer' } });
  expect(viewer).not.toBeNull();

  const expiredToken = 'security-expired-session-token';
  await prisma.session.create({
    data: {
      tokenHash: hashToken(expiredToken),
      userId: viewer!.id,
      expiresAt: new Date(Date.now() - 60_000),
      lastSeenAt: new Date(Date.now() - 120_000),
    },
  });
  const expired = await request(app)
    .get('/api/auth/me')
    .set('Cookie', `${config.sessionCookieName}=${expiredToken}`);
  expect(expired.status).toBe(401);
  await flushLogs();
  expect(eventTypes()).toContain('auth.session.expired');

  captured = [];
  const revokedToken = 'security-revoked-session-token';
  await prisma.session.create({
    data: {
      tokenHash: hashToken(revokedToken),
      userId: viewer!.id,
      expiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
      revokedAt: new Date(),
    },
  });
  const revoked = await request(app)
    .get('/api/auth/me')
    .set('Cookie', `${config.sessionCookieName}=${revokedToken}`);
  expect(revoked.status).toBe(401);
  await flushLogs();
  expect(eventTypes()).toContain('auth.session.revoked');

  captured = [];
  const disabledToken = 'security-disabled-user-token';
  await prisma.user.update({ where: { id: viewer!.id }, data: { enabled: false } });
  try {
    await prisma.session.create({
      data: {
        tokenHash: hashToken(disabledToken),
        userId: viewer!.id,
        expiresAt: new Date(Date.now() + 60_000),
        lastSeenAt: new Date(),
      },
    });
    const disabled = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${config.sessionCookieName}=${disabledToken}`);
    expect(disabled.status).toBe(401);
    await flushLogs();
    expect(eventTypes()).toContain('auth.user.disabled');
  } finally {
    await prisma.user.update({ where: { id: viewer!.id }, data: { enabled: true } });
  }

  captured = [];
  const healthId = 'SECURITY-LOGGING-HEALTH-TEST';
  const first = {
    id: healthId,
    label: 'Security logging health test',
    value: 'ready',
    detail: 'Security-event test fixture.',
    state: 'healthy',
    checkedAt: new Date().toISOString(),
    source: 'test',
    sequence: 1,
  };
  await request(app).post('/api/ingest/health').set('Authorization', `Bearer ${serviceToken}`).send(first);
  await request(app).post('/api/ingest/health').set('Authorization', `Bearer ${serviceToken}`).send({
    ...first,
    value: 'degraded',
    state: 'critical',
    sequence: 2,
    checkedAt: new Date(Date.now() + 1_000).toISOString(),
  });
  await flushLogs();
  expect(eventTypes()).toContain('operational.health.changed');
  await prisma.healthMetric.deleteMany({ where: { id: healthId } });
});
