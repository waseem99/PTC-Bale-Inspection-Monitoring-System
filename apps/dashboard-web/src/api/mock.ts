import type { Camera, EventQuery, HealthMetric, InspectionEvent, KpiSummary, Outcome, PaginatedResponse, ReviewStatus, Role, Session, User } from '../types';
import { randomCorrelationId, sleep } from '../utils';
import { ApiError, isRecord, parseJsonSafely } from './core';

const MOCK_STORAGE_KEY = 'ptc-bale:mock-review-overrides:v2';
function stableHash(value: string): number { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return Math.abs(hash >>> 0); }
function deterministicOutcome(index: number): Outcome { if (index % 19 === 0) return 'missed'; if (index % 13 === 0) return 'incomplete'; if (index % 17 === 0) return 'unresolved'; return 'completed'; }
function deterministicReview(index: number, outcome: Outcome): ReviewStatus { if (index % 5 === 0) return 'unreviewed'; if (outcome === 'completed' && index % 11 === 0) return 'dismissed'; return 'confirmed'; }
function eventReason(outcome: Outcome): string { switch (outcome) { case 'completed': return 'Inspection sequence completed'; case 'missed': return 'Required inspection interaction not observed'; case 'incomplete': return 'Inspection sequence incomplete or below threshold'; case 'unresolved': return 'Visibility insufficient for a reliable outcome'; } }
function eventSummary(outcome: Outcome): string { switch (outcome) { case 'completed': return 'The required bale inspection interaction was observed before the bale left the monitored zone.'; case 'missed': return 'The bale exited the monitored zone without the required checking sequence being detected.'; case 'incomplete': return 'Worker interaction was observed, but the complete required sequence was not detected.'; case 'unresolved': return 'Occlusion or stream quality prevented a reliable automated outcome.'; } }

interface ReviewOverride { reviewStatus: ReviewStatus; remarks?: string; reviewedBy?: string; reviewedAt?: string; version: number; }
export function loadOverrides(): Record<string, ReviewOverride> { try { const raw = window.localStorage.getItem(MOCK_STORAGE_KEY); if (!raw) return {}; const parsed = parseJsonSafely(raw); return isRecord(parsed) ? (parsed as Record<string, ReviewOverride>) : {}; } catch { return {}; } }
export function saveOverrides(overrides: Record<string, ReviewOverride>): void { try { window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(overrides)); } catch { /* live mode persists server-side */ } }

export function generateMockEvents(count = 257): InspectionEvent[] {
  const overrides = loadOverrides(); const cameraNames = ['Camera 01', 'Camera 02', 'Camera 03', 'Camera 04']; const zones = ['Bale Entry', 'Inspection Bay A', 'Inspection Bay B', 'Bale Exit']; const now = new Date('2026-07-24T13:00:00+05:00').getTime();
  return Array.from({ length: count }, (_, index) => {
    const sequence = count - index; const cameraIndex = index % 4; const outcome = deterministicOutcome(index + 1); const reviewStatus = deterministicReview(index + 1, outcome); const timestamp = new Date(now - index * 4 * 60 * 1000).toISOString(); const eventId = `EVT-2407-${String(sequence).padStart(4, '0')}`; const override = overrides[eventId]; const confidenceBase = outcome === 'unresolved' ? 58 : outcome === 'completed' ? 96 : 86; const confidence = Math.min(99, confidenceBase + (stableHash(eventId) % 7)); const stepTwoComplete = outcome === 'completed' || outcome === 'incomplete'; const stepThreeComplete = outcome === 'completed'; const unresolved = outcome === 'unresolved';
    return {
      id: eventId, cameraId: `CAM-0${cameraIndex + 1}`, cameraName: cameraNames[cameraIndex] ?? `Camera ${cameraIndex + 1}`, zone: zones[cameraIndex] ?? 'Inspection Zone', timestamp, outcome, reason: eventReason(outcome), confidence,
      reviewStatus: override?.reviewStatus ?? reviewStatus, summary: eventSummary(outcome), evidenceAvailable: index % 23 !== 0,
      ...(override?.remarks ? { remarks: override.remarks } : reviewStatus !== 'unreviewed' ? { remarks: 'Reviewed during PoC validation.' } : {}),
      ...(override?.reviewedBy ? { reviewedBy: override.reviewedBy } : {}), ...(override?.reviewedAt ? { reviewedAt: override.reviewedAt } : {}),
      modelVersion: 'cv-poc-0.3.0', ruleVersion: 'sop-draft-0.2', version: override?.version ?? 1,
      steps: [
        { label: 'Bale entered inspection zone', state: 'complete', time: '00:00:02' },
        { label: 'Worker interaction observed', state: unresolved ? 'unknown' : stepTwoComplete ? 'complete' : 'failed', ...(stepTwoComplete ? { time: '00:00:14' } : {}) },
        { label: 'Required check completed', state: unresolved ? 'unknown' : stepThreeComplete ? 'complete' : 'failed', ...(stepThreeComplete ? { time: '00:00:29' } : {}) },
        { label: 'Bale exited inspection zone', state: 'complete', time: '00:00:41' },
      ],
    };
  });
}

