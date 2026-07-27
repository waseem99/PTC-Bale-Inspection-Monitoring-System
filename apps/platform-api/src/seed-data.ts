import type { Outcome, ReviewStatus } from './domain';

export const DATASET = 'synthetic-v1';

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function outcomeFor(index: number): Outcome {
  if (index % 19 === 0) return 'missed';
  if (index % 13 === 0) return 'incomplete';
  if (index % 17 === 0) return 'unresolved';
  return 'completed';
}

function reviewFor(index: number, outcome: Outcome): ReviewStatus {
  if (index % 5 === 0) return 'unreviewed';
  if (outcome === 'completed' && index % 11 === 0) return 'dismissed';
  return 'confirmed';
}

function reasonFor(outcome: Outcome): string {
  return {
    completed: 'Inspection sequence completed',
    missed: 'Required inspection interaction not observed',
    incomplete: 'Inspection sequence incomplete or below threshold',
    unresolved: 'Visibility insufficient for a reliable outcome',
  }[outcome];
}

function summaryFor(outcome: Outcome): string {
  return {
    completed: 'The required bale inspection interaction was observed before the bale left the monitored zone.',
    missed: 'The bale exited the monitored zone without the required checking sequence being detected.',
    incomplete: 'Worker interaction was observed, but the complete required sequence was not detected.',
    unresolved: 'Occlusion or stream quality prevented a reliable automated outcome.',
  }[outcome];
}

export function seedCameras(anchor = new Date('2026-07-24T08:00:00.000Z')) {
  return [
    { id: 'CAM-01', name: 'Camera 01', zone: 'Bale Entry', status: 'online', aiStatus: 'processing', lastFrameAt: new Date(anchor.getTime() - 2_000), fps: 18, streamQuality: '1080p', todayEvents: 64, configVersion: 'camera-draft-0.2', dataset: DATASET },
    { id: 'CAM-02', name: 'Camera 02', zone: 'Inspection Bay A', status: 'online', aiStatus: 'processing', lastFrameAt: new Date(anchor.getTime() - 1_000), fps: 20, streamQuality: '1080p', todayEvents: 69, configVersion: 'camera-draft-0.2', dataset: DATASET },
    { id: 'CAM-03', name: 'Camera 03', zone: 'Inspection Bay B', status: 'warning', aiStatus: 'degraded', lastFrameAt: new Date(anchor.getTime() - 18_000), fps: 9, streamQuality: '720p', todayEvents: 61, configVersion: 'camera-draft-0.2', dataset: DATASET },
    { id: 'CAM-04', name: 'Camera 04', zone: 'Bale Exit', status: 'online', aiStatus: 'processing', lastFrameAt: new Date(anchor.getTime() - 3_000), fps: 18, streamQuality: '1080p', todayEvents: 63, configVersion: 'camera-draft-0.2', dataset: DATASET },
  ] as const;
}

export function seedHealth(anchor = new Date('2026-07-24T08:00:00.000Z')) {
  return [
    { id: 'edge', label: 'Local edge system', value: 'Online', detail: 'All core services are responding', state: 'healthy', checkedAt: anchor, source: 'seed', dataset: DATASET },
    { id: 'ai', label: 'AI inference engine', value: 'Active', detail: '3 healthy streams, 1 degraded', state: 'warning', checkedAt: anchor, source: 'seed', dataset: DATASET },
    { id: 'gpu', label: 'GPU utilization', value: '64%', detail: 'Temperature 68°C · Memory 7.2 / 12 GB', state: 'healthy', checkedAt: anchor, source: 'seed', dataset: DATASET },
    { id: 'db', label: 'Local PostgreSQL database', value: 'Healthy', detail: 'Last write less than 1 minute ago', state: 'healthy', checkedAt: anchor, source: 'seed', dataset: DATASET },
    { id: 'storage', label: 'Evidence storage', value: '71% free', detail: '214 GB available on local volume', state: 'healthy', checkedAt: anchor, source: 'seed', dataset: DATASET },
    { id: 'azure', label: 'Azure synchronization', value: 'Not configured', detail: 'Local PoC remains fully operational', state: 'neutral', checkedAt: anchor, source: 'seed', dataset: DATASET },
  ] as const;
}

export function seedEvents(count = 257) {
  const cameraNames = ['Camera 01', 'Camera 02', 'Camera 03', 'Camera 04'];
  const zones = ['Bale Entry', 'Inspection Bay A', 'Inspection Bay B', 'Bale Exit'];
  const anchor = new Date('2026-07-24T08:00:00.000Z').getTime();
  return Array.from({ length: count }, (_, index) => {
    const sequence = count - index;
    const cameraIndex = index % 4;
    const outcome = outcomeFor(index + 1);
    const reviewStatus = reviewFor(index + 1, outcome);
    const timestamp = new Date(anchor - index * 4 * 60 * 1000);
    const eventId = `EVT-2407-${String(sequence).padStart(4, '0')}`;
    const confidenceBase = outcome === 'unresolved' ? 58 : outcome === 'completed' ? 96 : 86;
    const confidence = Math.min(99, confidenceBase + (stableHash(eventId) % 7));
    const interaction = outcome === 'completed' || outcome === 'incomplete';
    const completed = outcome === 'completed';
    const unresolved = outcome === 'unresolved';
    return {
      id: eventId,
      cameraId: `CAM-0${cameraIndex + 1}`,
      cameraName: cameraNames[cameraIndex] ?? `Camera ${cameraIndex + 1}`,
      zone: zones[cameraIndex] ?? 'Inspection Zone',
      timestamp,
      outcome,
      reason: reasonFor(outcome),
      confidence,
      reviewStatus,
      summary: summaryFor(outcome),
      evidenceAvailable: index % 23 !== 0,
      ...(reviewStatus !== 'unreviewed' ? {
        remarks: 'Reviewed during PoC validation.',
        reviewedBy: 'Supervisor Demo',
        reviewedAt: new Date(timestamp.getTime() + 10 * 60 * 1000),
      } : {}),
      modelVersion: 'cv-poc-0.3.0',
      ruleVersion: 'sop-draft-0.2',
      version: 1,
      schemaVersion: 1,
      dataset: DATASET,
      steps: [
        { label: 'Bale entered inspection zone', state: 'complete', time: '00:00:02' },
        { label: 'Worker interaction observed', state: unresolved ? 'unknown' : interaction ? 'complete' : 'failed', ...(interaction ? { time: '00:00:14' } : {}) },
        { label: 'Required check completed', state: unresolved ? 'unknown' : completed ? 'complete' : 'failed', ...(completed ? { time: '00:00:29' } : {}) },
        { label: 'Bale exited inspection zone', state: 'complete', time: '00:00:41' },
      ],
    };
  });
}
