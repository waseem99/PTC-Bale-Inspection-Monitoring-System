import { loadConfig } from '../config';
import {
  establishOidcApplicationSession,
  mapOidcRole,
  validateOidcIdentity,
  type ApplicationIdentityUser,
  type VerifiedOidcIdentity,
} from '../identity-provider';

const databaseUrl = 'postgresql://ptc_app:test-only@127.0.0.1:5432/ptc_test?schema=public';

function oidcConfig(overrides: NodeJS.ProcessEnv = {}) {
  return loadConfig({
    DATABASE_URL: databaseUrl,
    AUTH_MODE: 'oidc',
    OIDC_ISSUER: 'https://login.microsoftonline.com/ptc-tenant/v2.0',
    OIDC_CLIENT_ID: 'ptc-bale-app-client-id',
    OIDC_CALLBACK_URL: 'https://ptc.example.com/api/auth/oidc/callback',
    OIDC_AUDIENCE: 'api://ptc-bale',
    OIDC_VIEWER_GROUPS: 'group-viewers',
    OIDC_SUPERVISOR_GROUPS: 'group-supervisors',
    OIDC_ADMIN_GROUPS: 'group-admins',
    ...overrides,
  });
}

function identity(overrides: Partial<VerifiedOidcIdentity> = {}): VerifiedOidcIdentity {
  return {
    issuer: 'https://login.microsoftonline.com/ptc-tenant/v2.0',
    audience: 'api://ptc-bale',
    subject: 'entra-object-001',
    username: 'viewer',
    displayName: 'PTC Viewer',
    groups: ['group-viewers'],
    ...overrides,
  };
}

it('keeps local authentication as the default PoC mode', () => {
  const config = loadConfig({ DATABASE_URL: databaseUrl });
  expect(config.authMode).toBe('local');
  expect(config.oidc).toBeUndefined();
});

it('fails closed when OIDC mode is selected without complete protected configuration', () => {
  expect(() => loadConfig({ DATABASE_URL: databaseUrl, AUTH_MODE: 'oidc' }))
    .toThrow('AUTH_MODE=oidc requires OIDC_ISSUER');
  expect(() => oidcConfig({ OIDC_CALLBACK_URL: 'http://ptc.example.com/callback' }))
    .toThrow('OIDC_CALLBACK_URL must use HTTPS');
});

it('rejects overlapping group mappings during configuration', () => {
  expect(() => oidcConfig({ OIDC_VIEWER_GROUPS: 'shared-group', OIDC_ADMIN_GROUPS: 'shared-group' }))
    .toThrow("OIDC group mapping 'shared-group' is assigned to more than one application role");
});

it('maps external groups only to the existing Viewer, Supervisor and Admin roles', () => {
  const config = oidcConfig();
  expect(mapOidcRole(['group-viewers'], config)).toBe('viewer');
  expect(mapOidcRole(['group-supervisors'], config)).toBe('supervisor');
  expect(mapOidcRole(['group-admins'], config)).toBe('admin');
  expect(() => mapOidcRole(['unknown-group'], config)).toThrow(expect.objectContaining({ code: 'OIDC_ROLE_UNMAPPED' }));
  expect(() => mapOidcRole(['group-viewers', 'group-admins'], config)).toThrow(expect.objectContaining({ code: 'OIDC_ROLE_AMBIGUOUS' }));
});

it.each([
  ['issuer', identity({ issuer: 'https://evil.example.com' }), 'state-123', 'OIDC_ISSUER_INVALID'],
  ['audience', identity({ audience: 'api://wrong-audience' }), 'state-123', 'OIDC_AUDIENCE_INVALID'],
  ['state', identity(), 'wrong-state', 'OIDC_STATE_INVALID'],
])('rejects invalid %s before application session creation', (_label, externalIdentity, state, code) => {
  expect(() => validateOidcIdentity(externalIdentity, state, 'state-123', oidcConfig()))
    .toThrow(expect.objectContaining({ code }));
});

it('creates an application session only for an enabled mapped user with the same application role', async () => {
  const config = oidcConfig();
  const user: ApplicationIdentityUser = {
    id: 'user-viewer',
    username: 'viewer',
    displayName: 'Viewer User',
    role: 'viewer',
    enabled: true,
  };
  const createSession = jest.fn().mockResolvedValue({
    token: 'mock-application-session-token',
    expiresAt: new Date('2026-11-04T00:00:00.000Z'),
  });

  const result = await establishOidcApplicationSession(
    { identity: identity(), state: 'state-123', expectedState: 'state-123' },
    config,
    {
      findUserByUsername: jest.fn().mockResolvedValue(user),
      createSession,
    },
  );

  expect(result.user).toEqual({
    id: 'user-viewer',
    username: 'viewer',
    displayName: 'Viewer User',
    role: 'viewer',
  });
  expect(result.externalSubject).toBe('entra-object-001');
  expect(createSession).toHaveBeenCalledTimes(1);
  expect(createSession).toHaveBeenCalledWith('user-viewer');
});

it.each([
  ['unknown user', null, identity(), 'OIDC_USER_UNMAPPED'],
  ['disabled user', { id: 'u1', username: 'viewer', displayName: 'Viewer', role: 'viewer' as const, enabled: false }, identity(), 'OIDC_USER_DISABLED'],
  ['role mismatch', { id: 'u1', username: 'viewer', displayName: 'Viewer', role: 'supervisor' as const, enabled: true }, identity(), 'OIDC_ROLE_MISMATCH'],
])('denies %s without creating a session', async (_label, user, externalIdentity, code) => {
  const createSession = jest.fn();
  await expect(establishOidcApplicationSession(
    { identity: externalIdentity, state: 'state-123', expectedState: 'state-123' },
    oidcConfig(),
    {
      findUserByUsername: jest.fn().mockResolvedValue(user),
      createSession,
    },
  )).rejects.toMatchObject({ code });
  expect(createSession).not.toHaveBeenCalled();
});
