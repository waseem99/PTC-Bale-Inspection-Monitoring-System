import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).optional().transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  SESSION_COOKIE_NAME: z.string().min(1).default('ptc_session'),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(168).default(8),
  COOKIE_SECURE: booleanFromString,
  ALLOWED_ORIGINS: z.string().default('http://localhost:8080,http://localhost:4173'),
  TRUST_PROXY: booleanFromString,
  SEED_DEMO_PASSWORD: z.string().min(12).optional(),
  SEED_VIEWER_PASSWORD: z.string().min(12).optional(),
  SEED_SUPERVISOR_PASSWORD: z.string().min(12).optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
  INGESTION_SERVICE_TOKEN: z.string().min(24).max(512).optional(),
  EVIDENCE_ROOT: z.string().min(1).default('/var/lib/ptc-bale/evidence'),
  MAX_EVIDENCE_BYTES: z.coerce.number().int().min(1024).max(100 * 1024 * 1024).default(25 * 1024 * 1024),
  BUILD_VERSION: z.string().min(1).max(128).default('development'),
  BUILD_COMMIT: z.string().min(1).max(128).default('unknown'),
  SCHEMA_VERSION: z.string().min(1).max(128).default('20260731-production-readiness'),
  SIMULATOR_ENABLED: booleanFromString,
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  sessionCookieName: string;
  sessionTtlHours: number;
  cookieSecure: boolean;
  allowedOrigins: Set<string>;
  trustProxy: boolean;
  seedPasswords: { viewer?: string; supervisor?: string; admin?: string };
  ingestionServiceToken?: string;
  evidenceRoot?: string;
  maxEvidenceBytes?: number;
  buildVersion?: string;
  buildCommit?: string;
  schemaVersion?: string;
  simulatorEnabled?: boolean;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  if (environment.DATABASE_URL === undefined) {
    throw new Error('DATABASE_URL must be explicitly set for the platform API.');
  }
  const parsed = schema.parse(environment);
  if (parsed.NODE_ENV === 'production' && environment.COOKIE_SECURE === undefined) {
    throw new Error('COOKIE_SECURE must be explicitly set for a production deployment. Use true behind HTTPS.');
  }
  if (parsed.NODE_ENV === 'production' && parsed.SIMULATOR_ENABLED) {
    throw new Error('SIMULATOR_ENABLED must remain false in production.');
  }

  const common = parsed.SEED_DEMO_PASSWORD;
  const viewer = parsed.SEED_VIEWER_PASSWORD ?? common;
  const supervisor = parsed.SEED_SUPERVISOR_PASSWORD ?? common;
  const admin = parsed.SEED_ADMIN_PASSWORD ?? common;
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    sessionCookieName: parsed.SESSION_COOKIE_NAME,
    sessionTtlHours: parsed.SESSION_TTL_HOURS,
    cookieSecure: parsed.COOKIE_SECURE,
    allowedOrigins: new Set(parsed.ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean)),
    trustProxy: parsed.TRUST_PROXY,
    seedPasswords: {
      ...(viewer ? { viewer } : {}),
      ...(supervisor ? { supervisor } : {}),
      ...(admin ? { admin } : {}),
    },
    ...(parsed.INGESTION_SERVICE_TOKEN ? { ingestionServiceToken: parsed.INGESTION_SERVICE_TOKEN } : {}),
    evidenceRoot: parsed.EVIDENCE_ROOT,
    maxEvidenceBytes: parsed.MAX_EVIDENCE_BYTES,
    buildVersion: parsed.BUILD_VERSION,
    buildCommit: parsed.BUILD_COMMIT,
    schemaVersion: parsed.SCHEMA_VERSION,
    simulatorEnabled: parsed.SIMULATOR_ENABLED,
  };
}
