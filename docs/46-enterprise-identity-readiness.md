# Enterprise Identity (Entra/OIDC) Readiness

## Decision

The approved PoC authentication baseline remains local/offline-capable authentication with server-side Viewer, Supervisor and Admin RBAC. Enterprise identity is a bounded production-readiness integration seam, not a replacement for the accepted PoC access model and not a project-closure blocker when PTC IAM inputs are unavailable.

## Implemented readiness boundary

The platform now supports two configuration modes:

- `AUTH_MODE=local` — default and current PoC behavior.
- `AUTH_MODE=oidc` — enterprise-identity mode for later activation against PTC Microsoft Entra ID / OIDC-compatible identity infrastructure.

Selecting OIDC mode requires protected server-side configuration for:

- issuer / tenant authority;
- client/application ID;
- callback URL;
- expected audience;
- username claim name;
- role/group claim name;
- explicit group/claim mappings to Viewer, Supervisor and/or Admin.

Issuer and callback URLs must use HTTPS. Incomplete configuration, duplicate cross-role group mappings, untrusted issuer, invalid audience, invalid callback state, unmapped users, disabled users, ambiguous group mappings and local-role mismatches all fail closed.

## Authorization model

OIDC does not replace application authorization. A corporate identity must map to an existing enabled application user and exactly one existing application role. The corporate group-derived role must match that user's application role before an application session can be created.

This preserves the existing server-side authorization model and avoids silent privilege escalation from external claims.

## Provider adapter boundary

`src/identity-provider.ts` is intentionally a post-verification bridge. It consumes an identity only after the eventual OIDC adapter has cryptographically validated the provider response/token. It does **not** parse unsigned claims, implement OAuth/OIDC cryptography, or accept raw identity claims from a public endpoint.

The real Entra authorization-code/token exchange must be bound during PTC activation using the approved tenant metadata and application registration. Until that occurs, `AUTH_MODE=local` remains the production/PoC setting. If OIDC mode is selected, local login is blocked rather than silently falling back.

## PTC activation inputs

PTC must provide or approve:

1. Entra tenant/issuer.
2. App registration and client/application ID.
3. Approved redirect/callback URL.
4. Expected audience/resource identifier.
5. Approved user identifier claim.
6. Entra group/role claim and mappings to Viewer/Supervisor/Admin.
7. MFA and Conditional Access policy.
8. The approved runtime secret/certificate method if the selected OIDC client flow requires confidential-client credentials.

## Explicit ownership boundary

PTC/Entra owns MFA, Conditional Access, corporate user lifecycle and tenant policy. The application owns its local session, application RBAC and authorization decisions after successful corporate authentication.

No custom OTP/MFA, Conditional Access engine, password synchronization, PAM or identity lifecycle platform is implemented by this project.

## Closure status

**Code readiness: complete.**

**Real Entra activation: pending PTC IAM configuration.**

A real tenant is not required to close the software-readiness issue. Activation and live IAM acceptance should be recorded as a PTC production dependency if not supplied before final project closure.
