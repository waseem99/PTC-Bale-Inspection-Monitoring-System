import { randomUUID } from 'node:crypto';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createApp } from './app';
import { createCameraContractApp } from './camera-contract-app';
import { createCertificationApp } from './certification-app';
import type { AppConfig } from './config';
import { errorHandler } from './errors';
import { createIngestionReplayGuard } from './ingestion-replay-guard';
import { createPendingEvidenceFinalizer } from './pending-evidence-finalizer';
import { createProductionReadyApp } from './production-app';

function createRuntimeLimiter(limit: number, windowMs: number) {
  const entries = new Map<string, { count: number; resetAt: number }>();
  return (request: Request, response: Response, next: NextFunction): void => {
    const now = Date.now();
    if (entries.size > 10_000) {
      for (const [key, value] of entries) {
        if (value.resetAt <= now) entries.delete(key);
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
      response.status(429).json({ code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' });
      return;
    }
    next();
  };
}

export function createRuntimeApp(config: AppConfig): Express {
  const coreApp = createApp(config);
  const certificationApp = createCertificationApp(config);
  const cameraContractApp = createCameraContractApp(config);
  const productionApp = createProductionReadyApp(config, coreApp);
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((request, response, next) => {
    const supplied = request.header('X-Correlation-ID');
    const correlationId = supplied && supplied.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(supplied) ? supplied : randomUUID();
    response.locals.correlationId = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use((request, response, next) => {
    if (request.path.startsWith('/api/auth/')) {
      coreApp(request, response, next);
      return;
    }
    next();
  });

  app.use(createRuntimeLimiter(1_200, 60_000));
  app.use((request, response, next) => {
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      next();
      return;
    }
    const origin = request.header('origin');
    if (origin && !config.allowedOrigins.has(origin)) {
      response.status(403).json({ code: 'ORIGIN_NOT_ALLOWED', message: 'The request origin is not allowed.' });
      return;
    }
    next();
  });

  app.post(
    '/api/ingest/evidence/:eventId',
    express.raw({ type: ['image/jpeg', 'image/png', 'video/mp4'], limit: config.maxEvidenceBytes ?? 25 * 1024 * 1024 }),
    createPendingEvidenceFinalizer(config),
  );

  app.use((request, response, next) => {
    const cameraContractPath = request.path === '/api/camera-config'
      || request.path.startsWith('/api/camera-config/')
      || request.path.startsWith('/api/ingest/cameras/');
    if (cameraContractPath) {
      cameraContractApp(request, response, next);
      return;
    }
    next();
  });

  app.use((request, response, next) => {
    const certificationPath = request.path.startsWith('/api/ingest/evidence/')
      || request.path.startsWith('/api/evidence/')
      || request.path.startsWith('/api/catalog/')
      || request.path.startsWith('/api/operations/');
    if (certificationPath) {
      certificationApp(request, response, next);
      return;
    }
    next();
  });

  app.post(
    '/api/ingest/events',
    express.json({ limit: '512kb', strict: true }),
    createIngestionReplayGuard(config),
  );
  app.use(productionApp);
  app.use(errorHandler);
  return app;
}
