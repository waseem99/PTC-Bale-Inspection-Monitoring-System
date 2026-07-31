import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import type { AppConfig } from './config';
import { prisma } from './db';
import { AppError } from './errors';
import { hashToken } from './security';

const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['video/mp4', '.mp4'],
]);

function serviceCredentialValid(request: Request, config: AppConfig): boolean {
  if (!config.ingestionServiceToken) return false;
  const authorization = request.header('authorization');
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const expected = Buffer.from(hashToken(config.ingestionServiceToken), 'hex');
  const actual = Buffer.from(hashToken(supplied), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function evidencePath(config: AppConfig, storageKey: string): string {
  if (path.isAbsolute(storageKey) || storageKey.includes('\\') || storageKey.split('/').some((segment) => ['', '.', '..'].includes(segment))) {
    throw new AppError(500, 'UNSAFE_EVIDENCE_REFERENCE', 'The evidence storage reference is invalid.');
  }
  const root = path.resolve(config.evidenceRoot ?? '/var/lib/ptc-bale/evidence');
  const resolved = path.resolve(root, storageKey);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new AppError(500, 'UNSAFE_EVIDENCE_REFERENCE', 'The evidence storage reference is invalid.');
  return resolved;
}

async function writeAtomically(finalPath: string, body: Buffer): Promise<void> {
  await fs.mkdir(path.dirname(finalPath), { recursive: true, mode: 0o700 });
  const temporary = `${finalPath}.tmp-${randomUUID()}`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(body);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(temporary, finalPath);
}

export function createPendingEvidenceFinalizer(config: AppConfig) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!serviceCredentialValid(request, config)) {
        next();
        return;
      }
      const eventId = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/).parse(request.params.eventId);
      const evidenceId = z.string().trim().min(1).max(96).regex(/^[A-Za-z0-9._:-]+$/).parse(request.header('x-evidence-id'));
      const expectedChecksum = z.string().regex(/^[a-fA-F0-9]{64}$/).parse(request.header('x-checksum-sha256')).toLowerCase();
      const contentType = request.header('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
      const extension = allowedMimeTypes.get(contentType);
      if (!extension || !Buffer.isBuffer(request.body) || request.body.length === 0) {
        next();
        return;
      }
      const actualChecksum = createHash('sha256').update(request.body).digest('hex');
      if (actualChecksum !== expectedChecksum) {
        next();
        return;
      }

      const event = await prisma.inspectionEvent.findUnique({ where: { id: eventId }, include: { evidence: true } });
      const existing = event?.evidence;
      if (!event || !existing) {
        next();
        return;
      }
      if (existing.id !== evidenceId) throw new AppError(409, 'EVIDENCE_CONFLICT', 'The event already references a different evidence ID.');
      if (existing.state === 'available') {
        if (existing.checksum === actualChecksum) {
          response.status(200).json({ status: 'duplicate', evidenceId, eventId, checksum: actualChecksum });
          return;
        }
        throw new AppError(409, 'EVIDENCE_CONFLICT', 'Available evidence has a different checksum.');
      }
      if (!['pending', 'unavailable', 'missing', 'failed'].includes(existing.state)) {
        throw new AppError(409, 'EVIDENCE_CONFLICT', `Evidence in state ${existing.state} cannot be finalized.`);
      }
      if (existing.checksum && existing.checksum !== actualChecksum) {
        throw new AppError(409, 'EVIDENCE_CONFLICT', 'Pending evidence has a different declared checksum.');
      }

      const durationHeader = request.header('x-duration-ms');
      const durationMs = durationHeader === undefined ? undefined : z.coerce.number().int().min(0).max(600_000).parse(durationHeader);
      const date = event.timestamp.toISOString().slice(0, 10).replace(/-/g, '/');
      const storageKey = `${date}/${eventId}/${evidenceId}${extension}`;
      const finalPath = evidencePath(config, storageKey);
      await writeAtomically(finalPath, request.body);
      try {
        await prisma.$transaction([
          prisma.evidenceMetadata.update({
            where: { id: evidenceId },
            data: {
              state: 'available',
              type: contentType === 'video/mp4' ? 'clip' : 'snapshot',
              mimeType: contentType,
              sizeBytes: request.body.length,
              ...(durationMs !== undefined ? { durationMs } : {}),
              checksum: actualChecksum,
              storageKey,
              source: existing.source,
              dataset: existing.dataset,
              deletedAt: null,
            },
          }),
          prisma.inspectionEvent.update({ where: { id: eventId }, data: { evidenceAvailable: true } }),
        ]);
      } catch (error) {
        await fs.unlink(finalPath).catch(() => undefined);
        throw error;
      }
      response.status(201).json({ status: 'available', evidenceId, eventId, checksum: actualChecksum, sizeBytes: request.body.length, finalizedPendingMetadata: true });
    } catch (error) {
      next(error);
    }
  };
}
