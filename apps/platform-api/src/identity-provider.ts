import { timingSafeEqual } from 'node:crypto';
import type { AppConfig, OidcConfig } from './config';
import type { Role } from './domain';

export class ExternalIdentityError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ExternalIdentityError';
    this.code = code;
  }
}

export type VerifiedOidcIdentity = {
  issuer: string;
  audience: string | string[];
  subject: string;
  username: string;
  displayName?: string;
  groups: string[];
};

export type ApplicationIdentityUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  enabled: boolean;
};

export type ApplicationSession = {
  token: string;
  expiresAt: Date;
};

export type ExternalIdentityDependencies = {
  findUserByUsername: (username: string) => Promise<ApplicationIdentityUser | null>;
  createSession: (userId: string) => Promise<ApplicationSession>;
};

export type ValidatedExternalIdentity = {
  subject: string;
  username: string;
  role: Role;
};

function oidcConfig(config: AppConfig): OidcConfig {
  if ((config.authMode ?? 'local') !== 'oidc' || !config.oidc) {
    throw new ExternalIdentityError('OIDC_NOT_ENABLED', 'Enterprise identity mode is not enabled.');
  }
  return config.oidc;
}

function secureEquals(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function expectedAudiencePresent(audience: string | string[], expected: string): boolean {
  return Array.isArray(audience) ? audience.includes(expected) : audience === expected;
}

export function mapOidcRole(groups: string[], config: AppConfig): Role {
  const oidc = oidcConfig(config);
  const memberships = new Set(groups);
  const matched = (Object.entries(oidc.roleGroups) as [Role, string[]][])
    .filter(([, configuredGroups]) => configuredGroups.some((group) => memberships.has(group)))
    .map(([role]) => role);

  const unique = [...new Set(matched)];
  if (unique.length === 0) {
    throw new ExternalIdentityError('OIDC_ROLE_UNMAPPED', 'The corporate identity is not mapped to an application role.');
  }
  if (unique.length > 1) {
    throw new ExternalIdentityError('OIDC_ROLE_AMBIGUOUS', 'The corporate identity maps to more than one application role.');
  }
  return unique[0] as Role;
}

export function validateOidcIdentity(
  identity: VerifiedOidcIdentity,
  state: string,
  expectedState: string,
  config: AppConfig,
): ValidatedExternalIdentity {
  const oidc = oidcConfig(config);
  if (!secureEquals(identity.issuer, oidc.issuer)) {
    throw new ExternalIdentityError('OIDC_ISSUER_INVALID', 'The external identity issuer is not trusted.');
  }
  if (!expectedAudiencePresent(identity.audience, oidc.audience)) {
    throw new ExternalIdentityError('OIDC_AUDIENCE_INVALID', 'The external identity audience is invalid.');
  }
  if (!state || !expectedState || !secureEquals(state, expectedState)) {
    throw new ExternalIdentityError('OIDC_STATE_INVALID', 'The external identity state validation failed.');
  }
  if (!identity.subject.trim()) {
    throw new ExternalIdentityError('OIDC_SUBJECT_INVALID', 'The external identity subject is missing.');
  }
  const username = identity.username.trim().toLowerCase();
  if (!username || username.length > 100) {
    throw new ExternalIdentityError('OIDC_USERNAME_INVALID', 'The mapped external username is invalid.');
  }

  return {
    subject: identity.subject,
    username,
    role: mapOidcRole(identity.groups, config),
  };
}

export async function establishOidcApplicationSession(
  input: {
    identity: VerifiedOidcIdentity;
    state: string;
    expectedState: string;
  },
  config: AppConfig,
  dependencies: ExternalIdentityDependencies,
): Promise<{
  user: Omit<ApplicationIdentityUser, 'enabled'>;
  session: ApplicationSession;
  externalSubject: string;
}> {
  const validated = validateOidcIdentity(input.identity, input.state, input.expectedState, config);
  const user = await dependencies.findUserByUsername(validated.username);
  if (!user) {
    throw new ExternalIdentityError('OIDC_USER_UNMAPPED', 'The corporate identity is not mapped to an application user.');
  }
  if (!user.enabled) {
    throw new ExternalIdentityError('OIDC_USER_DISABLED', 'The mapped application user is disabled.');
  }
  if (user.role !== validated.role) {
    throw new ExternalIdentityError('OIDC_ROLE_MISMATCH', 'The corporate role mapping does not match the application authorization role.');
  }

  const session = await dependencies.createSession(user.id);
  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
    session,
    externalSubject: validated.subject,
  };
}