export function getMockCameras(): Camera[] {
  const now = Date.now();
  return [
    { id: 'CAM-01', name: 'Camera 01', zone: 'Bale Entry', status: 'online', aiStatus: 'processing', lastFrameAt: new Date(now - 2_000).toISOString(), fps: 18, streamQuality: '1080p', todayEvents: 64 },
    { id: 'CAM-02', name: 'Camera 02', zone: 'Inspection Bay A', status: 'online', aiStatus: 'processing', lastFrameAt: new Date(now - 1_000).toISOString(), fps: 20, streamQuality: '1080p', todayEvents: 69 },
    { id: 'CAM-03', name: 'Camera 03', zone: 'Inspection Bay B', status: 'warning', aiStatus: 'degraded', lastFrameAt: new Date(now - 18_000).toISOString(), fps: 9, streamQuality: '720p', todayEvents: 61 },
    { id: 'CAM-04', name: 'Camera 04', zone: 'Bale Exit', status: 'online', aiStatus: 'processing', lastFrameAt: new Date(now - 3_000).toISOString(), fps: 18, streamQuality: '1080p', todayEvents: 63 },
  ];
}

export function getMockHealth(): HealthMetric[] {
  const checkedAt = new Date().toISOString();
  return [
    { id: 'edge', label: 'Local edge system', value: 'Online', detail: 'All core services are responding', state: 'healthy', checkedAt },
    { id: 'ai', label: 'AI inference engine', value: 'Active', detail: '3 healthy streams, 1 degraded', state: 'warning', checkedAt },
    { id: 'gpu', label: 'GPU utilization', value: '64%', detail: 'Temperature 68°C · Memory 7.2 / 12 GB', state: 'healthy', checkedAt },
    { id: 'db', label: 'Local database', value: 'Healthy', detail: 'Last write less than 1 minute ago', state: 'healthy', checkedAt },
    { id: 'storage', label: 'Evidence storage', value: '71% free', detail: '214 GB available on local volume', state: 'healthy', checkedAt },
    { id: 'azure', label: 'Azure synchronization', value: 'Not configured', detail: 'Local PoC remains fully operational', state: 'neutral', checkedAt },
  ];
}

function compareValues(left: InspectionEvent, right: InspectionEvent, field: EventQuery['sortBy']): number { const leftValue = left[field]; const rightValue = right[field]; if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue; return String(leftValue).localeCompare(String(rightValue)); }
export function applyEventQuery(events: InspectionEvent[], query: EventQuery): PaginatedResponse<InspectionEvent> {
  const normalizedSearch = query.search?.toLocaleLowerCase().trim(); const from = query.from ? new Date(`${query.from}T00:00:00+05:00`).getTime() : undefined; const to = query.to ? new Date(`${query.to}T23:59:59+05:00`).getTime() : undefined;
  const filtered = events.filter((event) => {
    if (query.cameraId && event.cameraId !== query.cameraId) return false; if (query.outcome && event.outcome !== query.outcome) return false; if (query.reviewStatus && event.reviewStatus !== query.reviewStatus) return false;
    const eventTime = new Date(event.timestamp).getTime(); if (from && eventTime < from) return false; if (to && eventTime > to) return false;
    if (normalizedSearch && !`${event.id} ${event.cameraName} ${event.zone} ${event.reason}`.toLocaleLowerCase().includes(normalizedSearch)) return false; return true;
  });
  filtered.sort((left, right) => { const result = compareValues(left, right, query.sortBy); return query.sortDirection === 'asc' ? result : -result; });
  const total = filtered.length; const totalPages = Math.max(1, Math.ceil(total / query.pageSize)); const page = Math.min(query.page, totalPages); const offset = (page - 1) * query.pageSize;
  return { items: filtered.slice(offset, offset + query.pageSize), page, pageSize: query.pageSize, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1, generatedAt: new Date().toISOString() };
}

