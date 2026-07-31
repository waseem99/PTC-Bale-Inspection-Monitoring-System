import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AppConfig } from './config';
import { prisma } from './db';
import { AppError, asyncHandler } from './errors';
import { authenticate, authContext, hashToken, requireRoles } from './security';

const evidenceIdSchema = z.string().trim().min(1).max(96).regex(/^[A-Za-z0-9._:-]+$/);
const eventIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/);
const retentionSchema = z.object({ olderThanDays: z.number().int().min(1).max(3650), dryRun: z.boolean().default(true) }).strict();
const reconcileSchema = z.object({ action: z.enum(['report', 'mark-missing', 'quarantine-orphans']).default('report'), dryRun: z.boolean().default(true) }).strict();
const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['video/mp4', '.mp4'],
]);

function serviceAuth(config: AppConfig) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const configured = config.ingestionServiceToken;
    if (!configured) {
      next(new AppError(503, 'INGESTION_NOT_CONFIGURED', 'Machine ingestion is not configured.'));
      return;
    }
    const authorization = request.header('authorization');
    const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const expected = Buffer.from(hashToken(configured), 'hex');
    const actual = Buffer.from(hashToken(supplied), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      next(new AppError(401, 'INVALID_SERVICE_CREDENTIAL', 'The machine credential is invalid.'));
      return;
    }
    next();
  };
}

function safeRelativeStorageKey(storageKey: string): boolean {
  if (!storageKey || path.isAbsolute(storageKey) || storageKey.includes('\\')) return false;
  return storageKey.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

function resolveEvidencePath(config: AppConfig, storageKey: string): string {
  if (!safeRelativeStorageKey(storageKey)) throw new AppError(500, 'UNSAFE_EVIDENCE_REFERENCE', 'The stored evidence reference is invalid.');
  const root = path.resolve(config.evidenceRoot ?? '/var/lib/ptc-bale/evidence');
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new AppError(500, 'UNSAFE_EVIDENCE_REFERENCE', 'The stored evidence reference is invalid.');
  return resolved;
}

async function atomicWrite(finalPath: string, content: Buffer): Promise<void> {
  await fs.mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
  const temporaryPath = `${finalPath}.tmp-${randomUUID()}`;
  const handle = await fs.open(temporaryPath, 'wx', 0o600);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(temporaryPath, finalPath);
}

async function listFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && !entry.name.includes('.tmp-')) files.push(absolute);
    }
  }
  await walk(root);
  return files;
}

async function consistencyReport(config: AppConfig) {
  const root = path.resolve(config.evidenceRoot ?? '/var/lib/ptc-bale/evidence');
  const records = await prisma.evidenceMetadata.findMany({
    where: { state: { not: 'deleted' } },
    orderBy: { createdAt: 'asc' },
    take: 10_000,
  });
  const referenced = new Set<string>();
  const missing: string[] = [];
  const unsafe: string[] = [];
  for (const record of records) {
    if (!record.storageKey || record.storageKey.startsWith('synthetic://')) continue;
    try {
      const absolute = resolveEvidencePath(config, record.storageKey);
      referenced.add(absolute);
      const stat = await fs.stat(absolute).catch(() => null);
      if (!stat?.isFile()) missing.push(record.id);
    } catch {
      unsafe.push(record.id);
    }
  }
  const files = await listFiles(root);
  const orphans = files.filter((file) => !referenced.has(file)).map((file) => path.relative(root, file));
  const disk = await fs.statfs(root).catch(() => null);
  return {
    rootAvailable: Boolean(disk),
    recordCount: records.length,
    referencedFileCount: referenced.size,
    missingRecordIds: missing,
    unsafeRecordIds: unsafe,
    orphanStorageKeys: orphans,
    disk: disk ? {
      totalBytes: Number(disk.blocks) * Number(disk.bsize),
      availableBytes: Number(disk.bavail) * Number(disk.bsize),
    } : null,
    generatedAt: new Date().toISOString(),
  };
}

