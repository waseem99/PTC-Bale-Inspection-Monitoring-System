# Operations Runbook

## Purpose

This runbook defines the minimum operational checks, incident response, database migration, backup, rollback, and support procedures for the locally deployed Python edge runtime and React/Node/PostgreSQL application, plus approved Azure synchronization components where enabled.

## Daily operational checks

- confirm all four cameras are online and correctly oriented;
- confirm last-frame timestamps are current and synchronized;
- confirm Python ingest, AI, compliance, evidence, and spool services are running;
- confirm local Node.js API, PostgreSQL, React dashboard, and live gateway are running;
- confirm `/api/readyz` reports PostgreSQL connected;
- confirm GPU inference is active;
- review local disk free space, PostgreSQL volume growth, backup location and protected evidence storage;
- review pending local application and optional Azure synchronization queues;
- confirm the latest event appears in the local dashboard;
- review evidence-generation failures;
- review camera, edge, local API/PostgreSQL, access, and dashboard alerts;
- review optional Azure/Blob/Entra/Application Insights alerts separately;
- confirm workstation and switch remain on UPS-protected power.

## Camera incident

### Symptoms

- camera marked offline;
- stale last-frame timestamp;
- repeated decoder or authentication failures;
- blank, rotated, obstructed, or severely degraded image.

### Response

1. verify camera power/PoE link;
2. verify switch port and network connectivity;
3. verify camera time, stream, resolution, and orientation configuration;
4. check whether credentials were changed;
5. restart only the affected ingest process where possible;
6. inspect physical obstruction, lighting, focus, vibration, leaves, or cable damage;
7. confirm recovery in camera health and live view;
8. record the outage period.

Do not classify inspections during absent or unusable footage as definite violations.

## Edge/AI service incident

1. identify the failed Python service and last healthy timestamp;
2. inspect structured logs using the correlation/event ID;
3. verify disk space, GPU driver, model package, and dependency status;
4. restart the affected managed service;
5. confirm the local spool remains intact;
6. validate one approved test event through the pipeline;
7. escalate if repeated restart does not recover the service.

## Local application incident

1. check the Node.js API, PostgreSQL readiness, evidence directory, React hosting, and live gateway;
2. confirm local service identities, database role and filesystem permissions;
3. preserve the Python spool and any committed local events;
4. restart only the failed application component;
5. verify Prisma migration status, PostgreSQL storage and connection availability;
6. confirm one existing event and one new test event can be reviewed locally;
7. record impact and recovery time.

A local application outage is a PoC production incident even when Azure remains available.

## PostgreSQL incident

### Symptoms

- `/readyz` returns database disconnected;
- API requests return database dependency errors;
- PostgreSQL container/service repeatedly restarts;
- disk/volume becomes full;
- migration job fails;
- query or connection count becomes abnormal.

### Response

1. stop new deployment/migration activity;
2. confirm PostgreSQL service/container state and `pg_isready` result;
3. check disk, volume, memory and PostgreSQL logs;
4. preserve Python spool and pending evidence;
5. verify `DATABASE_URL` is present without exposing it in logs;
6. restart PostgreSQL only after confirming volume availability;
7. check Prisma migration status;
8. if corruption/data loss is suspected, preserve the current volume and restore into a separate controlled database from the latest approved backup;
9. verify event totals, a reviewed event and related audit record;
10. restore API readiness and then replay pending edge events idempotently;
11. record cause, data impact, recovery point and recovery time.

## Optional Azure synchronization backlog

1. confirm local event creation and review continue normally;
2. verify site internet, DNS, proxy, and TLS connectivity;
3. verify the approved Azure API endpoint and machine identity;
4. inspect response category and retry state;
5. confirm queue depth and oldest pending synchronized event;
6. do not delete pending local records or evidence;
7. restore connectivity and observe idempotent retry;
8. confirm queue returns to normal without duplicate cloud records.

## Low disk condition

1. identify whether usage is evidence, logs, spool, PostgreSQL volume, backups, or application files;
2. do not remove unsynchronized events, evidence or the only valid database backup;
3. apply only the approved retention/deletion policy;
4. archive or remove expired evidence/backups through the approved process;
5. verify PostgreSQL writes, evidence generation and API readiness resume;
6. investigate unexpectedly high event volume, database growth, clip duration, or failed synchronization.

## Azure management-plane incident

