export type PageKey = 'overview' | 'live' | 'events' | 'health' | 'reports';
export type CameraStatus = 'online' | 'warning' | 'offline';
export type AiStatus = 'processing' | 'degraded' | 'paused';
export type EventOutcome = 'completed' | 'missed' | 'incomplete' | 'unresolved';
export type ReviewStatus = 'unreviewed' | 'confirmed' | 'dismissed';

export interface Camera {
  id: string;
  name: string;
  zone: string;
  status: CameraStatus;
  aiStatus: AiStatus;
  lastFrame: string;
  fps: number;
  streamQuality: string;
  todayEvents: number;
}

export interface InspectionStep {
  label: string;
  state: 'complete' | 'failed' | 'unknown';
  time?: string;
}

export interface InspectionEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  outcome: EventOutcome;
  reason: string;
  confidence: number;
  reviewStatus: ReviewStatus;
  summary: string;
  evidenceAvailable: boolean;
  remarks?: string;
  modelVersion: string;
  ruleVersion: string;
  steps: InspectionStep[];
}

export interface HealthMetric {
  id: string;
  label: string;
  value: string;
  detail: string;
  state: 'healthy' | 'warning' | 'critical' | 'neutral';
}
