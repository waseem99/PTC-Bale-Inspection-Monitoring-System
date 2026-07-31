import express, { type Express } from 'express';
import { createApp } from './app';
import type { AppConfig } from './config';
import { createProductionReadyApp } from './production-app';

/**
 * Preserves the established authentication endpoints while adding the
 * production-readiness routes ahead of the legacy API fallback.
 */
export function createRuntimeApp(config: AppConfig): Express {
  const coreApp = createApp(config);
  const productionApp = createProductionReadyApp(config, coreApp);
  const app = express();
  app.disable('x-powered-by');

  app.use((request, response, next) => {
    if (request.path.startsWith('/api/auth/')) {
      coreApp(request, response, next);
      return;
    }
    next();
  });

  app.use(productionApp);
  return app;
}
