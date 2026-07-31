import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AppConfig } from './config';
import { prisma } from './db';
import { AppError, asyncHandler, errorHandler } from './errors';
import { authenticate, authContext, hashToken, requireRoles } from './security';

type RealtimeMessage = {
  id: string;
  type: 'inspection-event' | 'health-update' | 'evidence-update' | 'system';
  occurredAt: string;
  payload: Record<string, unknown>;
};

type Subscriber = (message: RealtimeMessage) => void;

const subscribers = new Set<Subscriber>();

const outcomeSchema = z.enum(['completed', 'missed', 'incomplete', 'unresolved']);
const reviewStatusSchema = z.enum(['unreviewed', 'confirmed', 'dismissed']);
const evidenceStateSchema = z.enum([
  'available',
  'unavailable',
  'pending',
  'missing',
  'failed',
  'quarantined',
  'deleted',
]);

const ingestionEventSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/),
  cameraId: z.string().trim().min(1).max(64),
  cameraName: z.string().trim().min(1).max(160),
  zone: z.string().trim().min(1).max(160),
  timestamp: z.string().datetime({ offset: true }),
  outcome: outcomeSchema,
  reason: z.string().trim().min(1).max(2000),
  confidence: z.number().int().min(0).max(100),
  summary: z.string().trim().min(1).max(4000),
  modelVersion: z.string().trim().min(1).max(64),
  ruleVersion: z.string().trim().min(1).max(64),
  configVersion: z.string().trim().min(1).max(64),
  edgeVersion: z.string().trim().min(1).max(64),
  schemaVersion: z.number().int().min(1).max(100),
  source: z.enum(['edge', 'simulator']),
  steps: z.array(z.object({
    label: z.string().trim().min(1).max(200),
    state: z.enum(['complete', 'failed', 'unknown']),
    time: z.string().trim().max(32).optional(),
  }).strict()).min(1).max(32),
  evidence: z.object({
    id: z.string().trim().min(1).max(96).regex(/^[A-Za-z0-9._:-]+$/),
    state: evidenceStateSchema,
    type: z.enum(['snapshot', 'clip', 'none']),
    mimeType: z.string().trim().min(1).max(128).optional(),
    sizeBytes: z.number().int().min(0).optional(),
    durationMs: z.number().int().min(0).max(10 * 60 * 1000).optional(),
    checksum: z.string().trim().min(8).max(160).optional(),
    storageKey: z.string().trim().min(1).max(512).optional(),
  }).strict().optional(),
}).strict();

const healthIngestionSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/),
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().min(1).max(160),
  detail: z.string().trim().min(1).max(4000),
  state: z.enum(['healthy', 'warning', 'critical', 'neutral']),
  checkedAt: z.string().datetime({ offset: true }),
  source: z.string().trim().min(1).max(64),
  sequence: z.number().int().min(0).max(2_147_483_647),
}).strict();

const reportFilterSchema = z.object({
  cameraId: z.string().trim().min(1).max(100).optional(),
  outcome: outcomeSchema.optional(),
  reviewStatus: reviewStatusSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

const retentionSchema = z.object({
  olderThanDays: z.number().int().min(1).max(3650),
  dryRun: z.boolean().default(true),
}).strict();

const simulatorSchema = z.object({
  cameraId: z.string().trim().min(1).max(64),
  scenario: z.enum(['completed', 'missed', 'incomplete', 'unresolved']),
  sequence: z.number().int().min(1).max(1_000_000),
}).strict();

function productionHeaders(request: Request, response: Response, next: NextFunction): void {
  const supplied = request.header('X-Correlation-ID');
  const correlationId = supplied && supplied.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(supplied)
    ? supplied
    : randomUUID();
  response.locals.correlationId = correlationId;
  response.setHeader('X-Correlation-ID', correlationId);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Cache-Control', 'no-store');
  next();
}

function serviceAuthentication(config: AppConfig) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const configured = config.ingestionServiceToken;
    if (!configured) {
      next(new AppError(503, 'INGESTION_NOT_CONFIGURED', 'Machine ingestion is not configured.'));
      return;
    }
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const expected = Buffer.from(hashToken(configured), 'hex');
    const actual = Buffer.from(hashToken(token), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      next(new AppError(401, 'INVALID_SERVICE_CREDENTIAL', 'The machine credential is invalid.'));
      return;
    }
    next();
  };
}

