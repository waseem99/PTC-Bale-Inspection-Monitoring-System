import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).optional().transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  SESSION_COOKIE_NAME: z.string().min(1).default('ptc_session'),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(720).default(720),
  SESSION_ABSOLUTE_TTL_HOURS: z.coerce.number().positive().max(720).default(720),
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
  AUTH_MODE: z.enum(['local', 'oidc']).default('local'),
  OIDC_ISSUER: z.string().min(1).max(500).optional(),
  OIDC_CLIENT_ID: z.string().min(1).max(256).optional(),
  OIDC_CALLBACK_URL: z.string().min(1).max(500).optional(),
  OIDC_AUDIENCE: z.string().min(1).max(256).optional(),
  OIDC_USERNAME_CLAIM: z.string().regex(/^[A-Za-z0-9_.:-]+$/).default('preferred_username'),
  OIDC_ROLE_CLAIM: z.string().regex(/^[A-Za-z0-9_.:-]+$/).default('groups'),
  OIDC_VIEWER_GROUPS: z.string().optional(),
  OIDC_SUPERVISOR_GROUPS: z.string().optional(),
  OIDC_ADMIN_GROUPS: z.string().optional(),
});

export type OidcConfig = {
  issuer: string;
  clientId: string;
  callbackUrl: string;
  audience: string;
  usernameClaim: string;
  roleClaim: string;
  roleGroups: {
    viewer: string[];
    supervisor: string[];
    admin: string[];
  };
};

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  sessionCookieName: string;
  sessionTtlHours: number;
  sessionAbsoluteTtlHours: number;
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
  authMode?: 'local' | 'oidc';
  oidc?: OidcConfig;
};

function csvValues(value: string | undefined): string[] {
  return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

function requiredOidcValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`AUTH_MODE=oidc requires ${name} to be explicitly set.`);
  return value;
}

function requireHttps(value: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
  if (parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS.`);
  return value;
}

function buildOidcConfig(parsed: z.infer<typeof schema>): OidcConfig | undefined {
  if (parsed.AUTH_MODE !== 'oidc') return undefined;

  const issuer = requireHttps(requiredOidcValue(parsed.OIDC_ISSUER, 'OIDC_ISSUER'), 'OIDC_ISSUER');
  const clientId = requiredOidcValue(parsed.OIDC_CLIENT_ID, 'OIDC_CLIENT_ID');
  const callbackUrl = requireHttps(requiredOidcValue(parsed.OIDC_CALLBACK_URL, 'OIDC_CALLBACK_URL'), 'OIDC_CALLBACK_URL');
  const audience = requiredOidcValue(parsed.OIDC_AUDIENCE, 'OIDC_AUDIENCE');
  const roleGroups = {
    viewer: csvValues(parsed.OIDC_VIEWER_GROUPS),
    supervisor: csvValues(parsed.OIDC_SUPERVISOR_GROUPS),
    admin: csvValues(parsed.OIDC_ADMIN_GROUPS),
  };

  if (!roleGroups.viewer.length && !roleGroups.supervisor.length && !roleGroups.admin.length) {
    throw new Error('AUTH_MODE=oidc requires at least one OIDC role-group mapping.');
  }

  const assigned = new Map<string, string>();
  for (const [role, groups] of Object.entries(roleGroups)) {
    for (const group of groups) {
      const existing = assigned.get(group);
      if (existing && existing !== role) {
        throw new Error(`OIDC group mapping '${group}' is assigned to more than one application role.`);
      }
      assigned.set(group, role);
    }
  }

  return {
    issuer,
    clientId,
    callbackUrl,
    audience,
    usernameClaim: parsed.OIDC_USERNAME_CLAIM,
    roleClaim: parsed.OIDC_ROLE_CLAIM,
    roleGroups,
  };
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  if (environment.DATABASE_URL === undefined) {
    throw new Error('DATABASE_URL must be explicitly set for the platform API.');
  }
  const parsed = schema.parse(environment);
  if (parsed.NODE_ENV === 'production' && environment.COOKIE_SECURE === undefined) {
    throw new Error('COOKIE_SECURE must be explicitly set for a production deployment. Use true behind HTTPS.');
  }
  if (parsed.SESSION_ABSOLUTE_TTL_HOURS < parsed.SESSION_TTL_HOURS) {
    throw new Error('SESSION_ABSOLUTE_TTL_HOURS must be greater than or equal to SESSION_TTL_HOURS.');
  }
  if (parsed.NODE_ENV === 'production' && parsed.SIMULATOR_ENABLED) {
    throw new Error('SIMULATOR_ENABLED must remain false in production.');
  }

  const common = parsed.SEED_DEMO_PASSWORD;
  const viewer = parsed.SEED_VIEWER_PASSWORD ?? common;
  const supervisor = parsed.SEED_SUPERVISOR_PASSWORD ?? common;
  const admin = parsed.SEED_ADMIN_PASSWORD ?? common;
  const oidc = buildOidcConfig(parsed);
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    sessionCookieName: parsed.SESSION_COOKIE_NAME,
    sessionTtlHours: parsed.SESSION_TTL_HOURS,
    sessionAbsoluteTtlHours: parsed.SESSION_ABSOLUTE_TTL_HOURS,
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
    authMode: parsed.AUTH_MODE,
    ...(oidc ? { oidc } : {}),
  };
}
