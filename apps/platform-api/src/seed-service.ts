import type { AppConfig } from './config';
import {
  AuditModel,
  CameraModel,
  EvidenceModel,
  HealthMetricModel,
  InspectionEventModel,
  SessionModel,
  UserModel,
  ensureIndexes,
} from './models';
import { hashPassword } from './security';
import { DATASET, seedCameras, seedEvents, seedHealth } from './seed-data';

export async function resetSyntheticData(): Promise<void> {
  await Promise.all([
    SessionModel.deleteMany({}),
    AuditModel.deleteMany({}),
    EvidenceModel.deleteMany({ dataset: DATASET }),
    InspectionEventModel.deleteMany({ dataset: DATASET }),
    HealthMetricModel.deleteMany({ dataset: DATASET }),
    CameraModel.deleteMany({ dataset: DATASET }),
    UserModel.deleteMany({ dataset: DATASET }),
  ]);
}

function requirePasswords(config: AppConfig): { viewer: string; supervisor: string; admin: string } {
  const { viewer, supervisor, admin } = config.seedPasswords;
  if (!viewer || !supervisor || !admin) {
    throw new Error('Set SEED_DEMO_PASSWORD or all three role-specific seed password variables before seeding.');
  }
  return { viewer, supervisor, admin };
}

export async function seedSyntheticData(
  config: AppConfig,
  reset = false,
): Promise<{ users: number; cameras: number; health: number; events: number }> {
  if (reset) await resetSyntheticData();
  await ensureIndexes();
  const passwords = requirePasswords(config);
  const userDefinitions = [
    { _id: 'usr-viewer', username: 'viewer', displayName: 'Viewer Demo', role: 'viewer', password: passwords.viewer },
    { _id: 'usr-supervisor', username: 'supervisor', displayName: 'Supervisor Demo', role: 'supervisor', password: passwords.supervisor },
    { _id: 'usr-admin', username: 'admin', displayName: 'Administrator Demo', role: 'admin', password: passwords.admin },
  ] as const;

  for (const user of userDefinitions) {
    const passwordHash = await hashPassword(user.password);
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          passwordHash,
          enabled: true,
          dataset: DATASET,
        },
      },
      { upsert: true },
    );
  }

  await CameraModel.bulkWrite(seedCameras().map(({ _id, ...camera }) => ({
    updateOne: { filter: { _id }, update: { $set: camera }, upsert: true },
  })));
  await HealthMetricModel.bulkWrite(seedHealth().map(({ _id, ...metric }) => ({
    updateOne: { filter: { _id }, update: { $set: metric }, upsert: true },
  })));

  const events = seedEvents();
  await InspectionEventModel.bulkWrite(events.map(({
    _id,
    reviewStatus,
    remarks,
    reviewedBy,
    reviewedAt,
    version,
    ...immutable
  }) => ({
    updateOne: {
      filter: { _id },
      update: {
        $set: immutable,
        $setOnInsert: {
          reviewStatus,
          ...(remarks ? { remarks } : {}),
          ...(reviewedBy ? { reviewedBy } : {}),
          ...(reviewedAt ? { reviewedAt } : {}),
          version,
        },
      },
      upsert: true,
    },
  })));

  await EvidenceModel.bulkWrite(events.map((event) => ({
    updateOne: {
      filter: { eventId: event._id },
      update: {
        $set: {
          eventId: event._id,
          state: event.evidenceAvailable ? 'pending' : 'unavailable',
          type: event.evidenceAvailable ? 'snapshot' : 'none',
          ...(event.evidenceAvailable ? {
            mimeType: 'image/jpeg',
            sizeBytes: 0,
            checksum: 'synthetic-placeholder-no-file',
          } : {}),
          dataset: DATASET,
        },
        $setOnInsert: { _id: `EVD-${event._id}` },
      },
      upsert: true,
    },
  })));

  return seedStatus();
}

export async function seedStatus(): Promise<{ users: number; cameras: number; health: number; events: number }> {
  const [users, cameras, health, events] = await Promise.all([
    UserModel.countDocuments({ dataset: DATASET }),
    CameraModel.countDocuments({ dataset: DATASET }),
    HealthMetricModel.countDocuments({ dataset: DATASET }),
    InspectionEventModel.countDocuments({ dataset: DATASET }),
  ]);
  return { users, cameras, health, events };
}
