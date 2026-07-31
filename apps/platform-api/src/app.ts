import { randomUUID } from 'node:crypto';
import type { EventStep, InspectionEvent, Prisma } from '@prisma/client';
import express, { type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AppConfig } from './config';
import { databaseReady, prisma } from './db';
import type { Outcome, ReviewStatus } from './domain';
import { AppError, asyncHandler, errorHandler, notFound } from './errors';
import {
  authContext,
  authenticate,
  clearSessionCookie,
  createSession,
  requireRoles,
  revokePresentedSession,
  setSessionCookie,
  verifyPassword,
} from './security';

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(256),
}).strict();

const reviewSchema = z.object({
  reviewStatus: z.enum(['confirmed', 'dismissed']),
  remarks: z.string().trim().max(1000),
  expectedVersion: z.number().int().min(1),
}).strict();

const exportSchema = z.object({
  cameraId: z.string().trim().min(1).max(100).optional(),
  outcome: z.enum(['completed', 'missed', 'incomplete', 'unresolved']).optional(),
  reviewStatus: z.enum(['unreviewed', 'confirmed', 'dismissed']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.literal('csv'),
}).strict();

const eventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int()
    .refine((value) => [10, 20, 50, 100].includes(value), 'pageSize must be 10, 20, 50, or 100')
    .default(20),
  cameraId: z.string().trim().min(1).max(100).optional(),
  outcome: z.enum(['completed', 'missed', 'incomplete', 'unresolved']).optional(),
  reviewStatus: z.enum(['unreviewed', 'confirmed', 'dismissed']).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['timestamp', 'outcome', 'confidence', 'reviewStatus', 'cameraName']).default('timestamp'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const routeParamSchema = z.string().trim().min(1).max(160);

type EventRecord = InspectionEvent & { steps?: EventStep[] };

type EventFilters = {
  cameraId?: string | undefined;
  outcome?: Outcome | undefined;
  reviewStatus?: ReviewStatus | undefined;
  search?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
};

function requiredRouteParam(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = routeParamSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_ROUTE_PARAMETER', 'The requested route parameter is invalid.');
  }
  return parsed.data;
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeEvent(value: EventRecord) {
  return {
    id: value.id,
    cameraId: value.cameraId,
    cameraName: value.cameraName,
    zone: value.zone,
    timestamp: asIso(value.timestamp),
    outcome: value.outcome,
    reason: value.reason,
    confidence: value.confidence,
    reviewStatus: value.reviewStatus,
    summary: value.summary,
    evidenceAvailable: value.evidenceAvailable,
    ...(value.remarks ? { remarks: value.remarks } : {}),
    ...(value.reviewedBy ? { reviewedBy: value.reviewedBy } : {}),
    ...(value.reviewedAt ? { reviewedAt: asIso(value.reviewedAt) } : {}),
    modelVersion: value.modelVersion,
    ruleVersion: value.ruleVersion,
    version: value.version,
    steps: (value.steps ?? []).map((step) => ({
      label: step.label,
      state: step.state,
      ...(step.time ? { time: step.time } : {}),
    })),
  };
}

function dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  if (from && to && from > to) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'The start date must not be after the end date.');
  }
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00+05:00`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999+05:00`) } : {}),
  };
}

function buildEventFilter(filters: EventFilters): Prisma.InspectionEventWhereInput {
  const timestamp = dateRange(filters.from, filters.to);
  return {
    ...(filters.cameraId ? { cameraId: filters.cameraId } : {}),
    ...(filters.outcome ? { outcome: filters.outcome } : {}),
    ...(filters.reviewStatus ? { reviewStatus: filters.reviewStatus } : {}),
    ...(timestamp ? { timestamp } : {}),
    ...(filters.search ? {
      OR: [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { cameraName: { contains: filters.search, mode: 'insensitive' } },
        { zone: { contains: filters.search, mode: 'insensitive' } },
        { reason: { contains: filters.search, mode: 'insensitive' } },
      ],
    } : {}),
  };
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createFixedWindowLimiter(limit: number, windowMs: number) {
  const entries = new Map<string, { count: number; resetAt: number }>();
  return (request: Request, response: Response, next: NextFunction): void => {
    const now = Date.now();
    if (entries.size > 10_000) {
      for (const [entryKey, value] of entries) {
        if (value.resetAt <= now) entries.delete(entryKey);
      }
    }
    const key = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const entry = entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > limit) {
      response.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.'));
      return;
    }
    next();
  };
}

