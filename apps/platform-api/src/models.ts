import mongoose, { Schema } from 'mongoose';

export type Role = 'viewer' | 'supervisor' | 'admin';
export type Outcome = 'completed' | 'missed' | 'incomplete' | 'unresolved';
export type ReviewStatus = 'unreviewed' | 'confirmed' | 'dismissed';

const timestamps = { createdAt: 'createdAt', updatedAt: 'updatedAt' } as const;

const userSchema = new Schema({
  _id: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true },
  role: { type: String, enum: ['viewer', 'supervisor', 'admin'], required: true },
  passwordHash: { type: String, required: true, select: false },
  enabled: { type: Boolean, default: true },
  dataset: { type: String, required: true, index: true },
}, { timestamps, versionKey: false });

const sessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  lastSeenAt: { type: Date, required: true },
  revokedAt: { type: Date },
}, { timestamps, versionKey: false });

const cameraSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  zone: { type: String, required: true },
  status: { type: String, enum: ['online', 'warning', 'offline'], required: true },
  aiStatus: { type: String, enum: ['processing', 'degraded', 'stopped'], required: true },
  lastFrameAt: { type: Date, required: true },
  fps: { type: Number, min: 0, required: true },
  streamQuality: { type: String, required: true },
  todayEvents: { type: Number, min: 0, required: true },
  configVersion: { type: String, required: true },
  dataset: { type: String, required: true, index: true },
}, { timestamps, versionKey: false });

const eventStepSchema = new Schema({
  label: { type: String, required: true },
  state: { type: String, enum: ['complete', 'failed', 'unknown'], required: true },
  time: { type: String },
}, { _id: false });

const inspectionEventSchema = new Schema({
  _id: { type: String, required: true },
  cameraId: { type: String, required: true, index: true },
  cameraName: { type: String, required: true },
  zone: { type: String, required: true },
  timestamp: { type: Date, required: true, index: true },
  outcome: { type: String, enum: ['completed', 'missed', 'incomplete', 'unresolved'], required: true, index: true },
  reason: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 100, required: true },
  reviewStatus: { type: String, enum: ['unreviewed', 'confirmed', 'dismissed'], required: true, index: true },
  summary: { type: String, required: true },
  evidenceAvailable: { type: Boolean, required: true },
  remarks: { type: String, maxlength: 1000 },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  modelVersion: { type: String, required: true },
  ruleVersion: { type: String, required: true },
  version: { type: Number, min: 1, required: true },
  steps: { type: [eventStepSchema], required: true },
  schemaVersion: { type: Number, required: true, default: 1 },
  dataset: { type: String, required: true, index: true },
}, { timestamps, versionKey: false });
inspectionEventSchema.index({ timestamp: -1, _id: -1 });
inspectionEventSchema.index({ cameraId: 1, timestamp: -1 });
inspectionEventSchema.index({ outcome: 1, timestamp: -1 });
inspectionEventSchema.index({ reviewStatus: 1, timestamp: -1 });
inspectionEventSchema.index({ cameraId: 1, outcome: 1, reviewStatus: 1, timestamp: -1 });

const healthMetricSchema = new Schema({
  _id: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: String, required: true },
  detail: { type: String, required: true },
  state: { type: String, enum: ['healthy', 'warning', 'critical', 'neutral'], required: true },
  checkedAt: { type: Date, required: true },
  source: { type: String, required: true },
  dataset: { type: String, required: true, index: true },
}, { timestamps, versionKey: false });

const evidenceSchema = new Schema({
  _id: { type: String, required: true },
  eventId: { type: String, required: true, unique: true },
  state: { type: String, enum: ['available', 'unavailable', 'pending'], required: true },
  type: { type: String, enum: ['snapshot', 'clip', 'none'], required: true },
  mimeType: { type: String },
  sizeBytes: { type: Number, min: 0 },
  checksum: { type: String },
  dataset: { type: String, required: true, index: true },
}, { timestamps, versionKey: false });

const auditSchema = new Schema({
  actionId: { type: String, required: true, unique: true },
  actorId: { type: String, required: true },
  actorDisplayName: { type: String, required: true },
  actorRole: { type: String, enum: ['viewer', 'supervisor', 'admin'], required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true, index: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  correlationId: { type: String, required: true },
  occurredAt: { type: Date, required: true, index: true },
}, { timestamps, versionKey: false });

export const UserModel = mongoose.models.User ?? mongoose.model('User', userSchema);
export const SessionModel = mongoose.models.Session ?? mongoose.model('Session', sessionSchema);
export const CameraModel = mongoose.models.Camera ?? mongoose.model('Camera', cameraSchema);
export const InspectionEventModel = mongoose.models.InspectionEvent ?? mongoose.model('InspectionEvent', inspectionEventSchema);
export const HealthMetricModel = mongoose.models.HealthMetric ?? mongoose.model('HealthMetric', healthMetricSchema);
export const EvidenceModel = mongoose.models.Evidence ?? mongoose.model('Evidence', evidenceSchema);
export const AuditModel = mongoose.models.Audit ?? mongoose.model('Audit', auditSchema);

export async function ensureIndexes(): Promise<void> {
  await Promise.all([
    UserModel.createIndexes(),
    SessionModel.createIndexes(),
    CameraModel.createIndexes(),
    InspectionEventModel.createIndexes(),
    HealthMetricModel.createIndexes(),
    EvidenceModel.createIndexes(),
    AuditModel.createIndexes(),
  ]);
}
