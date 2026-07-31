-- Extend runtime state vocabularies without removing existing values.
ALTER TYPE "CameraStatus" ADD VALUE IF NOT EXISTS 'reconnecting';
ALTER TYPE "CameraStatus" ADD VALUE IF NOT EXISTS 'disabled';
ALTER TYPE "CameraStatus" ADD VALUE IF NOT EXISTS 'degraded';
ALTER TYPE "CameraStatus" ADD VALUE IF NOT EXISTS 'unknown';

ALTER TYPE "AiStatus" ADD VALUE IF NOT EXISTS 'simulated';
ALTER TYPE "AiStatus" ADD VALUE IF NOT EXISTS 'unavailable';
ALTER TYPE "AiStatus" ADD VALUE IF NOT EXISTS 'loading';
ALTER TYPE "AiStatus" ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE "AiStatus" ADD VALUE IF NOT EXISTS 'failed';

ALTER TYPE "EvidenceState" ADD VALUE IF NOT EXISTS 'missing';
ALTER TYPE "EvidenceState" ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE "EvidenceState" ADD VALUE IF NOT EXISTS 'quarantined';
ALTER TYPE "EvidenceState" ADD VALUE IF NOT EXISTS 'deleted';

ALTER TABLE "inspection_events"
  ADD COLUMN IF NOT EXISTS "configVersion" VARCHAR(64) NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "edgeVersion" VARCHAR(64) NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(32) NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMPTZ(3);

ALTER TABLE "health_metrics"
  ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "evidence_metadata"
  ADD COLUMN IF NOT EXISTS "durationMs" INTEGER,
  ADD COLUMN IF NOT EXISTS "source" VARCHAR(32) NOT NULL DEFAULT 'seed',
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "inspection_events_source_timestamp_idx"
  ON "inspection_events"("source", "timestamp" DESC);

CREATE INDEX IF NOT EXISTS "health_metrics_source_checkedAt_idx"
  ON "health_metrics"("source", "checkedAt" DESC);

DROP INDEX IF EXISTS "evidence_metadata_state_idx";
CREATE INDEX IF NOT EXISTS "evidence_metadata_state_createdAt_idx"
  ON "evidence_metadata"("state", "createdAt");
