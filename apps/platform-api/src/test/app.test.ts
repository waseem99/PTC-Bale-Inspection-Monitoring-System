import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../app';
import { loadConfig } from '../config';
import { AuditModel } from '../models';
import { seedSyntheticData } from '../seed-service';

let mongo: MongoMemoryServer | undefined;
const password = 'A-Strong-Test-Password-2026!';
const externalMongoUri = process.env.MONGODB_URI;
const config = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  COOKIE_SECURE: 'false',
  SEED_DEMO_PASSWORD: password,
  MONGODB_URI: externalMongoUri ?? 'mongodb://placeholder/test',
  ALLOWED_ORIGINS: 'http://localhost',
});
const app = createApp(config);

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
  if (externalMongoUri) {
    await mongoose.connect(externalMongoUri);
  } else {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri('ptc_test'));
  }
  await mongoose.connection.db?.dropDatabase();
  await seedSyntheticData(config, true);
});

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

it('reports health and readiness', async () => {
  expect((await request(app).get('/healthz')).status).toBe(200);
  expect((await request(app).get('/readyz')).status).toBe(200);
});

it('rejects invalid credentials and restores a cookie session', async () => {
  const invalid = await request(app)
    .post('/api/auth/login')
    .set('Origin', 'http://localhost')
    .send({ username: 'viewer', password: 'wrong' });
  expect(invalid.status).toBe(401);

  const agent = await login('viewer');
  const me = await agent.get('/api/auth/me');
  expect(me.status).toBe(200);
  expect(me.body.user.role).toBe('viewer');
  expect(me.body.token).toBe('');
});

it('serves deterministic summary, cameras, health and paginated events', async () => {
  const agent = await login('viewer');
  const summary = await agent.get('/api/dashboard/summary');
  expect(summary.status).toBe(200);
  expect(summary.body.total).toBe(257);
  expect((await agent.get('/api/cameras')).body).toHaveLength(4);
  expect((await agent.get('/api/health')).body).toHaveLength(6);

  const events = await agent.get(
    '/api/events?page=2&pageSize=20&outcome=completed&sortBy=timestamp&sortDirection=desc',
  );
  expect(events.status).toBe(200);
  expect(events.body.page).toBe(2);
  expect(events.body.items.length).toBeLessThanOrEqual(20);
  expect(events.body.items.every((item: { outcome: string }) => item.outcome === 'completed')).toBe(true);
});

it('validates date ranges and rejects unauthenticated access', async () => {
  expect((await request(app).get('/api/events?page=1&pageSize=20')).status).toBe(401);
  const agent = await login('viewer');
  const invalidRange = await agent.get('/api/events?page=1&pageSize=20&from=2026-07-25&to=2026-07-20');
  expect(invalidRange.status).toBe(400);
  expect(invalidRange.body.code).toBe('INVALID_DATE_RANGE');
});

it('enforces roles and persists a versioned review with an audit record', async () => {
  const viewer = await login('viewer');
  const supervisor = await login('supervisor');
  const eventResponse = await supervisor.get('/api/events/EVT-2407-0257');
  expect(eventResponse.status).toBe(200);

  const input = {
    reviewStatus: 'confirmed',
    remarks: 'Validated by the integration test.',
    expectedVersion: eventResponse.body.version,
  };
  const forbidden = await viewer
    .patch('/api/events/EVT-2407-0257/review')
    .set('Origin', 'http://localhost')
    .send(input);
  expect(forbidden.status).toBe(403);

  const updated = await supervisor
    .patch('/api/events/EVT-2407-0257/review')
    .set('Origin', 'http://localhost')
    .send(input);
  expect(updated.status).toBe(200);
  expect(updated.body.version).toBe(input.expectedVersion + 1);
  expect(updated.body.remarks).toBe(input.remarks);
  expect(await AuditModel.countDocuments({ targetId: 'EVT-2407-0257' })).toBe(1);

  const conflict = await supervisor
    .patch('/api/events/EVT-2407-0257/review')
    .set('Origin', 'http://localhost')
    .send(input);
  expect(conflict.status).toBe(409);
  expect(conflict.body.code).toBe('VERSION_CONFLICT');

  const reloaded = await supervisor.get('/api/events/EVT-2407-0257');
  expect(reloaded.body.remarks).toBe(input.remarks);
});

it('exports filtered CSV without evidence content', async () => {
  const agent = await login('supervisor');
  const response = await agent
    .post('/api/exports/events')
    .set('Origin', 'http://localhost')
    .send({ format: 'csv', outcome: 'missed' });
  expect(response.status).toBe(200);
  expect(response.headers['content-type']).toContain('text/csv');
  expect(response.text).toContain('Event ID');
  expect(response.text).not.toContain('rtsp://');
});

it('logs out and invalidates the session', async () => {
  const agent = await login('viewer');
  expect((await agent.post('/api/auth/logout').set('Origin', 'http://localhost')).status).toBe(204);
  expect((await agent.get('/api/auth/me')).status).toBe(401);
});
