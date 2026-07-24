import type { ApiErrorPayload, AppRuntime, Camera, HealthMetric, InspectionEvent, KpiSummary, PaginatedResponse, Session } from '../types';
import { randomCorrelationId, sleep } from '../utils';
export const DEFAULT_TIMEOUT_MS = 12_000;
export const runtime: AppRuntime = {
  dataMode: import.meta.env.VITE_DATA_MODE === 'live' ? 'live' : 'mock',
  environmentName: import.meta.env.VITE_ENVIRONMENT_NAME ?? 'Development Demo',
  buildVersion: import.meta.env.VITE_BUILD_VERSION ?? '1.0.0-dev',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly correlationId: string;
  readonly details?: Record<string, unknown>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status;
    this.correlationId = payload.correlationId;
    if (payload.details) this.details = payload.details;
  }
}

export function asApiError(error: unknown, correlationId: string): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({ code: 'REQUEST_ABORTED', message: 'The request was cancelled.', status: 499, correlationId });
  }
  if (!navigator.onLine) {
    return new ApiError({ code: 'NETWORK_OFFLINE', message: 'The browser is offline. Reconnect and try again.', status: 0, correlationId });
  }
  return new ApiError({ code: 'UNEXPECTED_ERROR', message: error instanceof Error ? error.message : 'An unexpected error occurred.', status: 500, correlationId });
}

export function mergeSignals(signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort('timeout'), timeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  return { signal: controller.signal, cleanup: () => { window.clearTimeout(timeout); signal?.removeEventListener('abort', onAbort); } };
}

export function parseJsonSafely(value: string): unknown {
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(`Invalid response: ${field} must be a string.`);
}

function assertNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid response: ${field} must be a finite number.`);
}

export function assertInspectionEvent(value: unknown): asserts value is InspectionEvent {
  if (!isRecord(value)) throw new Error('Invalid response: event must be an object.');
  assertString(value.id, 'event.id'); assertString(value.timestamp, 'event.timestamp'); assertString(value.cameraId, 'event.cameraId');
  assertString(value.cameraName, 'event.cameraName'); assertString(value.zone, 'event.zone'); assertString(value.outcome, 'event.outcome');
  assertNumber(value.confidence, 'event.confidence'); assertString(value.reviewStatus, 'event.reviewStatus'); assertNumber(value.version, 'event.version');
  if (!Array.isArray(value.steps)) throw new Error('Invalid response: event.steps must be an array.');
}

export function assertPaginatedEvents(value: unknown): asserts value is PaginatedResponse<InspectionEvent> {
  if (!isRecord(value)) throw new Error('Invalid response: event page must be an object.');
  if (!Array.isArray(value.items)) throw new Error('Invalid response: items must be an array.');
  for (const item of value.items) assertInspectionEvent(item);
  assertNumber(value.page, 'page'); assertNumber(value.pageSize, 'pageSize'); assertNumber(value.total, 'total'); assertNumber(value.totalPages, 'totalPages');
}

export function assertKpiSummary(value: unknown): asserts value is KpiSummary {
  if (!isRecord(value)) throw new Error('Invalid response: summary must be an object.');
  assertNumber(value.total, 'summary.total'); assertNumber(value.completed, 'summary.completed'); assertNumber(value.violations, 'summary.violations');
  assertNumber(value.unresolved, 'summary.unresolved'); assertNumber(value.unreviewed, 'summary.unreviewed'); assertNumber(value.completedRate, 'summary.completedRate');
  assertString(value.periodLabel, 'summary.periodLabel'); assertString(value.generatedAt, 'summary.generatedAt');
}

export function assertCameras(value: unknown): asserts value is Camera[] {
  if (!Array.isArray(value)) throw new Error('Invalid response: cameras must be an array.');
  for (const camera of value) {
    if (!isRecord(camera)) throw new Error('Invalid response: camera must be an object.');
    assertString(camera.id, 'camera.id'); assertString(camera.name, 'camera.name'); assertString(camera.zone, 'camera.zone');
    assertString(camera.status, 'camera.status'); assertString(camera.aiStatus, 'camera.aiStatus'); assertString(camera.lastFrameAt, 'camera.lastFrameAt');
    assertNumber(camera.fps, 'camera.fps'); assertNumber(camera.todayEvents, 'camera.todayEvents');
  }
}

export function assertHealthMetrics(value: unknown): asserts value is HealthMetric[] {
  if (!Array.isArray(value)) throw new Error('Invalid response: health metrics must be an array.');
  for (const metric of value) {
    if (!isRecord(metric)) throw new Error('Invalid response: health metric must be an object.');
    assertString(metric.id, 'health.id'); assertString(metric.label, 'health.label'); assertString(metric.value, 'health.value');
    assertString(metric.detail, 'health.detail'); assertString(metric.state, 'health.state'); assertString(metric.checkedAt, 'health.checkedAt');
  }
}

export function assertSession(value: unknown): asserts value is Session {
  if (!isRecord(value) || !isRecord(value.user)) throw new Error('Invalid response: session must be an object.');
  assertString(value.token, 'session.token'); assertString(value.expiresAt, 'session.expiresAt'); assertString(value.user.id, 'session.user.id');
  assertString(value.user.username, 'session.user.username'); assertString(value.user.displayName, 'session.user.displayName'); assertString(value.user.role, 'session.user.role');
}

interface RequestOptions { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; token?: string | undefined; signal?: AbortSignal | undefined; retry?: number | undefined; }

async function liveRequest<T>(path: string, options: RequestOptions, validate?: (value: unknown) => void): Promise<T> {
  const correlationId = randomCorrelationId();
  const timeoutMs = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const merged = mergeSignals(options.signal, Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${runtime.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId, ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      signal: merged.signal,
      credentials: 'same-origin',
    });
    const text = await response.text();
    const payload = text ? parseJsonSafely(text) : null;
    if (!response.ok) {
      const serverError = isRecord(payload) ? payload : {};
      throw new ApiError({
        code: typeof serverError.code === 'string' ? serverError.code : `HTTP_${response.status}`,
        message: typeof serverError.message === 'string' ? serverError.message : 'The request could not be completed.',
        status: response.status,
        correlationId: response.headers.get('X-Correlation-ID') ?? (typeof serverError.correlationId === 'string' ? serverError.correlationId : correlationId),
        ...(isRecord(serverError.details) ? { details: serverError.details } : {}),
      });
    }
    if (validate) validate(payload);
    return payload as T;
  } catch (error) {
    if (merged.signal.aborted && merged.signal.reason === 'timeout') throw new ApiError({ code: 'REQUEST_TIMEOUT', message: 'The request timed out. Retry the operation.', status: 408, correlationId });
    throw asApiError(error, correlationId);
  } finally { merged.cleanup(); }
}

export async function liveRequestWithRetry<T>(path: string, options: RequestOptions, validate?: (value: unknown) => void): Promise<T> {
  const retries = options.method && options.method !== 'GET' ? 0 : options.retry ?? 2;
  let attempt = 0;
  while (true) {
    try { return await liveRequest(path, options, validate); }
    catch (error) {
      const apiError = error instanceof ApiError ? error : asApiError(error, randomCorrelationId());
      const retryable = apiError.status === 0 || apiError.status === 408 || apiError.status === 429 || apiError.status >= 500;
      if (!retryable || attempt >= retries || options.signal?.aborted) throw apiError;
      attempt += 1;
      await sleep(250 * 2 ** (attempt - 1), options.signal);
    }
  }
}
