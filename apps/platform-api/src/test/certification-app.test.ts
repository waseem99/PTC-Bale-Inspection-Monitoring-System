import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { loadConfig } from '../config';
import { connectDatabase, disconnectDatabase, prisma } from '../db';
import { createRuntimeApp } from '../runtime-app';
import { resetSyntheticData, seedSyntheticData } from '../seed-service';

const password = 'Certification-Test-Password-2026!';
const serviceToken = 'Certification-Ingestion-Token-2026!';
const eventId = 'TEST-CERTIFICATION-EVIDENCE-0001';
const evidenceId = 'EVID-TEST-CERTIFICATION-0001';
const pendingEventId = 'TEST-CERTIFICATION-PENDING-0002';
const pendingEvidenceId = 'EVID-TEST-CERTIFICATION-PENDING-0002';
const evidenceRoot = mkdtempSync(path.join(tmpdir(), 'ptc-evidence-'));
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
  SEED_DEMO_PASSWORD: password,
  INGESTION_SERVICE_TOKEN: serviceToken,
  EVIDENCE_ROOT: evidenceRoot,
  MAX_EVIDENCE_BYTES: '1048576',
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

function eventPayload(id: string, timestamp: string, evidence?: Record<string, unknown>) {
  return {
    id,
    cameraId: 'CAM-01',
    cameraName: 'Camera 1',
    zone: 'Inspection Zone 1',
    timestamp,
    outcome: 'completed',
    reason: 'COMPLETED',
    confidence: 95,
    summary: 'Certification evidence fixture.',
    modelVersion: 'model-test-v1',
    ruleVersion: 'rules-test-v1',
    configVersion: 'config-test-v1',
    edgeVersion: 'edge-test-v1',
    schemaVersion: 1,
    source: 'edge',
    steps: [{ label: 'Inspection completed', state: 'complete', time: '00:08' }],
    ...(evidence ? { evidence } : {}),
  };
}

beforeAll(async () => {
  await connectDatabase();
  await prisma.inspectionEvent.deleteMany({ where: { id: { in: [eventId, pendingEventId] } } });
  await seedSyntheticData(config, true);

  const accepted = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(eventPayload(eventId, '2026-07-31T11:00:00.000Z'));
  expect(accepted.status).toBe(202);

  const pending = await request(app)
    .post('/api/ingest/events')
    .set('Authorization', `Bearer ${serviceToken}`)
    .send(eventPayload(pendingEventId, '2026-07-31T11:01:00.000Z', {
      id: pendingEvidenceId,
      state: 'pending',
      type: 'snapshot',
      mimeType: 'image/png',
      storageKey: `pending/${pendingEvidenceId}.png`,
    }));
  expect(pending.status).toBe(202);
});

afterAll(async () => {
  await prisma.inspectionEvent.deleteMany({ where: { id: { in: [eventId, pendingEventId] } } });
  await resetSyntheticData(config);
  await disconnectDatabase();
  rmSync(evidenceRoot, { recursive: true, force: true });
});

it('atomically uploads evidence and supports authenticated byte ranges', async () => {
  const bytes = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const uploaded = await request(app)
    .post(`/api/ingest/evidence/${eventId}`)
    .set('Authorization', `Bearer ${serviceToken}`)
    .set('Content-Type', 'image/png')
    .set('X-Evidence-ID', evidenceId)
    .set('X-Checksum-SHA256', checksum)
    .send(bytes);
  expect(uploaded.status).toBe(201);
  expect(uploaded.body.status).toBe('available');

  const duplicate = await request(app)
    .post(`/api/ingest/evidence/${eventId}`)
    .set('Authorization', `Bearer ${serviceToken}`)
    .set('Content-Type', 'image/png')
    .set('X-Evidence-ID', evidenceId)
    .set('X-Checksum-SHA256', checksum)
    .send(bytes);
  expect(duplicate.status).toBe(200);
  expect(duplicate.body.status).toBe('duplicate');

  const viewer = await login('viewer');
  const metadata = await viewer.get(`/api/events/${eventId}/evidence`);
  expect(metadata.status).toBe(200);
  expect(metadata.body.state).toBe('available');
  expect(metadata.body.contentUrl).not.toContain(evidenceRoot);

  const content = await viewer.get(metadata.body.contentUrl).set('Range', 'bytes=0-3');
  expect(content.status).toBe(206);
  expect(content.headers['content-range']).toBe(`bytes 0-3/${bytes.length}`);
  expect(Buffer.from(content.body).equals(bytes.subarray(0, 4))).toBe(true);
});

it('finalizes matching pending metadata when the evidence bytes arrive', async () => {
  const bytes = Buffer.from('ffd8ffe000104a464946000101000001', 'hex');
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const uploaded = await request(app)
    .post(`/api/ingest/evidence/${pendingEventId}`)
    .set('Authorization', `Bearer ${serviceToken}`)
    .set('Content-Type', 'image/jpeg')
    .set('X-Evidence-ID', pendingEvidenceId)
    .set('X-Checksum-SHA256', checksum)
    .send(bytes);
  expect(uploaded.status).toBe(201);
  expect(uploaded.body.finalizedPendingMetadata).toBe(true);

  const stored = await prisma.evidenceMetadata.findUnique({ where: { id: pendingEvidenceId } });
  expect(stored?.state).toBe('available');
  expect(stored?.checksum).toBe(checksum);
  expect(stored?.storageKey).toMatch(/\.jpg$/);
  expect((await prisma.inspectionEvent.findUnique({ where: { id: pendingEventId } }))?.evidenceAvailable).toBe(true);
});

it('rejects checksum mismatch and keeps pending evidence out of retention', async () => {
  const mismatch = await request(app)
    .post(`/api/ingest/evidence/${eventId}`)
    .set('Authorization', `Bearer ${serviceToken}`)
    .set('Content-Type', 'image/png')
    .set('X-Evidence-ID', 'EVID-MISMATCH')
    .set('X-Checksum-SHA256', '0'.repeat(64))
    .send(Buffer.from('not-the-expected-bytes'));
  expect([409, 422]).toContain(mismatch.status);

  await prisma.evidenceMetadata.update({ where: { id: evidenceId }, data: { state: 'pending', createdAt: new Date('2020-01-01T00:00:00Z') } });
  const admin = await login('admin');
  const retention = await admin
    .post('/api/operations/evidence/retention')
    .set('Origin', 'http://localhost')
    .send({ olderThanDays: 1, dryRun: true });
  expect(retention.status).toBe(200);
  expect(retention.body.candidateIds).not.toContain(evidenceId);
  await prisma.evidenceMetadata.update({ where: { id: evidenceId }, data: { state: 'available' } });
});

it('reports evidence consistency and exposes the approved reason catalog', async () => {
  const supervisor = await login('supervisor');
  const consistency = await supervisor.get('/api/operations/evidence/consistency');
  expect(consistency.status).toBe(200);
  expect(consistency.body.missingRecordIds).not.toContain(evidenceId);
  expect(consistency.body.missingRecordIds).not.toContain(pendingEvidenceId);
  expect(consistency.body.unsafeRecordIds).toEqual([]);

  const catalog = await supervisor.get('/api/catalog/reason-codes');
  expect(catalog.status).toBe(200);
  expect(catalog.body.codes.some((item: { code: string }) => item.code === 'CAMERA_FAILURE')).toBe(true);
});
