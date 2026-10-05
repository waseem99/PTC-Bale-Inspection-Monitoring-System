import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AppConfig } from './config';
import type { Role } from './domain';

export type SecurityEventType =
  | 'auth.login.succeeded'
  | 'auth.login.failed'
  | 'auth.logout'
  | 'auth.session.expired'
  | 'auth.session.revoked'
  | 'auth.user.disabled'
  | 'auth.access.denied'
  | 'origin.denied'
  | 'rate_limit.triggered'
  | 'ingestion.credential.invalid'
  | 'event.review.updated'
  | 'evidence.metadata.accessed'
  | 'evidence.content.accessed'
  | 'report.generated'
  | 'export.generated'
  | 'operational.health.changed'
  | 'operational.service.failure';

export type SecuritySeverity = 'info' | 'warning' | 'error';
export type SecurityResult = 'success' | 'denied' | 'failure';

type SafeActor = {
  id: string;
  role: Role;
};

type SecurityEventInput = {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  correlationId?: string | undefined;
  actor?: SafeActor | undefined;
  targetId?: string | undefined;
  result: SecurityResult;
  reasonCode?: string | undefined;
  source?: string | undefined;
};

type CapturedResponse = {
  code?: string;
  user?: { id?: string; role?: Role };
};

type RuntimeAuth = {
  user?: { id?: string; role?: Role };
};

const SAFE_TEXT = /^[A-Za-z0-9._:@/-]{1,200}$/;

function safeField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return SAFE_TEXT.test(value) ? value : undefined;
}

export function emitSecurityEvent(input: SecurityEventInput): void {
  const record = {
    timestamp: new Date().toISOString(),
    recordType: 'security_event',
    eventType: input.eventType,
    severity: input.severity,
    correlationId: safeField(input.correlationId),
    actorId: safeField(input.actor?.id),
    actorRole: input.actor?.role,
    targetId: safeField(input.targetId),
    source: safeField(input.source) ?? 'ptc-platform-api',
    result: input.result,
    reasonCode: safeField(input.reasonCode),
  };
  console.log(JSON.stringify(record));
}

function actorFromLocals(response: Response, captured?: CapturedResponse): SafeActor | undefined {
  const runtime = response.locals.auth as RuntimeAuth | undefined;
  const id = runtime?.user?.id ?? captured?.user?.id;
  const role = runtime?.user?.role ?? captured?.user?.role;
  if (!id || !role) return undefined;
  return { id, role };
}

function pathTarget(path: string, pattern: RegExp): string | undefined {
  const match = path.match(pattern);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 400;
}

