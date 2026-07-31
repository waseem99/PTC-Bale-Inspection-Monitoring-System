import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { createApp } from './app';
import type { AppConfig } from './config';
import { createIngestionReplayGuard } from './ingestion-replay-guard';
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

/**
 * Preserves the established authentication endpoints while adding the
 * production-readiness routes ahead of the legacy API fallback.
 */
export function createRuntimeApp(config: AppConfig): Express {
  const coreApp = createApp(config);
  const productionApp = createProductionReadyApp(config, coreApp);
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

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
    '/api/ingest/events',
    express.json({ limit: '512kb', strict: true }),
    createIngestionReplayGuard(config),
  );
  app.use(productionApp);
  return app;
}
