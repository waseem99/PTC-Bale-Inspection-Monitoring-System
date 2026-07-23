# Operations Runbook

## Purpose

This runbook defines the minimum operational checks, incident response, release, rollback, and support procedures for the edge and Azure components.

## Daily operational checks

- confirm all four cameras are online;
- confirm last-frame timestamps are current;
- confirm edge services are running;
- confirm GPU inference is active;
- review local disk free space;
- review pending synchronization queue;
- confirm latest event reached the dashboard;
- review evidence-generation failures;
- review P0/P1 application alerts;
- confirm workstation and switch remain on UPS-protected power.

## Camera incident

### Symptoms

- camera marked offline;
- stale last-frame timestamp;
- repeated decoder or authentication failures;
- blank or severely degraded image.

### Response

1. verify camera power/PoE link;
2. verify switch port and network connectivity;
3. verify camera time and stream configuration;
4. check whether credentials were changed;
5. restart only the affected ingest process where possible;
6. inspect physical obstruction, lighting, focus, or cable damage;
7. confirm recovery in camera health;
8. record the outage period.

Do not classify inspections during absent/unusable footage as definite violations.

## Edge service incident

1. identify the failed service and last healthy timestamp;
2. inspect structured logs using the correlation/event ID;
3. verify disk space, GPU driver, and dependency status;
4. restart the affected managed service;
5. confirm the local spool remains intact;
6. validate one test event through the pipeline;
7. escalate if repeated restart does not recover the service.

## Synchronization backlog

1. verify site internet and DNS;
2. verify API endpoint and TLS certificate;
3. verify service identity/credential validity;
4. inspect API response category;
5. confirm local queue depth and oldest pending event;
6. avoid deleting pending events;
7. restore connectivity and observe idempotent retry;
8. confirm queue returns to normal.

## Low disk condition

1. identify whether usage is evidence, logs, spool, or application files;
2. do not remove unsynchronized events;
3. apply only the approved retention/deletion policy;
4. archive or remove expired evidence through the approved process;
5. verify evidence generation resumes;
6. investigate unexpectedly high event volume or clip duration.

## Azure/API incident

- check application health and recent deployments;
- check authentication and Key Vault access;
- check Azure SQL connectivity and capacity;
- check Blob Storage permissions and availability;
- review Application Insights failures and dependency calls;
- roll back the application release if the incident began after deployment;
- confirm edge events continue to queue locally.

## Model/configuration incident

Symptoms include a sudden increase in false positives, false negatives, lost tracks, or incorrect reason codes.

1. identify active model, SOP, and configuration versions;
2. compare behavior with the previous approved release;
3. capture event IDs and client review outcomes;
4. do not tune production thresholds without a tracked change;
5. reproduce using approved footage;
6. run regression evaluation;
7. deploy an approved configuration/model fix or roll back.

## Release procedure

1. verify all required pull requests are reviewed and merged;
2. confirm CI passes;
3. record API, dashboard, edge, model, rule, and configuration versions;
4. back up production configuration and pending spool state;
5. deploy to UAT and run smoke tests;
6. obtain production approval;
7. deploy Azure application components;
8. deploy edge package during the approved window;
9. validate camera health, one normal event, one approved test violation, evidence, sync, and dashboard;
10. publish release notes and installed-version manifest.

## Rollback procedure

- restore the previous Azure application release;
- restore the previous edge release package;
- restore the previous model/rules/configuration as one compatible set;
- preserve pending events and evidence;
- run post-rollback smoke tests;
- document cause, impact, and next action.

## Backup scope

- infrastructure code and application source remain in GitHub;
- model artifacts and manifests remain in approved model storage;
- production configuration is backed up securely;
- Azure SQL and Blob retention follow client-approved policy;
- local spool is preserved during upgrades and incidents;
- raw footage and datasets follow separately approved retention.

## Support severity and response priority

- **P0:** security exposure, data loss, or complete production outage.
- **P1:** core camera/AI/event/evidence workflow materially unavailable or incorrect.
- **P2:** partial non-blocking defect with workaround.
- **P3:** cosmetic, low-impact, or documentation issue.

The commercial support agreement governs actual response and resolution times.

## Handover records

- hardware and camera inventory;
- approved camera layout;
- release and configuration manifest;
- model evaluation report;
- Azure resource inventory;
- user and service access list;
- backup and retention settings;
- incident and escalation contacts;
- known limitations and accepted issues.