function streamFile(request: Request, response: Response, absolutePath: string, mimeType: string, fileName: string, size: number): void {
  const range = request.header('range');
  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Content-Type', mimeType);
  response.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/[^A-Za-z0-9._-]/g, '_')}"`);
  if (!range) {
    response.setHeader('Content-Length', String(size));
    createReadStream(absolutePath).pipe(response);
    return;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) throw new AppError(416, 'INVALID_RANGE', 'The requested byte range is invalid.');
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) {
    response.setHeader('Content-Range', `bytes */${size}`);
    throw new AppError(416, 'INVALID_RANGE', 'The requested byte range is outside the evidence file.');
  }
  const boundedEnd = Math.min(end, size - 1);
  response.status(206);
  response.setHeader('Content-Range', `bytes ${start}-${boundedEnd}/${size}`);
  response.setHeader('Content-Length', String(boundedEnd - start + 1));
  createReadStream(absolutePath, { start, end: boundedEnd }).pipe(response);
}

export function createCertificationApp(config: AppConfig) {
  const router = express.Router();

  router.post(
    '/api/ingest/evidence/:eventId',
    serviceAuth(config),
    express.raw({ type: [...allowedMimeTypes.keys()], limit: config.maxEvidenceBytes ?? 25 * 1024 * 1024 }),
    asyncHandler(async (request, response) => {
      const eventId = eventIdSchema.parse(request.params.eventId);
      const evidenceId = evidenceIdSchema.parse(request.header('x-evidence-id'));
      const expectedChecksum = z.string().regex(/^[a-fA-F0-9]{64}$/).parse(request.header('x-checksum-sha256')).toLowerCase();
      const durationHeader = request.header('x-duration-ms');
      const durationMs = durationHeader === undefined ? undefined : z.coerce.number().int().min(0).max(10 * 60 * 1000).parse(durationHeader);
      const contentType = request.header('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
      const extension = allowedMimeTypes.get(contentType);
      if (!extension) throw new AppError(415, 'UNSUPPORTED_EVIDENCE_TYPE', 'Only JPEG, PNG and MP4 evidence is accepted.');
      if (!Buffer.isBuffer(request.body) || request.body.length === 0) throw new AppError(400, 'EMPTY_EVIDENCE', 'The evidence body is empty.');
      const actualChecksum = createHash('sha256').update(request.body).digest('hex');
      if (actualChecksum !== expectedChecksum) throw new AppError(422, 'CHECKSUM_MISMATCH', 'The evidence checksum does not match the uploaded bytes.');

      const event = await prisma.inspectionEvent.findUnique({ where: { id: eventId }, include: { evidence: true } });
      if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'The referenced event does not exist.');
      if (event.evidence) {
        if (event.evidence.id === evidenceId && event.evidence.checksum === actualChecksum && event.evidence.state === 'available') {
          response.status(200).json({ status: 'duplicate', evidenceId, eventId, checksum: actualChecksum });
          return;
        }
        throw new AppError(409, 'EVIDENCE_CONFLICT', 'The event already has different evidence metadata.');
      }

      const date = event.timestamp.toISOString().slice(0, 10).replace(/-/g, '/');
      const storageKey = `${date}/${eventId}/${evidenceId}${extension}`;
      const finalPath = resolveEvidencePath(config, storageKey);
      await atomicWrite(finalPath, request.body);
      try {
        await prisma.$transaction([
          prisma.evidenceMetadata.create({
            data: {
              id: evidenceId,
              eventId,
              state: 'available',
              type: contentType === 'video/mp4' ? 'clip' : 'snapshot',
              mimeType: contentType,
              sizeBytes: request.body.length,
              ...(durationMs !== undefined ? { durationMs } : {}),
              checksum: actualChecksum,
              storageKey,
              source: 'edge',
              dataset: 'ptc-operational',
            },
          }),
          prisma.inspectionEvent.update({ where: { id: eventId }, data: { evidenceAvailable: true } }),
        ]);
      } catch (error) {
        await fs.unlink(finalPath).catch(() => undefined);
        throw error;
      }
      response.status(201).json({ status: 'available', evidenceId, eventId, checksum: actualChecksum, sizeBytes: request.body.length });
    }),
  );

  router.get('/api/evidence/:evidenceId/content', authenticate(config), asyncHandler(async (request, response, next) => {
    const evidenceId = evidenceIdSchema.parse(request.params.evidenceId);
    const evidence = await prisma.evidenceMetadata.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new AppError(404, 'EVIDENCE_NOT_FOUND', 'The requested evidence could not be found.');
    if (evidence.storageKey?.startsWith('synthetic://')) {
      next();
      return;
    }
    if (evidence.state !== 'available' || !evidence.storageKey) throw new AppError(409, 'EVIDENCE_NOT_READY', 'The requested evidence is not available.');
    const absolute = resolveEvidencePath(config, evidence.storageKey);
    const stat = await fs.stat(absolute).catch(() => null);
    if (!stat?.isFile()) {
      await prisma.evidenceMetadata.update({ where: { id: evidence.id }, data: { state: 'missing' } });
      throw new AppError(404, 'EVIDENCE_FILE_MISSING', 'The evidence file is missing.');
    }
    const maximum = config.maxEvidenceBytes ?? 25 * 1024 * 1024;
    if (stat.size > maximum) throw new AppError(413, 'EVIDENCE_TOO_LARGE', 'The evidence file exceeds the configured delivery limit.');
    streamFile(request, response, absolute, evidence.mimeType ?? 'application/octet-stream', evidence.id, stat.size);
  }));

  router.use('/api', authenticate(config));

  router.get('/api/catalog/reason-codes', (_request, response) => {
    response.json({
      version: 'ptc-sop-v1',
      codes: [
        { code: 'COMPLETED', outcome: 'completed', operationalFailure: false },
        { code: 'MISSED_REQUIRED_INSPECTION', outcome: 'missed', operationalFailure: false },
        { code: 'INCOMPLETE_OPENING', outcome: 'incomplete', operationalFailure: false },
        { code: 'INCOMPLETE_CHECKING', outcome: 'incomplete', operationalFailure: false },
        { code: 'INCOMPLETE_FRISKING', outcome: 'incomplete', operationalFailure: false },
        { code: 'UNRESOLVED_ASSOCIATION', outcome: 'unresolved', operationalFailure: false },
        { code: 'INSUFFICIENT_VISIBILITY', outcome: 'unresolved', operationalFailure: true },
        { code: 'CAMERA_FAILURE', outcome: 'unresolved', operationalFailure: true },
        { code: 'MODEL_FAILURE', outcome: 'unresolved', operationalFailure: true },
        { code: 'ABORTED', outcome: 'unresolved', operationalFailure: true },
      ],
    });
  });

  router.get('/api/operations/evidence/consistency', requireRoles('supervisor', 'admin'), asyncHandler(async (_request, response) => {
    response.json(await consistencyReport(config));
  }));

  router.post('/api/operations/evidence/reconcile', express.json({ limit: '32kb', strict: true }), requireRoles('admin'), asyncHandler(async (request, response) => {
    const input = reconcileSchema.parse(request.body);
    const report = await consistencyReport(config);
    if (input.dryRun || input.action === 'report') {
      response.json({ dryRun: true, action: input.action, report });
      return;
    }
    const occurredAt = new Date();
    if (input.action === 'mark-missing' && report.missingRecordIds.length) {
      await prisma.evidenceMetadata.updateMany({ where: { id: { in: report.missingRecordIds } }, data: { state: 'missing' } });
    }
    if (input.action === 'quarantine-orphans' && report.orphanStorageKeys.length) {
      const root = path.resolve(config.evidenceRoot ?? '/var/lib/ptc-bale/evidence');
      for (const storageKey of report.orphanStorageKeys) {
        const source = resolveEvidencePath(config, storageKey);
        const destination = path.join(root, '.quarantine', `${randomUUID()}-${path.basename(storageKey)}`);
        await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
        await fs.rename(source, destination).catch(() => undefined);
      }
    }
    const auth = authContext(response);
    await prisma.auditLog.create({
      data: {
        actionId: randomUUID(), actorId: auth.user.id, actorDisplayName: auth.user.displayName, actorRole: auth.user.role,
        action: `evidence.reconcile.${input.action}`, targetType: 'evidenceConsistency', targetId: occurredAt.toISOString(),
        before: report, after: { action: input.action, completedAt: occurredAt.toISOString() },
        correlationId: response.locals.correlationId as string ?? randomUUID(), occurredAt,
      },
    });
    response.json({ dryRun: false, action: input.action, completedAt: occurredAt.toISOString(), report: await consistencyReport(config) });
  }));

  router.post('/api/operations/evidence/retention', express.json({ limit: '32kb', strict: true }), requireRoles('admin'), asyncHandler(async (request, response) => {
    const input = retentionSchema.parse(request.body);
    const cutoff = new Date(Date.now() - input.olderThanDays * 24 * 60 * 60 * 1000);
    const candidates = await prisma.evidenceMetadata.findMany({
      where: { createdAt: { lt: cutoff }, state: { in: ['available', 'unavailable', 'missing', 'failed'] } },
      orderBy: { createdAt: 'asc' }, take: 10_000,
    });
    if (input.dryRun) {
      response.json({ dryRun: true, cutoff: cutoff.toISOString(), candidateCount: candidates.length, candidateIds: candidates.map((item) => item.id) });
      return;
    }
    for (const candidate of candidates) {
      if (candidate.storageKey && !candidate.storageKey.startsWith('synthetic://')) {
        const absolute = resolveEvidencePath(config, candidate.storageKey);
        await fs.unlink(absolute).catch(() => undefined);
      }
    }
    const deletedAt = new Date();
    await prisma.evidenceMetadata.updateMany({ where: { id: { in: candidates.map((item) => item.id) } }, data: { state: 'deleted', deletedAt } });
    const auth = authContext(response);
    await prisma.auditLog.create({
      data: {
        actionId: randomUUID(), actorId: auth.user.id, actorDisplayName: auth.user.displayName, actorRole: auth.user.role,
        action: 'evidence.retention.executed', targetType: 'evidenceRetention', targetId: cutoff.toISOString(),
        before: { candidateCount: candidates.length, olderThanDays: input.olderThanDays },
        after: { state: 'deleted', deletedAt: deletedAt.toISOString() },
        correlationId: response.locals.correlationId as string ?? randomUUID(), occurredAt: deletedAt,
      },
    });
    response.json({ dryRun: false, cutoff: cutoff.toISOString(), deletedCount: candidates.length, deletedAt: deletedAt.toISOString() });
  }));

  router.get('/api/operations/diagnostics', requireRoles('supervisor', 'admin'), asyncHandler(async (_request, response) => {
    const [consistency, latestBackup, latestCritical, lastRetention] = await Promise.all([
      consistencyReport(config),
      prisma.healthMetric.findFirst({ where: { source: { contains: 'backup', mode: 'insensitive' } }, orderBy: { checkedAt: 'desc' } }),
      prisma.healthMetric.findMany({ where: { state: { in: ['warning', 'critical'] } }, orderBy: { checkedAt: 'desc' }, take: 20 }),
      prisma.auditLog.findFirst({ where: { action: 'evidence.retention.executed' }, orderBy: { occurredAt: 'desc' } }),
    ]);
    response.json({
      evidence: consistency,
      latestBackup: latestBackup ? { state: latestBackup.state, value: latestBackup.value, detail: latestBackup.detail, checkedAt: latestBackup.checkedAt.toISOString() } : null,
      recentWarnings: latestCritical.map((item) => ({ id: item.id, label: item.label, state: item.state, detail: item.detail, checkedAt: item.checkedAt.toISOString() })),
      lastRetentionAt: lastRetention?.occurredAt.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
    });
  }));

  return router;
}