export function calculateSummary(events: InspectionEvent[]): KpiSummary {
  const completed = events.filter((event) => event.outcome === 'completed').length; const violations = events.filter((event) => event.outcome === 'missed' || event.outcome === 'incomplete').length; const unresolved = events.filter((event) => event.outcome === 'unresolved').length; const unreviewed = events.filter((event) => event.reviewStatus === 'unreviewed').length;
  return { total: events.length, completed, violations, unresolved, unreviewed, completedRate: events.length ? Math.round((completed / events.length) * 1000) / 10 : 0, periodLabel: 'Today · PoC dataset', generatedAt: new Date().toISOString() };
}

function encodeUtf8Base64(value: string): string { const bytes = new TextEncoder().encode(value); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return window.btoa(binary); }
function decodeUtf8Base64(value: string): string { const binary = window.atob(value); const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); return new TextDecoder().decode(bytes); }
function encodeMockSession(user: User, expiresAt: string): string { return encodeUtf8Base64(JSON.stringify({ user, expiresAt })); }
export function decodeMockSession(token: string): Session | null { try { const parsed = parseJsonSafely(decodeUtf8Base64(token)); if (!isRecord(parsed) || !isRecord(parsed.user) || typeof parsed.expiresAt !== 'string') return null; const user = parsed.user as unknown as User; if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null; return { token, user, expiresAt: parsed.expiresAt }; } catch { return null; } }
function mockUsers(): Array<User & { password: string }> { const password = import.meta.env.VITE_DEMO_PASSWORD ?? 'PTC-Demo-2026!'; return [ { id: 'usr-supervisor', username: 'supervisor', displayName: 'Supervisor Demo', role: 'supervisor', password }, { id: 'usr-viewer', username: 'viewer', displayName: 'Viewer Demo', role: 'viewer', password }, { id: 'usr-admin', username: 'admin', displayName: 'Administrator Demo', role: 'admin', password } ]; }
export async function mockLatency(signal?: AbortSignal): Promise<void> { const configured = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 420); const delay = Number.isFinite(configured) ? Math.max(0, configured) : 420; await sleep(delay, signal); const failureRate = Number(import.meta.env.VITE_MOCK_FAILURE_RATE ?? 0); if (failureRate > 0 && Math.random() < failureRate) throw new ApiError({ code: 'SIMULATED_FAILURE', message: 'A simulated service failure occurred. Retry the request.', status: 503, correlationId: randomCorrelationId() }); }
export async function mockLogin(username: string, password: string, signal?: AbortSignal): Promise<Session> { await mockLatency(signal); const userRecord = mockUsers().find((user) => user.username.toLowerCase() === username.trim().toLowerCase()); if (!userRecord || userRecord.password !== password) throw new ApiError({ code: 'INVALID_CREDENTIALS', message: 'The username or password is incorrect.', status: 401, correlationId: randomCorrelationId() }); const { password: _password, ...user } = userRecord; void _password; const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); return { token: encodeMockSession(user, expiresAt), user, expiresAt }; }
export function requireMockSession(token: string | undefined): Session { if (!token) throw new ApiError({ code: 'UNAUTHENTICATED', message: 'Sign in to continue.', status: 401, correlationId: randomCorrelationId() }); const session = decodeMockSession(token); if (!session) throw new ApiError({ code: 'SESSION_EXPIRED', message: 'Your session has expired. Sign in again.', status: 401, correlationId: randomCorrelationId() }); return session; }
export function requireRole(session: Session, roles: Role[]): void { if (!roles.includes(session.user.role)) throw new ApiError({ code: 'FORBIDDEN', message: 'You do not have permission to perform this action.', status: 403, correlationId: randomCorrelationId() }); }