export function createSecurityEventObservability(_config: AppConfig): RequestHandler {
  const healthStates = new Map<string, string>();

  return (request: Request, response: Response, next: NextFunction): void => {
    let captured: CapturedResponse | undefined;
    const originalJson = response.json.bind(response);
    response.json = ((body: unknown) => {
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const candidate = body as Record<string, unknown>;
        const user = candidate.user && typeof candidate.user === 'object'
          ? candidate.user as Record<string, unknown>
          : undefined;
        captured = {
          ...(typeof candidate.code === 'string' ? { code: candidate.code } : {}),
          ...(user && typeof user.id === 'string' && typeof user.role === 'string'
            ? { user: { id: user.id, role: user.role as Role } }
            : {}),
        };
      }
      return originalJson(body);
    }) as Response['json'];

    response.on('finish', () => {
      const status = response.statusCode;
      const path = request.path;
      const correlationId = response.locals.correlationId as string | undefined;
      const actor = actorFromLocals(response, captured);
      const code = captured?.code;

      if (path === '/api/auth/login') {
        emitSecurityEvent({
          eventType: isSuccess(status) ? 'auth.login.succeeded' : 'auth.login.failed',
          severity: isSuccess(status) ? 'info' : 'warning',
          correlationId,
          actor,
          result: isSuccess(status) ? 'success' : 'denied',
          reasonCode: isSuccess(status) ? 'AUTHENTICATED' : code ?? `HTTP_${status}`,
        });
      }

      if (path === '/api/auth/logout' && status === 204) {
        emitSecurityEvent({ eventType: 'auth.logout', severity: 'info', correlationId, actor, result: 'success', reasonCode: 'LOGOUT' });
        emitSecurityEvent({ eventType: 'auth.session.revoked', severity: 'info', correlationId, actor, result: 'success', reasonCode: 'LOGOUT_REVOCATION' });
      }

      if (code === 'SESSION_EXPIRED') {
        emitSecurityEvent({ eventType: 'auth.session.expired', severity: 'warning', correlationId, actor, result: 'denied', reasonCode: code });
      } else if (code === 'USER_DISABLED') {
        emitSecurityEvent({ eventType: 'auth.user.disabled', severity: 'warning', correlationId, actor, result: 'denied', reasonCode: code });
      } else if (code === 'FORBIDDEN') {
        emitSecurityEvent({ eventType: 'auth.access.denied', severity: 'warning', correlationId, actor, result: 'denied', reasonCode: code, targetId: pathTarget(path, /^\/api\/events\/([^/]+)/) });
      } else if (code === 'ORIGIN_NOT_ALLOWED') {
        emitSecurityEvent({ eventType: 'origin.denied', severity: 'warning', correlationId, actor, result: 'denied', reasonCode: code });
      } else if (code === 'RATE_LIMITED') {
        emitSecurityEvent({ eventType: 'rate_limit.triggered', severity: 'warning', correlationId, actor, result: 'denied', reasonCode: code });
      } else if (code === 'INVALID_SERVICE_CREDENTIAL') {
        emitSecurityEvent({ eventType: 'ingestion.credential.invalid', severity: 'warning', correlationId, result: 'denied', reasonCode: code });
      }

      if (isSuccess(status) && request.method === 'PATCH' && /^\/api\/events\/[^/]+\/review$/.test(path)) {
        emitSecurityEvent({
          eventType: 'event.review.updated', severity: 'info', correlationId, actor, result: 'success',
          reasonCode: 'REVIEW_UPDATED', targetId: pathTarget(path, /^\/api\/events\/([^/]+)\/review$/),
        });
      }

      if (isSuccess(status) && request.method === 'GET' && /^\/api\/events\/[^/]+\/evidence$/.test(path)) {
        emitSecurityEvent({
          eventType: 'evidence.metadata.accessed', severity: 'info', correlationId, actor, result: 'success',
          reasonCode: 'EVIDENCE_METADATA_READ', targetId: pathTarget(path, /^\/api\/events\/([^/]+)\/evidence$/),
        });
      }

      if (isSuccess(status) && request.method === 'GET' && /^\/api\/evidence\/[^/]+\/content$/.test(path)) {
        emitSecurityEvent({
          eventType: 'evidence.content.accessed', severity: 'info', correlationId, actor, result: 'success',
          reasonCode: 'EVIDENCE_CONTENT_READ', targetId: pathTarget(path, /^\/api\/evidence\/([^/]+)\/content$/),
        });
      }

      if (isSuccess(status) && request.method === 'GET' && path === '/api/reports/pdf') {
        emitSecurityEvent({ eventType: 'report.generated', severity: 'info', correlationId, actor, result: 'success', reasonCode: 'PDF_REPORT' });
      }
      if (isSuccess(status) && request.method === 'POST' && path === '/api/exports/events') {
        emitSecurityEvent({ eventType: 'export.generated', severity: 'info', correlationId, actor, result: 'success', reasonCode: 'CSV_EXPORT' });
      }

      if (isSuccess(status) && request.method === 'POST' && path === '/api/ingest/health') {
        const body = request.body as { id?: unknown; state?: unknown } | undefined;
        if (body && typeof body.id === 'string' && typeof body.state === 'string') {
          const previous = healthStates.get(body.id);
          healthStates.set(body.id, body.state);
          if (previous && previous !== body.state) {
            emitSecurityEvent({
              eventType: 'operational.health.changed',
              severity: body.state === 'critical' ? 'error' : body.state === 'warning' ? 'warning' : 'info',
              correlationId,
              targetId: body.id,
              result: body.state === 'critical' ? 'failure' : 'success',
              reasonCode: `${previous}_TO_${body.state}`.toUpperCase(),
            });
          }
        }
      }

      if (status >= 500 && (path === '/readyz' || path.startsWith('/api/evidence/') || path.startsWith('/api/operations/'))) {
        emitSecurityEvent({
          eventType: 'operational.service.failure', severity: 'error', correlationId, actor, result: 'failure', reasonCode: code ?? `HTTP_${status}`,
        });
      }
    });
    next();
  };
}
