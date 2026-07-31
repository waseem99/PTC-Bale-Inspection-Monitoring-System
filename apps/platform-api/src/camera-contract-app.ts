import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AppConfig } from './config';
import { prisma } from './db';
import { AppError, asyncHandler } from './errors';
import { authenticate, authContext, hashToken, requireRoles } from './security';

const cameraIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._:-]+$/);
const statusSchema = z.object({
  status: z.enum(['online', 'warning', 'offline', 'reconnecting', 'disabled', 'degraded', 'unknown']),
  aiStatus: z.enum(['processing', 'degraded', 'stopped', 'simulated', 'unavailable', 'loading', 'ready', 'failed']),
  lastFrameAt: z.string().datetime({ offset: true }),
  fps: z.number().min(0).max(240),
  streamQuality: z.string().trim().min(1).max(64),
  configVersion: z.string().trim().min(1).max(64),
  sequence: z.number().int().min(0).max(2_147_483_647),
  source: z.enum(['edge', 'simulator']),
}).strict();
const configSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  zone: z.string().trim().min(1).max(160).optional(),
  enabled: z.boolean().optional(),
  orientation: z.enum(['landscape', 'portrait', 'rotated-180', 'rotated-270', 'unknown']).optional(),
  expectedResolution: z.string().trim().min(1).max(64).regex(/^\d{2,5}x\d{2,5}$|^unknown$/).optional(),
  expectedFps: z.number().min(0).max(240).optional(),
  configVersion: z.string().trim().min(1).max(64).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one safe camera configuration field is required.');

function serviceAuth(config: AppConfig) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!config.ingestionServiceToken) {
      next(new AppError(503, 'INGESTION_NOT_CONFIGURED', 'Machine ingestion is not configured.'));
      return;
    }
    const authorization = request.header('authorization');
    const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    const expected = Buffer.from(hashToken(config.ingestionServiceToken), 'hex');
    const actual = Buffer.from(hashToken(supplied), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      next(new AppError(401, 'INVALID_SERVICE_CREDENTIAL', 'The machine credential is invalid.'));
      return;
    }
    next();
  };
}

function safeCamera(camera: {
  id: string; name: string; zone: string; enabled: boolean; orientation: string; expectedResolution: string;
  expectedFps: number; status: string; aiStatus: string; lastFrameAt: Date; fps: number; streamQuality: string;
  todayEvents: number; configVersion: string; statusSequence: number; source: string; updatedAt: Date;
}) {
  return {
    id: camera.id,
    name: camera.name,
    zone: camera.zone,
    enabled: camera.enabled,
    orientation: camera.orientation,
    expectedResolution: camera.expectedResolution,
    expectedFps: camera.expectedFps,
    status: camera.status,
    aiStatus: camera.aiStatus,
    lastFrameAt: camera.lastFrameAt.toISOString(),
    fps: camera.fps,
    streamQuality: camera.streamQuality,
    todayEvents: camera.todayEvents,
    configVersion: camera.configVersion,
    statusSequence: camera.statusSequence,
    source: camera.source,
    updatedAt: camera.updatedAt.toISOString(),
  };
}

function cameraUpdateData(input: z.infer<typeof configSchema>): Prisma.CameraUpdateInput {
  const data: Prisma.CameraUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.zone !== undefined) data.zone = input.zone;
  if (input.enabled !== undefined) data.enabled = input.enabled;
  if (input.orientation !== undefined) data.orientation = input.orientation;
  if (input.expectedResolution !== undefined) data.expectedResolution = input.expectedResolution;
  if (input.expectedFps !== undefined) data.expectedFps = input.expectedFps;
  if (input.configVersion !== undefined) data.configVersion = input.configVersion;
  return data;
}

export function createCameraContractApp(config: AppConfig) {
  const router = express.Router();

  router.post(
    '/api/ingest/cameras/:cameraId/status',
    serviceAuth(config),
    express.json({ limit: '64kb', strict: true }),
    asyncHandler(async (request, response) => {
      const cameraId = cameraIdSchema.parse(request.params.cameraId);
      const input = statusSchema.parse(request.body);
      const current = await prisma.camera.findUnique({ where: { id: cameraId } });
      if (!current) throw new AppError(404, 'CAMERA_NOT_FOUND', 'The camera is not registered.');
      if (input.sequence < current.statusSequence) {
        response.status(200).json({ status: 'stale', cameraId, acceptedSequence: current.statusSequence });
        return;
      }
      if (input.sequence === current.statusSequence && current.source !== 'seed') {
        const exact = current.status === input.status
          && current.aiStatus === input.aiStatus
          && current.lastFrameAt.toISOString() === new Date(input.lastFrameAt).toISOString()
          && current.fps === input.fps
          && current.streamQuality === input.streamQuality
          && current.configVersion === input.configVersion
          && current.source === input.source;
        if (!exact) throw new AppError(409, 'CAMERA_SEQUENCE_CONFLICT', 'The camera sequence already exists with different status data.');
        response.status(200).json({ status: 'duplicate', cameraId, acceptedSequence: current.statusSequence });
        return;
      }
      const updated = await prisma.camera.update({
        where: { id: cameraId },
        data: {
          status: input.status,
          aiStatus: input.aiStatus,
          lastFrameAt: new Date(input.lastFrameAt),
          fps: input.fps,
          streamQuality: input.streamQuality,
          configVersion: input.configVersion,
          statusSequence: input.sequence,
          source: input.source,
        },
      });
      response.status(202).json({ status: 'accepted', camera: safeCamera(updated) });
    }),
  );

  router.use('/api', authenticate(config));

  router.get('/api/camera-config', asyncHandler(async (_request, response) => {
    const cameras = await prisma.camera.findMany({ orderBy: { id: 'asc' } });
    response.json({
      schemaVersion: 'camera-contract-v1',
      cameras: cameras.map(safeCamera),
      generatedAt: new Date().toISOString(),
    });
  }));

  router.patch(
    '/api/camera-config/:cameraId',
    express.json({ limit: '32kb', strict: true }),
    requireRoles('admin'),
    asyncHandler(async (request, response) => {
      const cameraId = cameraIdSchema.parse(request.params.cameraId);
      const input = configSchema.parse(request.body);
      const current = await prisma.camera.findUnique({ where: { id: cameraId } });
      if (!current) throw new AppError(404, 'CAMERA_NOT_FOUND', 'The camera is not registered.');
      const updated = await prisma.camera.update({ where: { id: cameraId }, data: cameraUpdateData(input) });
      const auth = authContext(response);
      const occurredAt = new Date();
      await prisma.auditLog.create({
        data: {
          actionId: randomUUID(),
          actorId: auth.user.id,
          actorDisplayName: auth.user.displayName,
          actorRole: auth.user.role,
          action: 'camera.configuration.updated',
          targetType: 'camera',
          targetId: cameraId,
          before: safeCamera(current),
          after: safeCamera(updated),
          correlationId: (response.locals.correlationId as string | undefined) ?? randomUUID(),
          occurredAt,
        },
      });
      response.json({ camera: safeCamera(updated), updatedAt: occurredAt.toISOString() });
    }),
  );

  return router;
}
