import request from 'supertest';
import { loadConfig } from '../config';
import { connectDatabase, disconnectDatabase, prisma } from '../db';
import { createRuntimeApp } from '../runtime-app';
import { resetSyntheticData, seedSyntheticData } from '../seed-service';

const password = 'Camera-Contract-Test-Password-2026!';
const serviceToken = 'Camera-Contract-Ingestion-Token-2026!';
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

async function login(username: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').set('Origin', 'http://localhost').send({ username, password });
  expect(response.status).toBe(200);
  return agent;
}

beforeAll(async () => {
  await connectDatabase();
  await seedSyntheticData(config, true);
});

afterAll(async () => {
  await resetSyntheticData(config);
  await disconnectDatabase();
});

it('returns safe camera configuration without credentials or stream addresses', async () => {
  const viewer = await login('viewer');
  const response = await viewer.get('/api/camera-config');
  expect(response.status).toBe(200);
  expect(response.body.schemaVersion).toBe('camera-contract-v1');
  expect(response.body.cameras).toHaveLength(4);
  const serialized = JSON.stringify(response.body);
  expect(serialized).not.toMatch(/rtsp|password|privateIp|streamUrl/i);
});

it('accepts ordered machine status and rejects stale or conflicting sequences', async () => {
  const payload = {
    status: 'online',
    aiStatus: 'ready',
    lastFrameAt: '2026-07-31T12:00:00.000Z',
    fps: 12.5,
    streamQuality: '1920x1080',
    configVersion: 'camera-config-test-v2',
    sequence: 10,
    source: 'edge',
  };
  const accepted = await request(app)
    .post('/api/ingest/cameras/CAM-01/status')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(payload);
  expect(accepted.status).toBe(202);
  expect(accepted.body.camera.statusSequence).toBe(10);

  const duplicate = await request(app)
    .post('/api/ingest/cameras/CAM-01/status')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(payload);
  expect(duplicate.status).toBe(200);
  expect(duplicate.body.status).toBe('duplicate');

  const conflict = await request(app)
    .post('/api/ingest/cameras/CAM-01/status')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send({ ...payload, fps: 1 });
  expect(conflict.status).toBe(409);
  expect(conflict.body.code).toBe('CAMERA_SEQUENCE_CONFLICT');

  const stale = await request(app)
    .post('/api/ingest/cameras/CAM-01/status')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send({ ...payload, sequence: 9 });
  expect(stale.status).toBe(200);
  expect(stale.body.status).toBe('stale');
});

it('allows only administrators to update safe camera configuration and audits the change', async () => {
  const viewer = await login('viewer');
  const forbidden = await viewer
    .patch('/api/camera-config/CAM-02')
    .set('Origin', 'http://localhost')
    .send({ orientation: 'landscape' });
  expect(forbidden.status).toBe(403);

  const admin = await login('admin');
  const updated = await admin
    .patch('/api/camera-config/CAM-02')
    .set('Origin', 'http://localhost')
    .send({ enabled: true, orientation: 'landscape', expectedResolution: '1920x1080', expectedFps: 15, configVersion: 'camera-config-test-v3' });
  expect(updated.status).toBe(200);
  expect(updated.body.camera.orientation).toBe('landscape');
  expect(updated.body.camera.expectedResolution).toBe('1920x1080');

  const audit = await prisma.auditLog.findFirst({ where: { action: 'camera.configuration.updated', targetId: 'CAM-02' }, orderBy: { occurredAt: 'desc' } });
  expect(audit).not.toBeNull();
  expect(JSON.stringify(audit?.after)).not.toMatch(/rtsp|password|privateIp|streamUrl/i);
});
