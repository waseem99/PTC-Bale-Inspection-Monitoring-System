import type { AuditRecord, EvidenceMetadata, ReportRequest } from '../types';
import { randomCorrelationId } from '../utils';
import { ApiError, DEFAULT_TIMEOUT_MS, asApiError, isRecord, liveRequestWithRetry, mergeSignals, runtime } from './core';

function assertEvidence(value: unknown): asserts value is EvidenceMetadata {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.eventId !== 'string' || typeof value.state !== 'string' || typeof value.type !== 'string') {
    throw new Error('Invalid response: evidence metadata is malformed.');
  }
}

function assertAudit(value: unknown): asserts value is AuditRecord[] {
  if (!Array.isArray(value)) throw new Error('Invalid response: audit history must be an array.');
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.action !== 'string' || typeof item.actorDisplayName !== 'string' || typeof item.occurredAt !== 'string') {
      throw new Error('Invalid response: audit record is malformed.');
    }
  }
}

function reportParams(request: ReportRequest): string {
  const params = new URLSearchParams();
  if (request.cameraId) params.set('cameraId', request.cameraId);
  if (request.outcome) params.set('outcome', request.outcome);
  if (request.reviewStatus) params.set('reviewStatus', request.reviewStatus);
  if (request.from) params.set('from', request.from);
  if (request.to) params.set('to', request.to);
  return params.toString();
}

export const certificationApi = {
  async getEvidence(token: string, eventId: string, signal?: AbortSignal): Promise<EvidenceMetadata | null> {
    if (runtime.dataMode === 'mock') return null;
    try {
      return await liveRequestWithRetry<EvidenceMetadata>(`/events/${encodeURIComponent(eventId)}/evidence`, { token, signal }, assertEvidence);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  },

  async getAudit(token: string, eventId: string, signal?: AbortSignal): Promise<AuditRecord[]> {
    if (runtime.dataMode === 'mock') return [];
    return liveRequestWithRetry<AuditRecord[]>(`/events/${encodeURIComponent(eventId)}/audit`, { token, signal }, assertAudit);
  },

  evidenceUrl(metadata: EvidenceMetadata): string | null {
    return metadata.contentUrl ? `${runtime.apiBaseUrl}${metadata.contentUrl.replace(/^\/api/, '')}` : null;
  },

  async downloadPdf(token: string, request: ReportRequest, signal?: AbortSignal): Promise<Blob> {
    if (runtime.dataMode === 'mock') {
      return new Blob(['Synthetic PDF reports require live API mode.'], { type: 'text/plain;charset=utf-8' });
    }
    const correlationId = randomCorrelationId();
    const merged = mergeSignals(signal, DEFAULT_TIMEOUT_MS * 2);
    try {
      const query = reportParams(request);
      const response = await fetch(`${runtime.apiBaseUrl}/reports/pdf${query ? `?${query}` : ''}`, {
        method: 'GET',
        headers: { Accept: 'application/pdf', 'X-Correlation-ID': correlationId, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'same-origin',
        signal: merged.signal,
      });
      if (!response.ok) {
        throw new ApiError({ code: `HTTP_${response.status}`, message: 'The PDF report could not be generated.', status: response.status, correlationId: response.headers.get('X-Correlation-ID') ?? correlationId });
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/pdf')) {
        throw new ApiError({ code: 'INVALID_REPORT_RESPONSE', message: 'The server did not return a PDF report.', status: 502, correlationId });
      }
      return await response.blob();
    } catch (error) {
      throw asApiError(error, correlationId);
    } finally {
      merged.cleanup();
    }
  },

  subscribe(onUpdate: (type: string) => void): () => void {
    if (runtime.dataMode === 'mock') return () => undefined;
    const evidencePolling = window.setInterval(() => onUpdate('evidence-update'), 10_000);
    if (typeof EventSource === 'undefined') return () => window.clearInterval(evidencePolling);
    const source = new EventSource(`${runtime.apiBaseUrl}/realtime`, { withCredentials: true });
    for (const type of ['inspection-event', 'health-update', 'evidence-update']) {
      source.addEventListener(type, () => onUpdate(type));
    }
    return () => {
      window.clearInterval(evidencePolling);
      source.close();
    };
  },
};