export function createApp(config: AppConfig) {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((request, response, next) => {
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
    const started = Date.now();
    response.on('finish', () => {
      console.log(JSON.stringify({
        level: 'info',
        correlationId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Date.now() - started,
      }));
    });
    next();
  });

  app.use(express.json({ limit: '256kb', strict: true }));
  app.use((request, _response, next) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      next();
      return;
    }
    const origin = request.header('origin');
    if (origin && !config.allowedOrigins.has(origin)) {
      next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'The request origin is not allowed.'));
      return;
    }
    next();
  });
  app.use(createFixedWindowLimiter(600, 60_000));

  app.get('/healthz', (_request, response) => response.json({
    status: 'ok',
    service: 'ptc-platform-api',
    database: 'postgresql',
    time: new Date().toISOString(),
  }));

  app.get('/readyz', asyncHandler(async (_request, response) => {
    const ready = await databaseReady();
    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not-ready',
      database: ready ? 'connected' : 'disconnected',
      databaseEngine: 'postgresql',
      time: new Date().toISOString(),
    });
  }));

  app.post('/api/auth/login', createFixedWindowLimiter(10, 15 * 60_000), asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { username: input.username.toLowerCase() } });
    if (!user?.enabled || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'The username or password is incorrect.');
    }
    const session = await createSession(user.id, config);
    setSessionCookie(response, session.token, session.expiresAt, config);
    response.json({
      token: '',
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  }));

  app.get('/api/auth/me', authenticate(config), asyncHandler(async (_request, response) => {
    const auth = authContext(response);
    const session = await prisma.session.findUnique({ where: { id: auth.sessionId } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.');
    }
    response.json({ token: '', expiresAt: asIso(session.expiresAt), user: auth.user });
  }));

  app.post('/api/auth/logout', asyncHandler(async (request, response) => {
    await revokePresentedSession(request, config);
    clearSessionCookie(response, config);
    response.status(204).send();
  }));

  app.use('/api', authenticate(config));

  app.get('/api/dashboard/summary', asyncHandler(async (_request, response) => {
    const [total, completed, violations, unresolved, unreviewed] = await Promise.all([
      prisma.inspectionEvent.count(),
      prisma.inspectionEvent.count({ where: { outcome: 'completed' } }),
      prisma.inspectionEvent.count({ where: { outcome: { in: ['missed', 'incomplete'] } } }),
      prisma.inspectionEvent.count({ where: { outcome: 'unresolved' } }),
      prisma.inspectionEvent.count({ where: { reviewStatus: 'unreviewed' } }),
    ]);
    response.json({
      total,
      completed,
      violations,
      unresolved,
      unreviewed,
      completedRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
      periodLabel: 'Seeded PoC dataset',
      generatedAt: new Date().toISOString(),
    });
  }));

  app.get('/api/cameras', asyncHandler(async (_request, response) => {
    const cameras = await prisma.camera.findMany({ orderBy: { id: 'asc' } });
    response.json(cameras.map((camera) => ({
      id: camera.id,
      name: camera.name,
      zone: camera.zone,
      status: camera.status,
      aiStatus: camera.aiStatus,
      lastFrameAt: asIso(camera.lastFrameAt),
      fps: camera.fps,
      streamQuality: camera.streamQuality,
      todayEvents: camera.todayEvents,
    })));
  }));

  app.get('/api/health', asyncHandler(async (_request, response) => {
    const metrics = await prisma.healthMetric.findMany({ orderBy: { id: 'asc' } });
    response.json(metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metric.value,
      detail: metric.detail,
      state: metric.state,
      checkedAt: asIso(metric.checkedAt),
    })));
  }));

  app.get('/api/events', asyncHandler(async (request, response) => {
    const query = eventQuerySchema.parse(request.query);
    const where = buildEventFilter(query);
    const direction: Prisma.SortOrder = query.sortDirection;
    const primarySort = { [query.sortBy]: direction } as Prisma.InspectionEventOrderByWithRelationInput;
    const total = await prisma.inspectionEvent.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const documents = await prisma.inspectionEvent.findMany({
      where,
      orderBy: [primarySort, { id: direction }],
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    response.json({
      items: documents.map(serializeEvent),
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      generatedAt: new Date().toISOString(),
    });
  }));

  app.get('/api/events/:eventId', asyncHandler(async (request, response) => {
    const eventId = requiredRouteParam(request.params.eventId);
    const event = await prisma.inspectionEvent.findUnique({
      where: { id: eventId },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event could not be found.');
    response.json(serializeEvent(event));
  }));

  app.patch('/api/events/:eventId/review', requireRoles('supervisor', 'admin'), asyncHandler(async (request, response) => {
    const eventId = requiredRouteParam(request.params.eventId);
    const input = reviewSchema.parse(request.body);
    const auth = authContext(response);
    const reviewedAt = new Date();

    const updated = await prisma.$transaction(async (transaction) => {
      const before = await transaction.inspectionEvent.findUnique({
        where: { id: eventId },
        include: { steps: { orderBy: { sequence: 'asc' } } },
      });
      if (!before) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event could not be found.');
      if (before.version !== input.expectedVersion) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'This event was updated by another user. Refresh before saving your review.',
          { currentVersion: before.version },
        );
      }

      const mutation = await transaction.inspectionEvent.updateMany({
        where: { id: eventId, version: input.expectedVersion },
        data: {
          reviewStatus: input.reviewStatus,
          remarks: input.remarks,
          reviewedBy: auth.user.displayName,
          reviewedAt,
          version: { increment: 1 },
        },
      });
      if (mutation.count !== 1) {
        const current = await transaction.inspectionEvent.findUnique({
          where: { id: eventId },
          select: { version: true },
        });
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'This event was updated by another user. Refresh before saving your review.',
          { currentVersion: current?.version },
        );
      }

      const after = await transaction.inspectionEvent.findUnique({
        where: { id: eventId },
        include: { steps: { orderBy: { sequence: 'asc' } } },
      });
      if (!after) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event could not be found.');

      await transaction.auditLog.create({
        data: {
          actionId: randomUUID(),
          actorId: auth.user.id,
          actorDisplayName: auth.user.displayName,
          actorRole: auth.user.role,
          action: 'event.review.updated',
          targetType: 'inspectionEvent',
          targetId: after.id,
          before: {
            reviewStatus: before.reviewStatus,
            remarks: before.remarks,
            version: before.version,
          },
          after: {
            reviewStatus: after.reviewStatus,
            remarks: after.remarks,
            version: after.version,
          },
          correlationId: response.locals.correlationId as string,
          occurredAt: reviewedAt,
        },
      });
      return after;
    });

    response.json(serializeEvent(updated));
  }));

  app.post('/api/exports/events', asyncHandler(async (request, response) => {
    const input = exportSchema.parse(request.body);
    const where = buildEventFilter(input);
    const documents = await prisma.inspectionEvent.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: 10_000,
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    const header = [
      'Event ID',
      'Timestamp',
      'Camera',
      'Zone',
      'Outcome',
      'Reason',
      'Confidence',
      'Review Status',
      'Reviewed By',
      'Remarks',
    ];
    const rows = documents.map((event) => [
      event.id,
      asIso(event.timestamp),
      event.cameraName,
      event.zone,
      event.outcome,
      event.reason,
      event.confidence,
      event.reviewStatus,
      event.reviewedBy ?? '',
      event.remarks ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="ptc-events-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    response.send(`\uFEFF${csv}\r\n`);
  }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
