import request from 'supertest';
import { loadConfig } from '../config';
import { connectDatabase, disconnectDatabase, prisma } from '../db';
import { createRuntimeApp } from '../runtime-app';
import { resetSyntheticData, seedSyntheticData } from '../seed-service';

const password = 'Runtime-Guard-Test-Password-2026!';
const serviceToken = 'Runtime-Guard-Ingestion-Token-2026!';
const eventId = 'TEST-RUNTIME-GUARD-0001';
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
  SEED_DEMO_PASSWORD: password,
  INGESTION_SERVICE_TOKEN: serviceToken,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://ptc_app:ptc_local_change_me@127.0.0.1:5432/ptc_bale_test?schema=public',
  ALLOWED_ORIGINS: 'http://localhost',
});
const app = createRuntimeApp(config);

const eventPayload = {
  id: eventId,
  cameraId: 'CAM-03',
  cameraName: 'Camera 3',
  zone: 'Inspection Zone 3',
  timestamp: '2026-07-31T10:30:00.000Z',
  outcome: 'completed',
  reason: 'Inspection sequence completed',
  confidence: 91,
  summary: 'Runtime replay-integrity fixture.',
  modelVersion: 'model-runtime-test-v1',
  ruleVersion: 'rules-runtime-test-v1',
  configVersion: 'config-runtime-test-v1',
  edgeVersion: 'edge-runtime-test-v1',
  schemaVersion: 1,
  source: 'edge',
  steps: [
    { label: 'Bale entered zone', state: 'complete', time: '00:00' },
    { label: 'Inspection completed', state: 'complete', time: '00:08' },
  ],
};

async function loginAdmin() {
  const agent = request.agent(app);
  const login = await agent
    .post('/api/auth/login')
    .set('Origin', 'http://localhost')
    .send({ username: 'admin', password });
  expect(login.status).toBe(200);
  return agent;
}

beforeAll(async () => {
  await connectDatabase();
  await prisma.inspectionEvent.deleteMany({ where: { id: eventId } });
  await seedSyntheticData(config, true);
});

afterAll(async () => {
  await prisma.inspectionEvent.deleteMany({ where: { id: eventId } });
  await resetSyntheticData(config);
  await disconnectDatabase();
});

it('rejects a reused event ID when the payload differs', async () => {
  const accepted = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(eventPayload);
  expect(accepted.status).toBe(202);

  const exactReplay = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(eventPayload);
  expect(exactReplay.status).toBe(200);
  expect(exactReplay.body.status).toBe('duplicate');

  const conflict = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send({ ...eventPayload, confidence: 17 });
  expect(conflict.status).toBe(409);
  expect(conflict.body.code).toBe('EVENT_ID_REUSE_CONFLICT');

  const persisted = await prisma.inspectionEvent.findUnique({ where: { id: eventId } });
  expect(persisted?.confidence).toBe(91);
});

it('rejects cookie-authenticated mutations from an unapproved origin', async () => {
  const admin = await loginAdmin();
  const response = await admin
    .post('/api/operations/evidence/retention')
    .set('Origin', 'https://unapproved.example')
    .send({ olderThanDays: 30, dryRun: true });
  expect(response.status).toBe(403);
  expect(response.body.code).toBe('ORIGIN_NOT_ALLOWED');
});
