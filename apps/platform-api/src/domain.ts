export type Role = 'viewer' | 'supervisor' | 'admin';
export type Outcome = 'completed' | 'missed' | 'incomplete' | 'unresolved';
export type ReviewStatus = 'unreviewed' | 'confirmed' | 'dismissed';
export type CameraStatus = 'online' | 'warning' | 'offline';
export type AiStatus = 'processing' | 'degraded' | 'stopped';
export type HealthState = 'healthy' | 'warning' | 'critical' | 'neutral';
export type StepState = 'complete' | 'failed' | 'unknown';

export type EventStepRecord = {
  label: string;
  state: StepState;
  time?: string;
};

export type InspectionEventRecord = {
  id: string;
  cameraId: string;
  cameraName: string;
  zone: string;
  timestamp: Date;
  outcome: Outcome;
  reason: string;
  confidence: number;
  reviewStatus: ReviewStatus;
  summary: string;
  evidenceAvailable: boolean;
  remarks?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  modelVersion: string;
  ruleVersion: string;
  version: number;
  steps: EventStepRecord[];
};