function publish(type: RealtimeMessage['type'], payload: Record<string, unknown>): void {
  const message: RealtimeMessage = {
    id: randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    payload,
  };
  for (const subscriber of subscribers) subscriber(message);
}

function openRealtimeStream(response: Response): void {
  response.status(200);
  response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders?.();

  const send: Subscriber = (message) => {
    response.write(`id: ${message.id}\n`);
    response.write(`event: ${message.type}\n`);
    response.write(`data: ${JSON.stringify(message)}\n\n`);
  };
  subscribers.add(send);
  send({
    id: randomUUID(),
    type: 'system',
    occurredAt: new Date().toISOString(),
    payload: { state: 'connected' },
  });

  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15_000);
  response.on('close', () => {
    clearInterval(heartbeat);
    subscribers.delete(send);
  });
}

function dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  if (from && to && from > to) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'The start date must not be after the end date.');
  }
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
  };
}

function reportWhere(input: z.infer<typeof reportFilterSchema>): Prisma.InspectionEventWhereInput {
  const timestamp = dateFilter(input.from, input.to);
  return {
    ...(input.cameraId ? { cameraId: input.cameraId } : {}),
    ...(input.outcome ? { outcome: input.outcome } : {}),
    ...(input.reviewStatus ? { reviewStatus: input.reviewStatus } : {}),
    ...(timestamp ? { timestamp } : {}),
  };
}

function safeStorageKey(storageKey: string): boolean {
  if (storageKey.startsWith('synthetic://')) return /^synthetic:\/\/[A-Za-z0-9._:-]+\.svg$/.test(storageKey);
  if (path.isAbsolute(storageKey) || storageKey.includes('\\')) return false;
  return storageKey.split('/').every((segment) => segment !== '..' && segment !== '');
}

