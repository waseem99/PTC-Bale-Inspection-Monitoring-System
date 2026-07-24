import type { Camera, EventQuery, ExportRequest, HealthMetric, InspectionEvent, KpiSummary, PaginatedResponse, ReviewEventInput, Session } from '../types';
import { buildCsv, randomCorrelationId } from '../utils';
import { ApiError, DEFAULT_TIMEOUT_MS, asApiError, assertCameras, assertHealthMetrics, assertInspectionEvent, assertKpiSummary, assertPaginatedEvents, assertSession, liveRequestWithRetry, mergeSignals, runtime } from './core';
import { applyEventQuery, calculateSummary, decodeMockSession, generateMockEvents, getMockCameras, getMockHealth, mockLatency, mockLogin, requireMockSession, requireRole, loadOverrides, saveOverrides } from './mock';

export { ApiError, runtime, generateMockEvents };
export const api = {
  async login(username: string, password: string, signal?: AbortSignal): Promise<Session> {
    if (runtime.dataMode === 'mock') return mockLogin(username, password, signal);
    return liveRequestWithRetry<Session>('/auth/login', { method: 'POST', body: { username, password }, signal }, assertSession);
  },
  async getCurrentSession(token: string, signal?: AbortSignal): Promise<Session> {
    if (runtime.dataMode === 'mock') { await mockLatency(signal); return requireMockSession(token); }
    return liveRequestWithRetry<Session>('/auth/me', { token, signal }, assertSession);
  },
  async getSummary(token: string, signal?: AbortSignal): Promise<KpiSummary> {
    if (runtime.dataMode === 'mock') { requireMockSession(token); await mockLatency(signal); return calculateSummary(generateMockEvents()); }
    return liveRequestWithRetry<KpiSummary>('/dashboard/summary', { token, signal }, assertKpiSummary);
  },
  async getCameras(token: string, signal?: AbortSignal): Promise<Camera[]> {
    if (runtime.dataMode === 'mock') { requireMockSession(token); await mockLatency(signal); return getMockCameras(); }
    return liveRequestWithRetry<Camera[]>('/cameras', { token, signal }, assertCameras);
  },
  async getHealth(token: string, signal?: AbortSignal): Promise<HealthMetric[]> {
    if (runtime.dataMode === 'mock') { requireMockSession(token); await mockLatency(signal); return getMockHealth(); }
    return liveRequestWithRetry<HealthMetric[]>('/health', { token, signal }, assertHealthMetrics);
  },
  async getEvents(token: string, query: EventQuery, signal?: AbortSignal): Promise<PaginatedResponse<InspectionEvent>> {
    if (runtime.dataMode === 'mock') { requireMockSession(token); await mockLatency(signal); const result = applyEventQuery(generateMockEvents(), query); assertPaginatedEvents(result); return result; }
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize), sortBy: query.sortBy, sortDirection: query.sortDirection });
    if (query.cameraId) params.set('cameraId', query.cameraId); if (query.outcome) params.set('outcome', query.outcome); if (query.reviewStatus) params.set('reviewStatus', query.reviewStatus); if (query.search) params.set('search', query.search); if (query.from) params.set('from', query.from); if (query.to) params.set('to', query.to);
    return liveRequestWithRetry<PaginatedResponse<InspectionEvent>>(`/events?${params.toString()}`, { token, signal }, assertPaginatedEvents);
  },
  async getEvent(token: string, eventId: string, signal?: AbortSignal): Promise<InspectionEvent> {
    if (runtime.dataMode === 'mock') { requireMockSession(token); await mockLatency(signal); const event = generateMockEvents().find((item) => item.id === eventId); if (!event) throw new ApiError({ code: 'EVENT_NOT_FOUND', message: 'The requested event could not be found.', status: 404, correlationId: randomCorrelationId() }); return event; }
    return liveRequestWithRetry<InspectionEvent>(`/events/${encodeURIComponent(eventId)}`, { token, signal }, assertInspectionEvent);
  },
  async reviewEvent(token: string, eventId: string, input: ReviewEventInput, signal?: AbortSignal): Promise<InspectionEvent> {
    if (runtime.dataMode === 'mock') {
      const session = requireMockSession(token); requireRole(session, ['supervisor', 'admin']); await mockLatency(signal); const event = generateMockEvents().find((item) => item.id === eventId);
      if (!event) throw new ApiError({ code: 'EVENT_NOT_FOUND', message: 'The requested event could not be found.', status: 404, correlationId: randomCorrelationId() });
      if (event.version !== input.expectedVersion) throw new ApiError({ code: 'VERSION_CONFLICT', message: 'This event was updated by another user. Refresh before saving your review.', status: 409, correlationId: randomCorrelationId(), details: { currentVersion: event.version } });
      const overrides = loadOverrides(); overrides[eventId] = { reviewStatus: input.reviewStatus, ...(input.remarks.trim() ? { remarks: input.remarks.trim() } : {}), reviewedBy: session.user.displayName, reviewedAt: new Date().toISOString(), version: event.version + 1 }; saveOverrides(overrides);
      const updated = generateMockEvents().find((item) => item.id === eventId); if (!updated) throw new Error('Updated mock event could not be loaded.'); return updated;
    }
    return liveRequestWithRetry<InspectionEvent>(`/events/${encodeURIComponent(eventId)}/review`, { method: 'PATCH', body: input, token, signal }, assertInspectionEvent);
  },
  async exportEvents(token: string, request: ExportRequest, signal?: AbortSignal): Promise<Blob> {
    if (runtime.dataMode === 'mock') {
      requireMockSession(token); await mockLatency(signal); const mockEvents = generateMockEvents(); const result = applyEventQuery(mockEvents, { page: 1, pageSize: mockEvents.length, sortBy: 'timestamp', sortDirection: 'desc', ...(request.cameraId ? { cameraId: request.cameraId } : {}), ...(request.outcome ? { outcome: request.outcome } : {}), ...(request.reviewStatus ? { reviewStatus: request.reviewStatus } : {}), ...(request.from ? { from: request.from } : {}), ...(request.to ? { to: request.to } : {}) });
      const rows: Array<Array<string | number>> = [['Event ID', 'Timestamp', 'Camera', 'Zone', 'Outcome', 'Reason', 'Confidence', 'Review Status', 'Reviewed By', 'Remarks'], ...result.items.map((event) => [event.id, event.timestamp, event.cameraName, event.zone, event.outcome, event.reason, event.confidence, event.reviewStatus, event.reviewedBy ?? '', event.remarks ?? ''])];
      return new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8' });
    }
    const correlationId = randomCorrelationId(); const merged = mergeSignals(signal, DEFAULT_TIMEOUT_MS * 2);
    try {
      const response = await fetch(`${runtime.apiBaseUrl}/exports/events`, { method: 'POST', headers: { Accept: 'text/csv', 'Content-Type': 'application/json', 'X-Correlation-ID': correlationId, Authorization: `Bearer ${token}` }, body: JSON.stringify(request), signal: merged.signal, credentials: 'same-origin' });
      if (!response.ok) throw new ApiError({ code: `HTTP_${response.status}`, message: 'The export could not be generated.', status: response.status, correlationId: response.headers.get('X-Correlation-ID') ?? correlationId });
      return await response.blob();
    } catch (error) { throw asApiError(error, correlationId); } finally { merged.cleanup(); }
  },
};

export const __testables = { applyEventQuery, calculateSummary, decodeMockSession };
