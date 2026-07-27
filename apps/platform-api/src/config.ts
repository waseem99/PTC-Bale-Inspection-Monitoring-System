import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).optional().transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().startsWith('postgresql://').default('postgresql://ptc_app:ptc_local_change_me@127.0.0.1:5432/ptc_bale?schema=public'),
  SESSION_COOKIE_NAME: z.string().min(1).default('ptc_session'),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(168).default(8),
  COOKIE_SECURE: booleanFromString,
  ALLOWED_ORIGINS: z.string().default('http://localhost:8080,http://localhost:4173'),
  TRUST_PROXY: booleanFromString,
  SEED_DEMO_PASSWORD: z.string().min(12).optional(),
  SEED_VIEWER_PASSWORD: z.string().min(12).optional(),
  SEED_SUPERVISOR_PASSWORD: z.string().min(12).optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
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
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.parse(environment);
  if (parsed.NODE_ENV === 'production' && environment.DATABASE_URL === undefined) {
    throw new Error('DATABASE_URL must be explicitly set for a production deployment.');
  }
  if (parsed.NODE_ENV === 'production' && environment.COOKIE_SECURE === undefined) {
    throw new Error('COOKIE_SECURE must be explicitly set for a production deployment. Use true behind HTTPS.');
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
  };
}
