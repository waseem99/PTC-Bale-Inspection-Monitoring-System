# Edge and Local PoC Deployment

## Purpose

The site workstation hosts the complete locally functional PoC: camera processing, AI inference, SOP evaluation, event/evidence creation, local persistence, local Node.js API, local PostgreSQL database, React intranet dashboard, and optional outbound Azure synchronization.

## Physical baseline

- four BOQ cameras connected through the approved PoE/network switch;
- GPU-enabled Windows workstation;
- approved local storage and UPS;
- local network access for the dashboard;
- outbound Azure connectivity only where issue #11 approves it.

The Bangladesh reference shows overhead/ceiling cameras, rotated views, multiple bales/workers, loose leaves, and significant occlusion. These are design inputs, not approved PTC installation instructions. Issue #15 must validate PTC-specific overhead, oblique, and side views.

## Required local services

1. **Camera ingest and health** — RTSP/ONVIF connection, timestamps, orientation, reconnect, and health.
2. **AI inference** — bale and anonymous person detection, tracking, and interaction signals.
3. **Compliance engine** — PTC opening/frisking session state and explainable outcomes.
4. **Evidence service** — rolling buffer, snapshots, and short clips.
5. **Durable spool** — preserves events before local application acceptance and optional cloud synchronization.
6. **Node.js platform API** — local events, evidence access, review, filters, exports, audit, and health.
7. **Local PostgreSQL database** — users, sessions, cameras, events, ordered steps, reviews, health, evidence metadata and audit records.
8. **Prisma migration service** — applies committed SQL migrations before API startup.
9. **React dashboard and live gateway** — local intranet monitoring and review.
10. **Optional synchronization service** — outbound idempotent metadata/evidence synchronization to approved Azure components.

## Filesystem and data boundaries

Use protected directories/volumes for:

- application and service packages;
- non-secret configuration;
- protected secrets/credential references;
- local PostgreSQL volume;
- protected PostgreSQL backups;
- pending spool records;
- event evidence;
- logs;
- model/rule/zone/camera configuration packages;
- release manifests.

Raw PTC footage, annotations, Bangladesh reference media, production database dumps and production model binaries must remain in approved restricted stores and must not be copied into GitHub.

## Camera configuration

For each camera record:

- camera and zone ID;
- RTSP profile without exposing credentials in logs;
- native resolution and approved processing stream;
- frame rate and sampling policy;
- bitrate/compression;
- image rotation/orientation;
- WDR, exposure, shutter, and lighting settings;
- entry, inspection, exit, and ignored polygons;
- mounting height, angle, lens, and PTC layout reference;
- time source;
- configuration version.

Do not adopt `Not Scanned` or reference camera labels as PTC configuration semantics until issue #59/#9 resolves them.

## Installation sequence

1. confirm reference-to-PTC scope mapping and approved SOP sufficiently for survey;
2. complete PTC site survey and sample-view approval;
3. install and label cameras, cabling, switching, workstation, storage, and UPS;
4. harden the Windows workstation and configure service identities;
5. install GPU driver and runtime prerequisites;
6. install/enable the approved container runtime or native PostgreSQL service;
7. start PostgreSQL and apply committed Prisma migrations through `prisma migrate deploy`;
8. load the approved initial configuration/seed data;
9. deploy Node.js API, React dashboard, live gateway, and protected evidence directories;
10. deploy Python edge/AI/compliance services;
11. apply approved camera, zone, rule, and model configurations;
12. run local camera-to-dashboard smoke tests;
13. run eight-hour stream/application/database stability test;
14. verify PostgreSQL backup and restoration in a controlled environment;
15. configure optional Azure synchronization only after issue #11 approval;
16. capture the installed inventory and release manifest.

## Managed service behavior

- automatic start after workstation reboot;
- explicit startup dependencies: PostgreSQL, migration job, API, dashboard/live gateway, then Python event submission as appropriate;
- watchdog restart with bounded backoff;
- no loss of pending spool records during restart or upgrade;
- persistent configuration/evidence/PostgreSQL directories outside replaceable package folders;
- structured rotating logs;
- version endpoint/manifest for every component;
- controlled upgrade and rollback scripts;
- reviewed migrations only, with backup before destructive/data-transforming changes.

## Offline and failure behavior

### Internet/Azure unavailable

- camera ingest and AI continue;
- local evidence and PostgreSQL metadata continue;
- local dashboard and review remain available;
- optional cloud records queue and synchronize later.

### Local Node API unavailable

- Python spool retains events;
- inference and evidence generation continue within storage limits;
- service watchdog attempts recovery;
- events replay idempotently after local application recovery.

### PostgreSQL unavailable

- API readiness fails and the dashboard shows database degradation;
- Python spool retains pending events;
- PostgreSQL is restarted through the approved service/container manager;
- disk, volume and log health are checked;
- restore from the latest approved backup only where recovery is required;
- pending events replay idempotently after readiness returns.

### Camera unavailable

- other cameras continue;
- camera health changes to offline;
- missing footage does not create a definite process violation.

### Workstation power interruption

- UPS provides the approved continuity/safe-shutdown window;
- PostgreSQL, evidence and spool storage are closed safely where possible;
- all services recover automatically after power returns;
- pending records remain intact;
- database integrity and readiness are checked before event replay.

## PostgreSQL operations

- use a dedicated application role and private password;
- do not expose PostgreSQL outside the approved local network boundary;
- apply committed migrations with `prisma migrate deploy`;
- use `pg_dump` and `pg_restore` for protected backup/restore;
- monitor storage, connections, migration status and failed queries;
- test restart persistence and restoration before field handover;
- document backup location, rotation, encryption and recovery ownership after client approval.

## Local security baseline

- client-approved Windows build, patches, and endpoint protection;
- restricted administrator and service accounts;
- firewall permits only approved camera/local dashboard/outbound traffic;
- camera and database credentials protected from source, logs, and browser clients;
- PostgreSQL and evidence not exposed to the wider network except through the authorized API;
- local dashboard authentication works according to the approved offline model;
- encrypted storage where required;
- development tools and sample/reference media removed from production.

## Acceptance checks

- four cameras are correctly oriented and time synchronized;
- approved PTC opening/frisking actions are visible in representative operations;
- multiple-worker/bale and occlusion behavior is documented;
- four streams remain stable for eight hours;
- local Node/PostgreSQL/React application remains responsive;
- Prisma migration status is clean;
- seed/configuration counts reconcile where the synthetic or UAT dataset is used;
- local event/evidence/review works without internet;
- camera, service, PostgreSQL, API and workstation restart tests pass;
- PostgreSQL backup/restore test passes;
- UPS transition/safe shutdown is verified;
- optional Azure synchronization recovers without duplicates where enabled;
- installed versions, serials, settings, migrations and known limitations are recorded.
