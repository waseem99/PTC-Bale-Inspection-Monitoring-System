import { randomUUID } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { AppConfig } from './config';
import { AppError, asyncHandler, errorHandler, notFound } from './errors';
import {
  AuditModel,
  CameraModel,
  HealthMetricModel,
  InspectionEventModel,
  SessionModel,
  UserModel,
  type Outcome,
  type ReviewStatus,
} from './models';
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

type EventRecord = {
  _id: string;
  cameraId: string;
  cameraName: string;
  zone: string;
  timestamp: Date;
  outcome: Outcome;
  reason: string;
  confidence: number;
  reviewStatus: ReviewStatus;
  summary: string;
  evidenceAvailable: boolean;
  remarks?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  modelVersion: string;
  ruleVersion: string;
  version: number;
  steps: Array<{ label: string; state: 'complete' | 'failed' | 'unknown'; time?: string }>;
};

type UserRecord = {
  _id: string;
  username: string;
  displayName: string;
  role: 'viewer' | 'supervisor' | 'admin';
  passwordHash: string;
  enabled: boolean;
};

type EventFilters = {
  cameraId?: string;
  outcome?: Outcome;
  reviewStatus?: ReviewStatus;
  search?: string;
  from?: string;
  to?: string;
};

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function serializeEvent(value: EventRecord) {
  return {
    id: String(value._id),
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
    steps: value.steps.map((step) => ({
      label: step.label,
      state: step.state,
      ...(step.time ? { time: step.time } : {}),
    })),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dateRange(from?: string, to?: string): Record<string, Date> | undefined {
  if (!from && !to) return undefined;
  if (from && to && from > to) {
    throw new AppError(400, 'INVALID_DATE_RANGE', 'The start date must not be after the end date.');
  }
  return {
    ...(from ? { $gte: new Date(`${from}T00:00:00+05:00`) } : {}),
    ...(to ? { $lte: new Date(`${to}T23:59:59.999+05:00`) } : {}),
  };
}

function buildEventFilter(filters: EventFilters): Record<string, unknown> {
  const timestamp = dateRange(filters.from, filters.to);
  const filter: Record<string, unknown> = {};
  if (filters.cameraId) filter.cameraId = filters.cameraId;
  if (filters.outcome) filter.outcome = filters.outcome;
  if (filters.reviewStatus) filter.reviewStatus = filters.reviewStatus;
  if (timestamp) filter.timestamp = timestamp;
  if (filters.search) {
    const regex = new RegExp(escapeRegex(filters.search), 'i');
    filter.$or = [{ _id: regex }, { cameraName: regex }, { zone: regex }, { reason: regex }];
  }
  return filter;
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
      return next();
    }
    entry.count += 1;
    if (entry.count > limit) {
      response.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.'));
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
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return next();
    const origin = request.header('origin');
    if (origin && !config.allowedOrigins.has(origin)) {
      return next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'The request origin is not allowed.'));
    }
    next();
  });
  app.use(createFixedWindowLimiter(600, 60_000));

  app.get('/healthz', (_request, response) => response.json({
    status: 'ok',
    service: 'ptc-platform-api',
    time: new Date().toISOString(),
  }));

  app.get('/readyz', (_request, response) => {
    const ready = mongoose.connection.readyState === 1;
    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not-ready',
      database: ready ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    });
  });

  app.post('/api/auth/login', createFixedWindowLimiter(10, 15 * 60_000), asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await UserModel.findOne({
      username: input.username.toLowerCase(),
      enabled: true,
    }).select('+passwordHash').lean() as unknown as UserRecord | null;
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'The username or password is incorrect.');
    }
    const session = await createSession(String(user._id), config);
    setSessionCookie(response, session.token, session.expiresAt, config);
    response.json({
      token: '',
      expiresAt: session.expiresAt.toISOString(),
      user: {
        id: String(user._id),
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  }));

  app.get('/api/auth/me', authenticate(config), asyncHandler(async (_request, response) => {
    const auth = authContext(response);
    const session = await SessionModel.findById(auth.sessionId).lean();
    if (!session) throw new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Sign in again.');
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
      InspectionEventModel.countDocuments({}),
      InspectionEventModel.countDocuments({ outcome: 'completed' }),
      InspectionEventModel.countDocuments({ outcome: { $in: ['missed', 'incomplete'] } }),
      InspectionEventModel.countDocuments({ outcome: 'unresolved' }),
      InspectionEventModel.countDocuments({ reviewStatus: 'unreviewed' }),
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
    const cameras = await CameraModel.find({}).sort({ _id: 1 }).lean();
    response.json(cameras.map((camera) => ({
      id: String(camera._id),
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
    const metrics = await HealthMetricModel.find({}).sort({ _id: 1 }).lean();
    response.json(metrics.map((metric) => ({
      id: String(metric._id),
      label: metric.label,
      value: metric.value,
      detail: metric.detail,
      state: metric.state,
      checkedAt: asIso(metric.checkedAt),
    })));
  }));

  app.get('/api/events', asyncHandler(async (request, response) => {
    const query = eventQuerySchema.parse(request.query);
    const filter = buildEventFilter(query);
    const direction = query.sortDirection === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: direction, _id: direction };
    const total = await InspectionEventModel.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const documents = await InspectionEventModel.find(filter)
      .sort(sort)
      .skip((page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean() as unknown as EventRecord[];
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
    const event = await InspectionEventModel.findById(request.params.eventId).lean() as unknown as EventRecord | null;
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event could not be found.');
    response.json(serializeEvent(event));
  }));

  app.patch('/api/events/:eventId/review', requireRoles('supervisor', 'admin'), asyncHandler(async (request, response) => {
    const input = reviewSchema.parse(request.body);
    const auth = authContext(response);
    const before = await InspectionEventModel.findById(request.params.eventId).lean() as unknown as EventRecord | null;
    if (!before) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event could not be found.');
    if (before.version !== input.expectedVersion) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'This event was updated by another user. Refresh before saving your review.',
        { currentVersion: before.version },
      );
    }
    const reviewedAt = new Date();
    const updated = await InspectionEventModel.findOneAndUpdate(
      { _id: request.params.eventId, version: input.expectedVersion },
      {
        $set: {
          reviewStatus: input.reviewStatus,
          remarks: input.remarks,
          reviewedBy: auth.user.displayName,
          reviewedAt,
        },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true },
    ).lean() as unknown as EventRecord | null;
    if (!updated) {
      const current = await InspectionEventModel.findById(request.params.eventId).select('version').lean();
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'This event was updated by another user. Refresh before saving your review.',
        { currentVersion: current?.version },
      );
    }
    await AuditModel.create({
      actionId: randomUUID(),
      actorId: auth.user.id,
      actorDisplayName: auth.user.displayName,
      actorRole: auth.user.role,
      action: 'event.review.updated',
      targetType: 'inspectionEvent',
      targetId: String(updated._id),
      before: { reviewStatus: before.reviewStatus, remarks: before.remarks, version: before.version },
      after: { reviewStatus: updated.reviewStatus, remarks: updated.remarks, version: updated.version },
      correlationId: response.locals.correlationId as string,
      occurredAt: reviewedAt,
    });
    response.json(serializeEvent(updated));
  }));

  app.post('/api/exports/events', asyncHandler(async (request, response) => {
    const input = exportSchema.parse(request.body);
    const filter = buildEventFilter(input);
    const documents = await InspectionEventModel.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .limit(10_000)
      .lean() as unknown as EventRecord[];
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
      event._id,
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