function syntheticSvg(eventId: string): Buffer {
  const safeId = eventId.replace(/[^A-Za-z0-9._:-]/g, '_');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f2f4f7"/>
  <rect x="80" y="80" width="1120" height="560" rx="28" fill="#ffffff" stroke="#1f2937" stroke-width="4"/>
  <text x="640" y="290" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" fill="#111827">Synthetic PTC Evidence Fixture</text>
  <text x="640" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#4b5563">Event ${safeId}</text>
  <text x="640" y="455" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">No factory footage or person imagery</text>
</svg>`;
  return Buffer.from(svg, 'utf8');
}

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildPdf(lines: string[]): Buffer {
  const limited = lines.slice(0, 48);
  const commands = ['BT', '/F1 10 Tf', '50 790 Td'];
  limited.forEach((line, index) => {
    if (index > 0) commands.push('0 -15 Td');
    commands.push(`(${pdfEscape(line)}) Tj`);
  });
  commands.push('ET');
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(output, 'utf8');
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(output, 'utf8');
  output += `xref\n0 ${objects.length + 1}\n`;
  output += '0000000000 65535 f \n';
  for (let index = 1; index <= objects.length; index += 1) {
    output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output, 'utf8');
}

async function persistEvent(input: z.infer<typeof ingestionEventSchema>) {
  const acknowledgedAt = new Date();
  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.inspectionEvent.findUnique({ where: { id: input.id } });
      if (existing) {
        return { status: 'duplicate' as const, eventId: existing.id, acknowledgedAt: existing.acknowledgedAt ?? acknowledgedAt };
      }
      const camera = await transaction.camera.findUnique({ where: { id: input.cameraId } });
      if (!camera) throw new AppError(422, 'UNKNOWN_CAMERA', 'The event references an unknown camera.');

      const evidence = input.evidence;
      if (evidence?.storageKey && !safeStorageKey(evidence.storageKey)) {
        throw new AppError(400, 'INVALID_STORAGE_KEY', 'The evidence storage key is unsafe.');
      }

      const created = await transaction.inspectionEvent.create({
        data: {
          id: input.id,
          cameraId: input.cameraId,
          cameraName: input.cameraName,
          zone: input.zone,
          timestamp: new Date(input.timestamp),
          outcome: input.outcome,
          reason: input.reason,
          confidence: input.confidence,
          reviewStatus: 'unreviewed',
          summary: input.summary,
          evidenceAvailable: evidence?.state === 'available',
          modelVersion: input.modelVersion,
          ruleVersion: input.ruleVersion,
          configVersion: input.configVersion,
          edgeVersion: input.edgeVersion,
          source: input.source,
          acknowledgedAt,
          schemaVersion: input.schemaVersion,
          dataset: input.source === 'simulator' ? 'software-simulator' : 'ptc-operational',
          steps: {
            create: input.steps.map((step, sequence) => ({
              sequence,
              label: step.label,
              state: step.state,
              ...(step.time ? { time: step.time } : {}),
            })),
          },
          ...(evidence ? {
            evidence: {
              create: {
                id: evidence.id,
                state: evidence.state,
                type: evidence.type,
                ...(evidence.mimeType ? { mimeType: evidence.mimeType } : {}),
                ...(evidence.sizeBytes !== undefined ? { sizeBytes: evidence.sizeBytes } : {}),
                ...(evidence.durationMs !== undefined ? { durationMs: evidence.durationMs } : {}),
                ...(evidence.checksum ? { checksum: evidence.checksum } : {}),
                ...(evidence.storageKey ? { storageKey: evidence.storageKey } : {}),
                source: input.source,
                dataset: input.source === 'simulator' ? 'software-simulator' : 'ptc-operational',
              },
            },
          } : {}),
        },
      });
      await transaction.camera.update({
        where: { id: input.cameraId },
        data: {
          lastFrameAt: new Date(input.timestamp),
          todayEvents: { increment: 1 },
          status: 'online',
          aiStatus: input.source === 'simulator' ? 'simulated' : 'ready',
          configVersion: input.configVersion,
        },
      });
      return { status: 'accepted' as const, eventId: created.id, acknowledgedAt };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.inspectionEvent.findUnique({ where: { id: input.id } });
      if (existing) return { status: 'duplicate' as const, eventId: existing.id, acknowledgedAt: existing.acknowledgedAt ?? acknowledgedAt };
    }
    throw error;
  }
}

function machineRouter(config: AppConfig) {
  const router = express.Router();
  router.use(productionHeaders);
  router.use(express.json({ limit: '512kb', strict: true }));
  router.use(serviceAuthentication(config));

  router.post('/events', asyncHandler(async (request, response) => {
    const input = ingestionEventSchema.parse(request.body);
    const result = await persistEvent(input);
    if (result.status === 'accepted') {
      publish('inspection-event', { eventId: result.eventId, source: input.source, outcome: input.outcome });
    }
    response.status(result.status === 'accepted' ? 202 : 200).json({
      ...result,
      acknowledgedAt: result.acknowledgedAt.toISOString(),
      schemaVersion: input.schemaVersion,
    });
  }));

  router.post('/health', asyncHandler(async (request, response) => {
    const input = healthIngestionSchema.parse(request.body);
    const existing = await prisma.healthMetric.findUnique({ where: { id: input.id } });
    if (existing && existing.sequence > input.sequence) {
      response.status(200).json({ status: 'stale', id: input.id, sequence: existing.sequence });
      return;
    }
    const metric = await prisma.healthMetric.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        label: input.label,
        value: input.value,
        detail: input.detail,
        state: input.state,
        checkedAt: new Date(input.checkedAt),
        source: input.source,
        sequence: input.sequence,
        dataset: input.source === 'simulator' ? 'software-simulator' : 'ptc-operational',
      },
      update: {
        label: input.label,
        value: input.value,
        detail: input.detail,
        state: input.state,
        checkedAt: new Date(input.checkedAt),
        source: input.source,
        sequence: input.sequence,
      },
    });
    publish('health-update', { id: metric.id, state: metric.state, sequence: metric.sequence });
    response.status(existing ? 200 : 202).json({ status: existing ? 'updated' : 'accepted', id: metric.id, sequence: metric.sequence });
  }));

  router.post('/simulator/events', asyncHandler(async (request, response) => {
    if (!config.simulatorEnabled) throw new AppError(404, 'SIMULATOR_DISABLED', 'The software simulator is disabled.');
    const input = simulatorSchema.parse(request.body);
    const camera = await prisma.camera.findUnique({ where: { id: input.cameraId } });
    if (!camera) throw new AppError(422, 'UNKNOWN_CAMERA', 'The simulator references an unknown camera.');
    const eventId = `SIM-${input.cameraId}-${input.scenario}-${String(input.sequence).padStart(6, '0')}`;
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, 0, input.sequence % 60)).toISOString();
    const result = await persistEvent({
      id: eventId,
      cameraId: camera.id,
      cameraName: camera.name,
      zone: camera.zone,
      timestamp,
      outcome: input.scenario,
      reason: input.scenario === 'completed' ? 'Synthetic completed workflow' : `Synthetic ${input.scenario} workflow`,
      confidence: input.scenario === 'unresolved' ? 40 : 92,
      summary: 'Deterministic software simulator event. This is not actual AI inference.',
      modelVersion: 'simulator-v1',
      ruleVersion: 'simulator-rules-v1',
      configVersion: camera.configVersion,
      edgeVersion: 'simulator-edge-v1',
      schemaVersion: 1,
      source: 'simulator',
      steps: [
        { label: 'Bale entered inspection zone', state: 'complete', time: '00:00' },
        { label: 'Inspection started', state: input.scenario === 'missed' ? 'failed' : 'complete', time: '00:02' },
        { label: 'Opening/checking observed', state: input.scenario === 'completed' ? 'complete' : input.scenario === 'unresolved' ? 'unknown' : 'failed', time: '00:05' },
      ],
      evidence: {
        id: `EVID-${eventId}`,
        state: 'available',
        type: 'snapshot',
        mimeType: 'image/svg+xml',
        storageKey: `synthetic://${eventId}.svg`,
        checksum: createHash('sha256').update(eventId).digest('hex'),
      },
    });
    if (result.status === 'accepted') publish('inspection-event', { eventId, source: 'simulator', outcome: input.scenario });
    response.status(result.status === 'accepted' ? 202 : 200).json({
      ...result,
      acknowledgedAt: result.acknowledgedAt.toISOString(),
      warning: 'Synthetic simulator output only; not actual AI performance.',
    });
  }));

  return router;
}

