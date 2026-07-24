import type { EventQuery, EventSortField, Outcome, ReviewStatus, SortDirection } from './types';

export const KARACHI_TIME_ZONE = 'Asia/Karachi';

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: KARACHI_TIME_ZONE,
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: KARACHI_TIME_ZONE,
  }).format(new Date(value));
}

export function formatRelativeTime(value: string, now = Date.now()): string {
  const diffSeconds = Math.round((new Date(value).getTime() - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const absolute = Math.abs(diffSeconds);
  if (absolute < 60) return formatter.format(diffSeconds, 'second');
  const minutes = Math.round(diffSeconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function safeInteger(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

export function debounce<TArgs extends unknown[]>(callback: (...args: TArgs) => void, delayMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), delayMs);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  return debounced;
}

const OUTCOMES = new Set<Outcome>(['completed', 'missed', 'incomplete', 'unresolved']);
const REVIEW_STATUSES = new Set<ReviewStatus>(['unreviewed', 'confirmed', 'dismissed']);
const SORT_FIELDS = new Set<EventSortField>(['timestamp', 'outcome', 'confidence', 'reviewStatus', 'cameraName']);
const SORT_DIRECTIONS = new Set<SortDirection>(['asc', 'desc']);

export function eventQueryFromSearchParams(searchParams: URLSearchParams): EventQuery {
  const outcome = searchParams.get('outcome');
  const reviewStatus = searchParams.get('reviewStatus');
  const sortBy = searchParams.get('sortBy');
  const sortDirection = searchParams.get('sortDirection');
  const cameraId = searchParams.get('cameraId') ?? undefined;
  const search = searchParams.get('search')?.trim() || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  return {
    page: safeInteger(searchParams.get('page'), 1, 1, 100000),
    pageSize: safeInteger(searchParams.get('pageSize'), 20, 10, 100),
    ...(cameraId && cameraId !== 'all' ? { cameraId } : {}),
    ...(outcome && OUTCOMES.has(outcome as Outcome) ? { outcome: outcome as Outcome } : {}),
    ...(reviewStatus && REVIEW_STATUSES.has(reviewStatus as ReviewStatus)
      ? { reviewStatus: reviewStatus as ReviewStatus }
      : {}),
    ...(search ? { search } : {}),
    sortBy: sortBy && SORT_FIELDS.has(sortBy as EventSortField) ? (sortBy as EventSortField) : 'timestamp',
    sortDirection:
      sortDirection && SORT_DIRECTIONS.has(sortDirection as SortDirection)
        ? (sortDirection as SortDirection)
        : 'desc',
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

export function eventQueryToSearchParams(query: EventQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  params.set('sortBy', query.sortBy);
  params.set('sortDirection', query.sortDirection);
  if (query.cameraId) params.set('cameraId', query.cameraId);
  if (query.outcome) params.set('outcome', query.outcome);
  if (query.reviewStatus) params.set('reviewStatus', query.reviewStatus);
  if (query.search) params.set('search', query.search);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return params;
}

export function buildCsv(rows: Array<Array<string | number>>): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    const timeout = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function randomCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `corr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
