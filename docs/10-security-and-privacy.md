# Security and Privacy Boundary

**Current repository/release authority:** [`51-current-release-and-control-state.md`](51-current-release-and-control-state.md)

This document defines the active security/privacy boundary for the PTC PoC/MVP. It is not a mandate to expand project closure into an enterprise-security programme.

## Security objectives

- protect camera streams, PTC footage, reference media, evidence, database records and operational data;
- prevent unauthorized access to cameras, runtime services, PostgreSQL and the local dashboard;
- keep secrets/restricted assets outside GitHub;
- maintain traceable application, review, migration and configuration changes;
- preserve approved local operation during internet/cloud interruption.

## Restricted project data

Treat the following as restricted and keep them outside GitHub:

- camera credentials, RTSP/full stream URLs and private IP/network details;
- PostgreSQL credentials, database URLs, dumps and backups;
- live/recorded PTC footage, reference media and extracted frames;
- snapshots/evidence clips and protected runtime state;
- site layouts/camera positions/private diagrams;
- annotations, datasets, locked-test material and model binaries/weights;
- production configuration/secrets;
- confidential client notes and logs containing sensitive identifiers.

GitHub may contain sanitized IDs, versions, manifests, checksums, test results and non-secret configuration examples only.

## Repository controls — verified current position

- repository is private;
- issue #14 is closed/completed;
- CODEOWNERS and CI workflows exist;
- `.gitignore` and CI/output scanning protect the known restricted-file/secret classes;
- private visibility does not weaken restricted-data handling rules;
- current private-repository GitHub plan does **not** provide the desired enforced `main` ruleset/branch-protection controls;
- that plan limitation is accepted and must not be converted into additional application/security scope;
- repository-owner change control, review discipline and CI are the compensating controls.

If the GitHub plan later supports private-repository rulesets, branch protection may be enabled as administrative hardening without reopening this project.

## Authentication and authorization

- dashboard access uses the implemented application authentication/session model;
- authorization applies to events, evidence, review, reporting and administration actions;
- service/machine ingestion uses dedicated identities/tokens rather than interactive user credentials;
- database access uses a dedicated application role, not shared administrator credentials;
- secrets remain in approved runtime storage, not code/documentation;
- optional future Entra integration remains bounded by the already documented adapter/readiness path and is not a closure blocker unless PTC explicitly requires activation.

## Network/runtime controls

- no direct public RTSP exposure;
- no browser access to camera credentials or PostgreSQL;
- PostgreSQL is bound only to the approved local/container or protected remote network boundary;
- actual camera/site access is configured outside GitHub;
- TLS is required where application traffic leaves the trusted local boundary and the approved environment requires it;
- host/firewall/proxy/DNS controls are deployment/site responsibilities, not a reason to redesign the application;
- do not add scanner, RFID, PLC or unrelated IoT connectivity without approved change control.

## Application and database controls

- validate API inputs against versioned contracts;
- enforce authorization on evidence/review/report/admin paths;
- use Prisma/parameterized database access;
- keep review mutation and audit creation transactional;
- use pagination/bounds for exports and queries;
- record security-relevant events without secrets/raw media;
- apply shared/field migrations through reviewed Prisma migrations;
- protect backups as restricted data;
- use the finite Option A recovery path in `44-database-resilience-option-a.md` and certified software recovery boundary in `49-recovery-rebuild-security-closure.md`.

HA clusters, automatic failover, Patroni/repmgr, active-active databases and multi-site DR are not part of current closure unless separately approved.

## Evidence integrity

- use stable event IDs and checksums where applicable;
- preserve original AI outcome separately from human review status;
- record model/rule/ROI/camera/schema/configuration versions in sanitized release records;
- audit review-state/remark changes;
- preserve unsynchronized records/evidence until approved handling/retention permits deletion.

## Privacy boundary

The approved AI purpose is process compliance, not worker identification.

Not permitted within current scope:

- face recognition;
- biometric identification;
- named worker tracking;
- employee scoring, profiling or unrelated dwell analytics;
- use of person detections beyond temporary anonymous process-interaction tracks.

Collection is limited to the agreed inspection area/purpose. Generic demonstration capability does not authorize additional person analytics.

## Dataset/reference governance

- Bangladesh/reference media is reference-only unless explicit use rights permit otherwise;
- it cannot be used as PTC acceptance evidence;
- PTC training/calibration/validation/locked-test material remains separated and protected;
- dataset manifests record permitted use, version and lineage without exposing raw media in GitHub;
- actual annotation/dataset freeze and acceptance remain under the controlled AI sequence.

## Logging

Do not log passwords, tokens, certificates/private keys, database URLs/full connection strings, camera credentials/full stream URLs, raw media or unrestricted evidence/backup paths.

Log sanitized service readiness, camera/zone IDs, event IDs/reason codes, error categories/correlation IDs, release/configuration versions and persistence/synchronization outcomes.

## Incident handling

1. contain affected access/synchronization;
2. preserve required logs, IDs, checksums, audit rows and backup state;
3. notify approved project/client contacts;
4. rotate affected runtime/database/camera/cloud credentials;
5. assess data/evidence exposure;
6. document root cause/corrective action;
7. validate application/database integrity before restoring normal service.

## Closure security checklist

For current closure, prove only the controls relevant to the selected environment and scope:

- private repo/restricted-data boundary remains intact;
- no secrets/restricted assets are committed;
- authentication/authorization paths operate as accepted;
- database/evidence storage and recovery are protected and testable;
- actual site credentials/network details remain outside GitHub;
- applicable audit/security events are available;
- target deployment/site configuration has an identified owner;
- data/model/ROI acceptance records use sanitized references.

Do not add new enterprise-security gates unless they are contractual, explicitly client-required, or needed to correct a demonstrated defect/security exposure.
