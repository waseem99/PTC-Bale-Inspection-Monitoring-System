export type Role = 'viewer' | 'supervisor' | 'admin';
export type Outcome = 'completed' | 'missed' | 'incomplete' | 'unresolved';
export type ReviewStatus = 'unreviewed' | 'confirmed' | 'dismissed';
export type SortDirection = 'asc' | 'desc';
export type EventSortField = 'timestamp' | 'outcome' | 'confidence' | 'reviewStatus' | 'cameraName';
export type CameraConnectionStatus = 'online' | 'warning' | 'offline' | 'reconnecting' | 'disabled' | 'degraded' | 'unknown';
export type AiStatus = 'processing' | 'degraded' | 'stopped' | 'simulated' | 'unavailable' | 'loading' | 'ready' | 'failed';
export type HealthState = 'healthy' | 'warning' | 'critical' | 'neutral';
export type StepState = 'complete' | 'failed' | 'unknown';
export type EvidenceState = 'available' | 'unavailable' | 'pending' | 'missing' | 'failed' | 'quarantined' | 'deleted';
export type EvidenceType = 'snapshot' | 'clip' | 'none';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export interface Session {
  token: string;
  user: User;
  expiresAt: string;
}

export interface EventStep {
  label: string;
  state: StepState;
  time?: string;
}

export interface InspectionEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  zone: string;
  timestamp: string;
  outcome: Outcome;
  reason: string;
  confidence: number;
  reviewStatus: ReviewStatus;
  summary: string;
  evidenceAvailable: boolean;
  remarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  modelVersion: string;
  ruleVersion: string;
  version: number;
  steps: EventStep[];
}

export interface EvidenceMetadata {
  id: string;
  eventId: string;
  state: EvidenceState;
  type: EvidenceType;
  mimeType: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
  checksum: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  contentUrl: string | null;
}

export interface AuditRecord {
  id: string;
  actionId: string;
  actorId: string;
  actorDisplayName: string;
  actorRole: Role;
  action: string;
  before: unknown;
  after: unknown;
  correlationId: string;
  occurredAt: string;
}

export interface Camera {
  id: string;
  name: string;
  zone: string;
  status: CameraConnectionStatus;
  aiStatus: AiStatus;
  lastFrameAt: string;
  fps: number;
  streamQuality: string;
  todayEvents: number;
}

export interface HealthMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  state: HealthState;
  checkedAt: string;
}

export interface KpiSummary {
  total: number;
  completed: number;
  violations: number;
  unresolved: number;
  unreviewed: number;
  completedRate: number;
  periodLabel: string;
  generatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  generatedAt: string;
}

export interface EventQuery {
  page: number;
  pageSize: number;
  cameraId?: string;
  outcome?: Outcome;
  reviewStatus?: ReviewStatus;
  search?: string;
  sortBy: EventSortField;
  sortDirection: SortDirection;
  from?: string;
  to?: string;
}

export interface ReviewEventInput {
  reviewStatus: Exclude<ReviewStatus, 'unreviewed'>;
  remarks: string;
  expectedVersion: number;
}

export interface ExportRequest {
  cameraId?: string;
  outcome?: Outcome;
  reviewStatus?: ReviewStatus;
  from?: string;
  to?: string;
  format: 'csv';
}

export interface ReportRequest {
  cameraId?: string;
  outcome?: Outcome;
  reviewStatus?: ReviewStatus;
  from?: string;
  to?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  status: number;
  correlationId: string;
  details?: Record<string, unknown>;
}

export interface AppRuntime {
  dataMode: 'mock' | 'live';
  environmentName: string;
  buildVersion: string;
  apiBaseUrl: string;
}
