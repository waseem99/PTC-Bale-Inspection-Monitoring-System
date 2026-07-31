import request from 'supertest';
import { loadConfig } from '../config';
import { connectDatabase, disconnectDatabase, prisma } from '../db';
import { createRuntimeApp } from '../runtime-app';
import { resetSyntheticData, seedSyntheticData } from '../seed-service';

const password = 'A-Strong-Test-Password-2026!';
const serviceToken = 'A-Separate-Machine-Ingestion-Token-2026!';
const testEventId = 'TEST-INGEST-IDEMPOTENT-0001';
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
  SEED_DEMO_PASSWORD: password,
  INGESTION_SERVICE_TOKEN: serviceToken,
  SIMULATOR_ENABLED: 'true',
  BUILD_VERSION: 'production-test-v1',
  BUILD_COMMIT: 'test-commit-sha',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://ptc_app:ptc_local_change_me@127.0.0.1:5432/ptc_bale_test?schema=public',
  ALLOWED_ORIGINS: 'http://localhost',
});
const app = createRuntimeApp(config);

async function removeProductionTestRecords(): Promise<void> {
  await prisma.inspectionEvent.deleteMany({
    where: {
      OR: [
        { id: testEventId },
        { id: { startsWith: 'SIM-CAM-' } },
      ],
    },
  });
  await prisma.healthMetric.deleteMany({ where: { id: 'TEST-EDGE-HEALTH' } });
}

async function login(username: string) {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost')
    .send({ username, password });
  expect(response.status).toBe(200);
  return agent;
}

beforeAll(async () => {
  await connectDatabase();
  await removeProductionTestRecords();
  await seedSyntheticData(config, true);
});

afterAll(async () => {
  await removeProductionTestRecords();
  await resetSyntheticData(config);
  await disconnectDatabase();
});

it('rejects missing and invalid machine credentials', async () => {
  const payload = {
    id: 'TEST-INGEST-UNAUTHENTICATED',
    cameraId: 'CAM-01',
    cameraName: 'Camera 1',
    zone: 'Inspection Zone 1',
    timestamp: new Date().toISOString(),
    outcome: 'completed',
    reason: 'Test event',
    confidence: 95,
    summary: 'Test event',
    modelVersion: 'model-test',
    ruleVersion: 'rules-test',
    configVersion: 'config-test',
    edgeVersion: 'edge-test',
    schemaVersion: 1,
    source: 'edge',
    steps: [{ label: 'Inspection complete', state: 'complete' }],
  };

  const missing = await request(app).post('/api/ingest/events').send(payload);
  expect(missing.status).toBe(401);
  expect(missing.body.code).toBe('INVALID_SERVICE_CREDENTIAL');

  const invalid = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', 'Bearer incorrect-token-value')
    .send(payload);
  expect(invalid.status).toBe(401);
});

it('accepts an event exactly once and returns a deterministic duplicate acknowledgement', async () => {
  const payload = {
    id: testEventId,
    cameraId: 'CAM-01',
    cameraName: 'Camera 1',
    zone: 'Inspection Zone 1',
    timestamp: '2026-07-31T10:00:00.000Z',
    outcome: 'incomplete',
    reason: 'Required inspection step was incomplete',
    confidence: 88,
    summary: 'Machine-ingestion idempotency test.',
    modelVersion: 'model-test-v1',
    ruleVersion: 'rules-test-v1',
    configVersion: 'config-test-v1',
    edgeVersion: 'edge-test-v1',
    schemaVersion: 1,
    source: 'edge',
    steps: [
      { label: 'Bale entered zone', state: 'complete', time: '00:00' },
      { label: 'Inspection completed', state: 'failed', time: '00:05' },
    ],
    evidence: {
      id: `EVID-${testEventId}`,
      state: 'pending',
      type: 'snapshot',
      mimeType: 'image/jpeg',
      storageKey: `pending/${testEventId}.jpg`,
    },
  };

  const first = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(payload);
  expect(first.status).toBe(202);
  expect(first.body.status).toBe('accepted');

  const duplicate = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(payload);
  expect(duplicate.status).toBe(200);
  expect(duplicate.body.status).toBe('duplicate');
  expect(await prisma.inspectionEvent.count({ where: { id: testEventId } })).toBe(1);
  expect(await prisma.evidenceMetadata.count({ where: { eventId: testEventId } })).toBe(1);
});

it('generates deterministic simulator events and synthetic protected evidence', async () => {
  const generated = await request(app)
    .post('/api/ingest/simulator/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send({ cameraId: 'CAM-02', scenario: 'unresolved', sequence: 41 });
  expect(generated.status).toBe(202);
  expect(generated.body.warning).toContain('not actual AI performance');

  const agent = await login('viewer');
  const eventId = 'SIM-CAM-02-unresolved-000041';
  const metadata = await agent.get(`/api/events/${eventId}/evidence`);
  expect(metadata.status).toBe(200);
  expect(metadata.body.source).toBe('simulator');
  expect(metadata.body.contentUrl).toContain('/api/evidence/');

  const content = await agent.get(metadata.body.contentUrl);
  expect(content.status).toBe(200);
  expect(content.headers['content-type']).toContain('image/svg+xml');
  expect(content.text).toContain('Synthetic PTC Evidence Fixture');
  expect(content.text).not.toContain('rtsp://');
});

it('exposes release identity and reconciled summary/PDF reports to authenticated users', async () => {
  const agent = await login('supervisor');
  const release = await agent.get('/api/system/release');
  expect(release.status).toBe(200);
  expect(release.body.version).toBe('production-test-v1');
  expect(release.body.commit).toBe('test-commit-sha');
  expect(release.body.ingestionConfigured).toBe(true);

  const summary = await agent.get('/api/reports/summary?outcome=incomplete');
  expect(summary.status).toBe(200);
  expect(summary.body.total).toBe(summary.body.outcomes.incomplete);

  const pdf = await agent.get('/api/reports/pdf?outcome=incomplete');
  expect(pdf.status).toBe(200);
  expect(pdf.headers['content-type']).toContain('application/pdf');
  expect(Buffer.isBuffer(pdf.body)).toBe(true);
  expect(pdf.body.subarray(0, 4).toString()).toBe('%PDF');
});

it('supports health sequence ordering and admin-only retention dry runs', async () => {
  const payload = {
    id: 'TEST-EDGE-HEALTH',
    label: 'Edge ingestion service',
    value: 'ready',
    detail: 'Machine health integration test.',
    state: 'healthy',
    checkedAt: '2026-07-31T10:00:00.000Z',
    source: 'simulator',
    sequence: 10,
  };
  const accepted = await request(app)
    .post('/api/ingest/health')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(payload);
  expect([200, 202]).toContain(accepted.status);

  const stale = await request(app)
    .post('/api/ingest/health')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send({ ...payload, sequence: 9, value: 'stale' });
  expect(stale.status).toBe(200);
  expect(stale.body.status).toBe('stale');

  const viewer = await login('viewer');
  const forbidden = await viewer
    .post('/api/operations/evidence/retention')
    .set('Origin', 'http://localhost')
    .send({ olderThanDays: 30, dryRun: true });
  expect(forbidden.status).toBe(403);

  const admin = await login('admin');
  const dryRun = await admin
    .post('/api/operations/evidence/retention')
    .set('Origin', 'http://localhost')
    .send({ olderThanDays: 30, dryRun: true });
  expect(dryRun.status).toBe(200);
  expect(dryRun.body.dryRun).toBe(true);
  expect(Array.isArray(dryRun.body.candidateIds)).toBe(true);
});
