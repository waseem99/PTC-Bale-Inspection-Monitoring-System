import type { AppConfig } from './config';
import { prisma } from './db';
import { hashPassword } from './security';
import { DATASET, seedCameras, seedEvents, seedHealth } from './seed-data';

const SYNTHETIC_USER_IDS = ['usr-viewer', 'usr-supervisor', 'usr-admin'];

export async function resetSyntheticData(config: AppConfig): Promise<void> {
  if (config.nodeEnv === 'production') {
    throw new Error('Synthetic reset is disabled when NODE_ENV=production.');
  }
  const eventIds = (await prisma.inspectionEvent.findMany({
    where: { dataset: DATASET },
    select: { id: true },
  })).map((event) => event.id);

  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: SYNTHETIC_USER_IDS } },
          ...(eventIds.length ? [{ targetId: { in: eventIds } }] : []),
        ],
      },
    }),
    prisma.session.deleteMany({ where: { userId: { in: SYNTHETIC_USER_IDS } } }),
    prisma.evidenceMetadata.deleteMany({ where: { dataset: DATASET } }),
    prisma.eventStep.deleteMany({ where: eventIds.length ? { eventId: { in: eventIds } } : { eventId: '__none__' } }),
    prisma.inspectionEvent.deleteMany({ where: { dataset: DATASET } }),
    prisma.healthMetric.deleteMany({ where: { dataset: DATASET } }),
    prisma.camera.deleteMany({ where: { dataset: DATASET } }),
    prisma.user.deleteMany({ where: { dataset: DATASET } }),
  ]);
}

function requirePasswords(config: AppConfig): { viewer: string; supervisor: string; admin: string } {
  const { viewer, supervisor, admin } = config.seedPasswords;
  if (!viewer || !supervisor || !admin) {
    throw new Error('Set SEED_DEMO_PASSWORD or all three role-specific seed password variables before seeding.');
  }
  return { viewer, supervisor, admin };
}

async function inBatches<T>(items: T[], batchSize: number, operation: (item: T) => Promise<unknown>): Promise<void> {
  for (let offset = 0; offset < items.length; offset += batchSize) {
    await Promise.all(items.slice(offset, offset + batchSize).map(operation));
  }
}

export async function seedSyntheticData(
  config: AppConfig,
  reset = false,
): Promise<{ users: number; cameras: number; health: number; events: number }> {
  if (reset) await resetSyntheticData(config);
  const passwords = requirePasswords(config);
  await prisma.session.deleteMany({ where: { userId: { in: SYNTHETIC_USER_IDS } } });

  const userDefinitions = [
    { id: 'usr-viewer', username: 'viewer', displayName: 'Viewer Demo', role: 'viewer', password: passwords.viewer },
    { id: 'usr-supervisor', username: 'supervisor', displayName: 'Supervisor Demo', role: 'supervisor', password: passwords.supervisor },
    { id: 'usr-admin', username: 'admin', displayName: 'Administrator Demo', role: 'admin', password: passwords.admin },
  ] as const;

  for (const user of userDefinitions) {
    const passwordHash = await hashPassword(user.password);
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        passwordHash,
        enabled: true,
        dataset: DATASET,
      },
      update: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        passwordHash,
        enabled: true,
        dataset: DATASET,
      },
    });
  }

  await Promise.all(seedCameras().map((camera) => prisma.camera.upsert({
    where: { id: camera.id },
    create: camera,
    update: camera,
  })));

  await Promise.all(seedHealth().map((metric) => prisma.healthMetric.upsert({
    where: { id: metric.id },
    create: metric,
    update: metric,
  })));

  const events = seedEvents();
  await inBatches(events, 20, async (event) => {
    const { steps, reviewStatus, remarks, reviewedBy, reviewedAt, ...base } = event;
    await prisma.inspectionEvent.upsert({
      where: { id: event.id },
      create: {
        ...base,
        reviewStatus,
        remarks: remarks ?? null,
        reviewedBy: reviewedBy ?? null,
        reviewedAt: reviewedAt ?? null,
        steps: {
          create: steps.map((step, sequence) => ({ ...step, sequence })),
        },
      },
      update: {
        cameraId: base.cameraId,
        cameraName: base.cameraName,
        zone: base.zone,
        timestamp: base.timestamp,
        outcome: base.outcome,
        reason: base.reason,
        confidence: base.confidence,
        summary: base.summary,
        evidenceAvailable: base.evidenceAvailable,
        modelVersion: base.modelVersion,
        ruleVersion: base.ruleVersion,
        schemaVersion: base.schemaVersion,
        dataset: base.dataset,
        steps: {
          deleteMany: {},
          create: steps.map((step, sequence) => ({ ...step, sequence })),
        },
      },
    });

    await prisma.evidenceMetadata.upsert({
      where: { eventId: event.id },
      create: {
        id: `EVD-${event.id}`,
        eventId: event.id,
        state: event.evidenceAvailable ? 'pending' : 'unavailable',
        type: event.evidenceAvailable ? 'snapshot' : 'none',
        dataset: DATASET,
      },
      update: {
        state: event.evidenceAvailable ? 'pending' : 'unavailable',
        type: event.evidenceAvailable ? 'snapshot' : 'none',
        mimeType: null,
        sizeBytes: null,
        checksum: null,
        storageKey: null,
        dataset: DATASET,
      },
    });
  });

  return seedStatus();
}

export async function seedStatus(): Promise<{ users: number; cameras: number; health: number; events: number }> {
  const [users, cameras, health, events] = await Promise.all([
    prisma.user.count({ where: { dataset: DATASET } }),
    prisma.camera.count({ where: { dataset: DATASET } }),
    prisma.healthMetric.count({ where: { dataset: DATASET } }),
    prisma.inspectionEvent.count({ where: { dataset: DATASET } }),
  ]);
  return { users, cameras, health, events };
}
