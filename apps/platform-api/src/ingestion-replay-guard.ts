import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { AppConfig } from './config';
import { prisma } from './db';
import { hashToken } from './security';

type IncomingStep = {
  label?: unknown;
  state?: unknown;
  time?: unknown;
};

type IncomingEvidence = {
  id?: unknown;
  state?: unknown;
  type?: unknown;
  mimeType?: unknown;
  sizeBytes?: unknown;
  durationMs?: unknown;
  checksum?: unknown;
  storageKey?: unknown;
};

function validServiceCredential(request: Request, config: AppConfig): boolean {
  if (!config.ingestionServiceToken) return false;
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const expected = Buffer.from(hashToken(config.ingestionServiceToken), 'hex');
  const actual = Buffer.from(hashToken(token), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function valueOrNull(value: unknown): unknown {
  return value === undefined ? null : value;
}

function incomingFingerprint(body: Record<string, unknown>): string | null {
  if (typeof body.id !== 'string' || !body.id) return null;
  const parsedTimestamp = typeof body.timestamp === 'string' ? new Date(body.timestamp) : null;
  if (!parsedTimestamp || Number.isNaN(parsedTimestamp.getTime())) return null;

  const steps = Array.isArray(body.steps)
    ? body.steps.map((item) => {
        const step = item && typeof item === 'object' ? item as IncomingStep : {};
        return {
          label: valueOrNull(step.label),
          state: valueOrNull(step.state),
          time: valueOrNull(step.time),
        };
      })
    : [];
  const rawEvidence = body.evidence && typeof body.evidence === 'object'
    ? body.evidence as IncomingEvidence
    : null;
  const evidence = rawEvidence ? {
    id: valueOrNull(rawEvidence.id),
    state: valueOrNull(rawEvidence.state),
    type: valueOrNull(rawEvidence.type),
    mimeType: valueOrNull(rawEvidence.mimeType),
    sizeBytes: valueOrNull(rawEvidence.sizeBytes),
    durationMs: valueOrNull(rawEvidence.durationMs),
    checksum: valueOrNull(rawEvidence.checksum),
    storageKey: valueOrNull(rawEvidence.storageKey),
  } : null;

  return JSON.stringify({
    id: body.id,
    cameraId: valueOrNull(body.cameraId),
    cameraName: valueOrNull(body.cameraName),
    zone: valueOrNull(body.zone),
    timestamp: parsedTimestamp.toISOString(),
    outcome: valueOrNull(body.outcome),
    reason: valueOrNull(body.reason),
    confidence: valueOrNull(body.confidence),
    summary: valueOrNull(body.summary),
    modelVersion: valueOrNull(body.modelVersion),
    ruleVersion: valueOrNull(body.ruleVersion),
    configVersion: valueOrNull(body.configVersion),
    edgeVersion: valueOrNull(body.edgeVersion),
    schemaVersion: valueOrNull(body.schemaVersion),
    source: valueOrNull(body.source),
    steps,
    evidence,
  });
}

function persistedFingerprint(event: Awaited<ReturnType<typeof loadPersistedEvent>>): string | null {
  if (!event) return null;
  return JSON.stringify({
    id: event.id,
    cameraId: event.cameraId,
    cameraName: event.cameraName,
    zone: event.zone,
    timestamp: event.timestamp.toISOString(),
    outcome: event.outcome,
    reason: event.reason,
    confidence: event.confidence,
    summary: event.summary,
    modelVersion: event.modelVersion,
    ruleVersion: event.ruleVersion,
    configVersion: event.configVersion,
    edgeVersion: event.edgeVersion,
    schemaVersion: event.schemaVersion,
    source: event.source,
    steps: event.steps.map((step) => ({
      label: step.label,
      state: step.state,
      time: step.time,
    })),
    evidence: event.evidence ? {
      id: event.evidence.id,
      state: event.evidence.state,
      type: event.evidence.type,
      mimeType: event.evidence.mimeType,
      sizeBytes: event.evidence.sizeBytes,
      durationMs: event.evidence.durationMs,
      checksum: event.evidence.checksum,
      storageKey: event.evidence.storageKey,
    } : null,
  });
}

async function loadPersistedEvent(id: string) {
  return prisma.inspectionEvent.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { sequence: 'asc' } },
      evidence: true,
    },
  });
}

export function createIngestionReplayGuard(config: AppConfig) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!validServiceCredential(request, config)) {
        next();
        return;
      }
      const body = request.body && typeof request.body === 'object'
        ? request.body as Record<string, unknown>
        : null;
      const id = body && typeof body.id === 'string' ? body.id : null;
      const incoming = body ? incomingFingerprint(body) : null;
      if (!id || !incoming) {
        next();
        return;
      }

      const existing = await loadPersistedEvent(id);
      if (!existing) {
        next();
        return;
      }

      if (incoming !== persistedFingerprint(existing)) {
        response.status(409).json({
          code: 'EVENT_ID_REUSE_CONFLICT',
          message: 'The event ID already exists with a different payload.',
          eventId: id,
        });
        return;
      }

      response.status(200).json({
        status: 'duplicate',
        eventId: existing.id,
        acknowledgedAt: (existing.acknowledgedAt ?? existing.createdAt).toISOString(),
        schemaVersion: existing.schemaVersion,
      });
    } catch (error) {
      next(error);
    }
  };
}
