-- CreateEnum
CREATE TYPE "Role" AS ENUM ('viewer', 'supervisor', 'admin');
CREATE TYPE "Outcome" AS ENUM ('completed', 'missed', 'incomplete', 'unresolved');
CREATE TYPE "ReviewStatus" AS ENUM ('unreviewed', 'confirmed', 'dismissed');
CREATE TYPE "CameraStatus" AS ENUM ('online', 'warning', 'offline');
CREATE TYPE "AiStatus" AS ENUM ('processing', 'degraded', 'stopped');
CREATE TYPE "HealthState" AS ENUM ('healthy', 'warning', 'critical', 'neutral');
CREATE TYPE "EvidenceState" AS ENUM ('available', 'unavailable', 'pending');
CREATE TYPE "EvidenceType" AS ENUM ('snapshot', 'clip', 'none');
CREATE TYPE "StepState" AS ENUM ('complete', 'failed', 'unknown');

-- CreateTable
CREATE TABLE "users" (
  "id" VARCHAR(64) NOT NULL,
  "username" VARCHAR(100) NOT NULL,
  "displayName" VARCHAR(160) NOT NULL,
  "role" "Role" NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "dataset" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "userId" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cameras" (
  "id" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "zone" VARCHAR(160) NOT NULL,
  "status" "CameraStatus" NOT NULL,
  "aiStatus" "AiStatus" NOT NULL,
  "lastFrameAt" TIMESTAMP(3) NOT NULL,
  "fps" DOUBLE PRECISION NOT NULL,
  "streamQuality" VARCHAR(64) NOT NULL,
  "todayEvents" INTEGER NOT NULL,
  "configVersion" VARCHAR(64) NOT NULL,
  "dataset" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_events" (
  "id" VARCHAR(64) NOT NULL,
  "cameraId" VARCHAR(64) NOT NULL,
  "cameraName" VARCHAR(160) NOT NULL,
  "zone" VARCHAR(160) NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "outcome" "Outcome" NOT NULL,
  "reason" TEXT NOT NULL,
  "confidence" INTEGER NOT NULL,
  "reviewStatus" "ReviewStatus" NOT NULL,
  "summary" TEXT NOT NULL,
  "evidenceAvailable" BOOLEAN NOT NULL,
  "remarks" VARCHAR(1000),
  "reviewedBy" VARCHAR(160),
  "reviewedAt" TIMESTAMP(3),
  "modelVersion" VARCHAR(64) NOT NULL,
  "ruleVersion" VARCHAR(64) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "dataset" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inspection_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_steps" (
  "id" UUID NOT NULL,
  "eventId" VARCHAR(64) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "label" VARCHAR(200) NOT NULL,
  "state" "StepState" NOT NULL,
  "time" VARCHAR(32),
  CONSTRAINT "event_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "health_metrics" (
  "id" VARCHAR(64) NOT NULL,
  "label" VARCHAR(160) NOT NULL,
  "value" VARCHAR(160) NOT NULL,
  "detail" TEXT NOT NULL,
  "state" "HealthState" NOT NULL,
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "source" VARCHAR(64) NOT NULL,
  "dataset" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_metadata" (
  "id" VARCHAR(96) NOT NULL,
  "eventId" VARCHAR(64) NOT NULL,
  "state" "EvidenceState" NOT NULL,
  "type" "EvidenceType" NOT NULL,
  "mimeType" VARCHAR(128),
  "sizeBytes" INTEGER,
  "checksum" VARCHAR(160),
  "storageKey" TEXT,
  "dataset" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "evidence_metadata_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actionId" UUID NOT NULL,
  "actorId" VARCHAR(64) NOT NULL,
  "actorDisplayName" VARCHAR(160) NOT NULL,
  "actorRole" "Role" NOT NULL,
  "action" VARCHAR(120) NOT NULL,
  "targetType" VARCHAR(120) NOT NULL,
  "targetId" VARCHAR(96) NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "correlationId" VARCHAR(128) NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_dataset_idx" ON "users"("dataset");
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE INDEX "sessions_revokedAt_expiresAt_idx" ON "sessions"("revokedAt", "expiresAt");
CREATE INDEX "cameras_dataset_idx" ON "cameras"("dataset");
CREATE INDEX "cameras_status_aiStatus_idx" ON "cameras"("status", "aiStatus");
CREATE INDEX "inspection_events_dataset_idx" ON "inspection_events"("dataset");
CREATE INDEX "inspection_events_timestamp_id_idx" ON "inspection_events"("timestamp" DESC, "id" DESC);
CREATE INDEX "inspection_events_cameraId_timestamp_idx" ON "inspection_events"("cameraId", "timestamp" DESC);
CREATE INDEX "inspection_events_outcome_timestamp_idx" ON "inspection_events"("outcome", "timestamp" DESC);
CREATE INDEX "inspection_events_reviewStatus_timestamp_idx" ON "inspection_events"("reviewStatus", "timestamp" DESC);
CREATE INDEX "inspection_events_cameraId_outcome_reviewStatus_timestamp_idx" ON "inspection_events"("cameraId", "outcome", "reviewStatus", "timestamp" DESC);
CREATE UNIQUE INDEX "event_steps_eventId_sequence_key" ON "event_steps"("eventId", "sequence");
CREATE INDEX "event_steps_eventId_idx" ON "event_steps"("eventId");
CREATE INDEX "health_metrics_dataset_idx" ON "health_metrics"("dataset");
CREATE INDEX "health_metrics_state_idx" ON "health_metrics"("state");
CREATE UNIQUE INDEX "evidence_metadata_eventId_key" ON "evidence_metadata"("eventId");
CREATE INDEX "evidence_metadata_dataset_idx" ON "evidence_metadata"("dataset");
CREATE INDEX "evidence_metadata_state_idx" ON "evidence_metadata"("state");
CREATE UNIQUE INDEX "audit_logs_actionId_key" ON "audit_logs"("actionId");
CREATE INDEX "audit_logs_targetId_occurredAt_idx" ON "audit_logs"("targetId", "occurredAt" DESC);
CREATE INDEX "audit_logs_actorId_occurredAt_idx" ON "audit_logs"("actorId", "occurredAt" DESC);
CREATE INDEX "audit_logs_occurredAt_idx" ON "audit_logs"("occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_events" ADD CONSTRAINT "inspection_events_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "cameras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_steps" ADD CONSTRAINT "event_steps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "inspection_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_metadata" ADD CONSTRAINT "evidence_metadata_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "inspection_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check constraints that Prisma models as scalar validation.
ALTER TABLE "inspection_events" ADD CONSTRAINT "inspection_events_confidence_check" CHECK ("confidence" BETWEEN 0 AND 100);
ALTER TABLE "inspection_events" ADD CONSTRAINT "inspection_events_version_check" CHECK ("version" >= 1);
ALTER TABLE "inspection_events" ADD CONSTRAINT "inspection_events_schemaVersion_check" CHECK ("schemaVersion" >= 1);
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_fps_check" CHECK ("fps" >= 0);
ALTER TABLE "cameras" ADD CONSTRAINT "cameras_todayEvents_check" CHECK ("todayEvents" >= 0);
ALTER TABLE "evidence_metadata" ADD CONSTRAINT "evidence_metadata_sizeBytes_check" CHECK ("sizeBytes" IS NULL OR "sizeBytes" >= 0);