function userRouter(config: AppConfig) {
  const router = express.Router();
  router.use(productionHeaders);
  router.use(authenticate(config));

  router.get('/system/release', asyncHandler(async (_request, response) => {
    const [eventCount, evidenceCount, latestEvent] = await Promise.all([
      prisma.inspectionEvent.count(),
      prisma.evidenceMetadata.count(),
      prisma.inspectionEvent.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ]);
    response.json({
      service: 'ptc-platform-api',
      environment: config.nodeEnv,
      version: config.buildVersion ?? 'development',
      commit: config.buildCommit ?? 'unknown',
      schemaVersion: config.schemaVersion ?? 'unknown',
      database: 'postgresql',
      simulatorEnabled: Boolean(config.simulatorEnabled),
      ingestionConfigured: Boolean(config.ingestionServiceToken),
      eventCount,
      evidenceCount,
      latestDataChangeAt: latestEvent?.updatedAt.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
    });
  }));

  router.get('/reports/summary', asyncHandler(async (request, response) => {
    const input = reportFilterSchema.parse(request.query);
    const where = reportWhere(input);
    const [total, grouped, unreviewed, confirmed, dismissed] = await Promise.all([
      prisma.inspectionEvent.count({ where }),
      prisma.inspectionEvent.groupBy({ by: ['outcome'], where, _count: { _all: true } }),
      prisma.inspectionEvent.count({ where: { ...where, reviewStatus: 'unreviewed' } }),
      prisma.inspectionEvent.count({ where: { ...where, reviewStatus: 'confirmed' } }),
      prisma.inspectionEvent.count({ where: { ...where, reviewStatus: 'dismissed' } }),
    ]);
    const outcomes = { completed: 0, missed: 0, incomplete: 0, unresolved: 0 };
    grouped.forEach((row) => { outcomes[row.outcome] = row._count._all; });
    response.json({
      filters: input,
      total,
      outcomes,
      reviews: { unreviewed, confirmed, dismissed },
      completedRate: total ? Math.round((outcomes.completed / total) * 1000) / 10 : 0,
      generatedAt: new Date().toISOString(),
    });
  }));

  router.get('/reports/pdf', asyncHandler(async (request, response) => {
    const input = reportFilterSchema.parse(request.query);
    const where = reportWhere(input);
    const [total, grouped, events] = await Promise.all([
      prisma.inspectionEvent.count({ where }),
      prisma.inspectionEvent.groupBy({ by: ['outcome'], where, _count: { _all: true } }),
      prisma.inspectionEvent.findMany({ where, orderBy: [{ timestamp: 'desc' }, { id: 'desc' }], take: 35 }),
    ]);
    const counts = new Map(grouped.map((row) => [row.outcome, row._count._all]));
    const lines = [
      'PTC Bale Inspection and Monitoring Report',
      `Generated: ${new Date().toISOString()}`,
      `Filters: ${JSON.stringify(input)}`,
      `Total events: ${total}`,
      `Completed: ${counts.get('completed') ?? 0}`,
      `Missed: ${counts.get('missed') ?? 0}`,
      `Incomplete: ${counts.get('incomplete') ?? 0}`,
      `Unresolved: ${counts.get('unresolved') ?? 0}`,
      '',
      'Recent events:',
      ...events.map((event) => `${event.timestamp.toISOString()} | ${event.id} | ${event.cameraName} | ${event.outcome} | ${event.reviewStatus}`),
    ];
    const pdf = buildPdf(lines);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="ptc-report-${new Date().toISOString().slice(0, 10)}.pdf"`);
    response.setHeader('Content-Length', String(pdf.length));
    response.send(pdf);
  }));

  router.get('/events/:eventId/audit', asyncHandler(async (request, response) => {
    const eventId = z.string().trim().min(1).max(64).parse(request.params.eventId);
    const exists = await prisma.inspectionEvent.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!exists) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event could not be found.');
    const history = await prisma.auditLog.findMany({
      where: { targetType: 'inspectionEvent', targetId: eventId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
    response.json(history.map((entry) => ({
      id: entry.id,
      actionId: entry.actionId,
      actorId: entry.actorId,
      actorDisplayName: entry.actorDisplayName,
      actorRole: entry.actorRole,
      action: entry.action,
      before: entry.before,
      after: entry.after,
      correlationId: entry.correlationId,
      occurredAt: entry.occurredAt.toISOString(),
    })));
  }));

  router.get('/events/:eventId/evidence', asyncHandler(async (request, response) => {
    const eventId = z.string().trim().min(1).max(64).parse(request.params.eventId);
    const evidence = await prisma.evidenceMetadata.findUnique({ where: { eventId } });
    if (!evidence) throw new AppError(404, 'EVIDENCE_NOT_FOUND', 'No evidence metadata exists for this event.');
    response.json({
      id: evidence.id,
      eventId: evidence.eventId,
      state: evidence.state,
      type: evidence.type,
      mimeType: evidence.mimeType,
      sizeBytes: evidence.sizeBytes,
      durationMs: evidence.durationMs,
      checksum: evidence.checksum,
      source: evidence.source,
      createdAt: evidence.createdAt.toISOString(),
      updatedAt: evidence.updatedAt.toISOString(),
      contentUrl: evidence.state === 'available' ? `/api/evidence/${encodeURIComponent(evidence.id)}/content` : null,
    });
  }));

  router.get('/evidence/:evidenceId/content', asyncHandler(async (request, response) => {
    const evidenceId = z.string().trim().min(1).max(96).parse(request.params.evidenceId);
    const evidence = await prisma.evidenceMetadata.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new AppError(404, 'EVIDENCE_NOT_FOUND', 'The requested evidence could not be found.');
    if (evidence.state !== 'available' || !evidence.storageKey) {
      throw new AppError(409, 'EVIDENCE_NOT_READY', 'The requested evidence is not available.');
    }
    if (!safeStorageKey(evidence.storageKey)) throw new AppError(500, 'UNSAFE_EVIDENCE_REFERENCE', 'The stored evidence reference is invalid.');

    let content: Buffer;
    let mimeType = evidence.mimeType ?? 'application/octet-stream';
    if (evidence.storageKey.startsWith('synthetic://')) {
      content = syntheticSvg(evidence.eventId);
      mimeType = 'image/svg+xml';
    } else {
      const root = path.resolve(config.evidenceRoot ?? '/var/lib/ptc-bale/evidence');
      const resolved = path.resolve(root, evidence.storageKey);
      if (!resolved.startsWith(`${root}${path.sep}`)) throw new AppError(500, 'UNSAFE_EVIDENCE_REFERENCE', 'The stored evidence reference is invalid.');
      const stat = await fs.stat(resolved).catch(() => null);
      if (!stat?.isFile()) {
        await prisma.evidenceMetadata.update({ where: { id: evidence.id }, data: { state: 'missing' } });
        publish('evidence-update', { evidenceId: evidence.id, state: 'missing' });
        throw new AppError(404, 'EVIDENCE_FILE_MISSING', 'The evidence file is missing.');
      }
      const maximum = config.maxEvidenceBytes ?? 25 * 1024 * 1024;
      if (stat.size > maximum) throw new AppError(413, 'EVIDENCE_TOO_LARGE', 'The evidence file exceeds the configured delivery limit.');
      content = await fs.readFile(resolved);
    }
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${evidence.id.replace(/[^A-Za-z0-9._-]/g, '_')}"`);
    response.setHeader('Content-Length', String(content.length));
    response.send(content);
  }));

  router.get('/realtime', (_request, response) => openRealtimeStream(response));

  router.get('/operations/evidence/status', asyncHandler(async (_request, response) => {
    const grouped = await prisma.evidenceMetadata.groupBy({ by: ['state'], _count: { _all: true } });
    const byState: Record<string, number> = {};
    grouped.forEach((row) => { byState[row.state] = row._count._all; });
    response.json({
      byState,
      activeSubscribers: subscribers.size,
      evidenceRootConfigured: Boolean(config.evidenceRoot),
      generatedAt: new Date().toISOString(),
    });
  }));

  router.post('/operations/evidence/retention', express.json({ limit: '32kb', strict: true }), requireRoles('admin'), asyncHandler(async (request, response) => {
    const input = retentionSchema.parse(request.body);
    const cutoff = new Date(Date.now() - input.olderThanDays * 24 * 60 * 60 * 1000);
    const candidates = await prisma.evidenceMetadata.findMany({
      where: {
        createdAt: { lt: cutoff },
        state: { in: ['available', 'unavailable', 'pending', 'missing', 'failed'] },
      },
      orderBy: { createdAt: 'asc' },
      take: 10_000,
    });
    if (input.dryRun) {
      response.json({ dryRun: true, cutoff: cutoff.toISOString(), candidateCount: candidates.length, candidateIds: candidates.map((item) => item.id) });
      return;
    }

    const root = path.resolve(config.evidenceRoot ?? '/var/lib/ptc-bale/evidence');
    for (const candidate of candidates) {
      if (candidate.storageKey && !candidate.storageKey.startsWith('synthetic://') && safeStorageKey(candidate.storageKey)) {
        const resolved = path.resolve(root, candidate.storageKey);
        if (resolved.startsWith(`${root}${path.sep}`)) await fs.unlink(resolved).catch(() => undefined);
      }
    }
    const deletedAt = new Date();
    await prisma.evidenceMetadata.updateMany({
      where: { id: { in: candidates.map((item) => item.id) } },
      data: { state: 'deleted', deletedAt },
    });
    const auth = authContext(response);
    await prisma.auditLog.create({
      data: {
        actionId: randomUUID(),
        actorId: auth.user.id,
        actorDisplayName: auth.user.displayName,
        actorRole: auth.user.role,
        action: 'evidence.retention.executed',
        targetType: 'evidenceRetention',
        targetId: cutoff.toISOString(),
        before: { candidateCount: candidates.length, olderThanDays: input.olderThanDays },
        after: { state: 'deleted', deletedAt: deletedAt.toISOString() },
        correlationId: response.locals.correlationId as string,
        occurredAt: deletedAt,
      },
    });
    publish('evidence-update', { state: 'deleted', count: candidates.length });
    response.json({ dryRun: false, cutoff: cutoff.toISOString(), deletedCount: candidates.length, deletedAt: deletedAt.toISOString() });
  }));

  return router;
}

export function createProductionReadyApp(config: AppConfig, coreApp: Express): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api/ingest', machineRouter(config));
  app.use('/api', userRouter(config));
  app.use(coreApp);
  app.use(errorHandler);
  return app;
}