Where Azure components are enabled:

- confirm local PoC operation first;
- check App Service/container and central dashboard health;
- check Microsoft Entra authentication and Key Vault access;
- check Azure Database for PostgreSQL connectivity, storage, connections, replicas/HA where enabled, and migration status;
- check Blob Storage permissions and availability;
- check Socket.IO or Azure Web PubSub connectivity where used;
- review Application Insights failures and dependency calls;
- roll back the Azure Node.js/React release if the incident began after deployment;
- allow local records to queue for later synchronization.

An Azure incident must not stop local camera processing, local PostgreSQL persistence, local evidence, or local dashboard review.

## Model/configuration incident

Symptoms include a sudden increase in false positives, false negatives, lost tracks, incorrect worker-bale associations, or incorrect reason codes.

1. identify active model, SOP, zone, camera-orientation, threshold and database schema versions;
2. compare behavior with the previous approved release;
3. capture event IDs and client review outcomes;
4. do not tune thresholds without a tracked issue;
5. reproduce using approved PTC footage;
6. do not use Bangladesh reference footage as PTC acceptance evidence;
7. run the locked PTC regression evaluation;
8. deploy an approved configuration/model fix or roll back.

## Release procedure

1. verify all required pull requests are reviewed and merged;
2. confirm Node, React, Python, contract, Prisma migration, local packaging, Bicep where applicable, and security CI checks pass;
3. record API, dashboard, edge, model, rule, PostgreSQL, migration, camera, and configuration versions;
4. create and verify a protected PostgreSQL backup using `pg_dump`;
5. back up local production configuration, evidence metadata and pending spool state;
6. validate migration SQL and evidence changes in UAT;
7. apply `prisma migrate deploy` before starting the new API;
8. deploy the complete local PoC release and run local smoke tests;
9. validate PostgreSQL readiness, camera health, one completed event, one approved test violation, one unresolved/health scenario, evidence, review, audit, and dashboard;
10. where Azure is enabled, deploy approved infrastructure/application/database components and validate synchronization;
11. obtain production/UAT approval;
12. publish release notes and installed-version/migration manifest.

## Rollback procedure

- stop the affected API deployment and prevent additional writes where required;
- restore the previous local Node.js API and React dashboard release;
- do not manually reverse a PostgreSQL migration unless an approved tested down/compensating plan exists;
- restore the pre-release PostgreSQL backup into a controlled database when schema/data rollback is required;
- restore the previous Python edge release package;
- restore the previous model/rules/zones/camera configuration as one compatible set;
- preserve pending events and evidence;
- roll back approved Azure components separately where required;
- run PostgreSQL integrity/readiness and local post-rollback smoke tests first, followed by synchronization tests;
- document cause, impact, restored backup/migration version and next action.

## Backup scope

- infrastructure code, Prisma schema/migrations and application source remain in GitHub;
- model artifacts and manifests remain in approved restricted model storage;
- production configuration is backed up securely;
- local PostgreSQL data is backed up with `pg_dump` and restored/tested with `pg_restore`;
- database backups remain outside Git and are encrypted/protected according to client policy;
- protected local evidence and spool are preserved according to the approved policy;
- optional Azure Database for PostgreSQL/Blob backup and retention follow client-approved policy;
- raw PTC footage, annotated datasets, and Bangladesh reference media follow separate approved retention and access rules.

## Support severity and response priority

- **P0:** security exposure, data loss, failed database recovery, or complete local production outage.
- **P1:** core camera/AI/local event/evidence/PostgreSQL/review workflow materially unavailable or incorrect.
- **P2:** partial non-blocking defect with workaround, including optional cloud synchronization issues where local operation continues.
- **P3:** cosmetic, low-impact, or documentation issue.

The commercial support agreement governs actual response and resolution times.

## Handover records

- hardware and camera inventory;
- approved PTC camera layout and orientation;
- release and configuration manifest;
- model evaluation and known-limitations report;
- Bangladesh-reference-to-PTC mapping decision;
- local Node/PostgreSQL/React deployment inventory;
- Prisma schema and migration inventory;
- PostgreSQL application role, backup, restore and retention configuration without exposing passwords;
- optional Azure resource inventory;
- local and Entra user/service access list where applicable;
- evidence, spool, and synchronization settings;
- incident and escalation contacts;
- accepted limitations and open support items.
