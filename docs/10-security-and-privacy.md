# Security and Privacy

## Security objectives

- protect camera streams, PTC footage, Bangladesh reference media, evidence, and client operational data;
- prevent unauthorized access to cameras, edge services, local dashboard, and approved Azure resources;
- maintain traceable review and configuration changes;
- preserve local operation without exposing inbound services;
- align approved cloud deployment with client Microsoft and Azure security controls.

## Data classification

Treat the following as restricted client/project data:

- camera credentials and stream URLs;
- live and recorded PTC footage;
- Bangladesh reference images and videos;
- snapshots and evidence clips;
- site layouts, camera positions, IP plans, and power/network diagrams;
- annotated datasets;
- user identities and remarks;
- model outputs tied to operational events;
- production configuration and logs containing identifiers.

## Repository controls

- repository is private;
- enable branch protection for `main`;
- require pull requests and review for production-impacting changes;
- enable secret scanning and dependency alerts where available;
- do not commit `.env`, certificates, camera URLs, production IP addresses, footage, datasets, evidence, reference media, client source documents, or model binaries;
- use Git LFS only if explicitly approved; restricted object storage is preferred for models and datasets;
- private visibility does not change restricted-data handling rules.

## Authentication and authorization

- local dashboard users use the client-approved offline-capable access model;
- approved central/remote users authenticate with Microsoft Entra ID where enabled;
- edge-to-local and optional edge/local-to-cloud calls use dedicated machine identities;
- camera credentials use a dedicated restricted service account where camera support allows;
- no shared administrator credentials in code or documentation;
- access is granted according to least privilege;
- production administration is separated from normal dashboard use;
- loss of Azure or Entra connectivity must not disable already approved local PoC operation.

## Network controls

- place cameras and the edge workstation in the client-approved network segment;
- restrict camera access to the required workstation and administration points;
- no direct public exposure of RTSP streams;
- use outbound-only synchronization from the site to Azure where approved;
- require TLS for application API communication where traffic leaves the workstation/site;
- validate client proxy, firewall, DNS, and certificate requirements;
- use private endpoints or network restrictions where mandated;
- do not introduce scanner, RFID, PLC, or custom IoT connectivity without approved change control.

## Edge and local application hardening

- current supported operating system and security updates;
- approved endpoint protection;
- restricted local administrator access;
- automatic Python, Node.js, MongoDB, and dashboard-service start under approved identities;
- host firewall rules limited to required traffic;
- encrypted disk where required by client policy;
- protected configuration, database, spool, and evidence directories;
- software inventory and signed/approved release packages;
- remove unnecessary services and development tools from production;
- document local backup, restore, and safe-shutdown behavior.

## Application security

- validate all API inputs against versioned contracts;
- enforce authorization on every event, evidence, review, export, and administration endpoint;
- use validated/parameterized data access through Mongoose;
- expose local evidence only through authorized API access;
- use private Azure evidence containers where synchronization is enabled;
- generate only short-lived authorized cloud evidence access;
- protect export endpoints from unbounded queries;
- apply pagination, rate limits where required, and file-size controls;
- record security-relevant events without logging secrets or raw media.

## Evidence integrity

- use stable event IDs;
- record evidence checksums;
- store original AI outcome separately from human review status;
- retain model, SOP, zone, camera, and configuration versions with each event;
- audit changes to review status and remarks;
- preserve unsynchronized records and evidence;
- define the approved handling of deleted or expired evidence.

## Privacy boundaries

- no face recognition;
- no biometric identification;
- no named worker tracking;
- no employee scoring, dwell analytics, or profiling;
- person detections are temporary anonymous tracks used only for process interaction;
- dashboard access and evidence visibility are limited to approved users;
- data collection is restricted to the agreed inspection area and purpose;
- generic demonstration features do not authorize additional person analytics.

## Reference and dataset governance

- record whether Bangladesh media is reference-only or permitted for training;
- do not use Bangladesh media as PTC acceptance evidence;
- preserve source-site and permitted-use fields in dataset manifests;
- separate Bangladesh reference, PTC training, PTC calibration, and locked PTC UAT data;
- do not place any of these media sets in GitHub;
- access and deletion follow approved ownership and retention decisions.

## Retention and deletion

The client must approve retention for:

- Bangladesh reference material where Codistan stores a copy;
- raw PTC training footage;
- annotated PTC data;
- local event evidence;
- approved cloud evidence;
- local and cloud event metadata;
- audit logs;
- diagnostic logs;
- local spool and unsynchronized records.

Deletion must be auditable and must not occur before required acceptance, synchronization, support, or investigation periods.

## Logging rules

Do not log:

- passwords, tokens, certificates, or full connection strings;
- camera credentials or full stream URLs;
- raw image/video contents;
- personal data not required for support;
- unrestricted local evidence paths.

Log:

- service status;
- camera/zone ID rather than credentials;
- event ID and reason code;
- error category and correlation ID;
- model/rule/zone/camera configuration version;
- local persistence and optional synchronization attempt/outcome.

## Incident handling

1. contain access or stop affected synchronization where required;
2. keep local safety and evidence-preservation requirements in mind;
3. preserve relevant logs, event IDs, and checksums;
4. notify the approved project/client contacts;
5. rotate affected secrets;
6. assess footage/evidence/reference-data exposure;
7. document root cause and corrective action;
8. validate local operation and then optional cloud synchronization before restoring normal service.

## Pre-production security checklist

- private repository confirmed;
- no secrets or restricted media in commit history;
- local dashboard access method approved and tested offline;
- Entra ID application and groups approved where enabled;
- local/edge service identities approved;
- camera credentials rotated from defaults;
- TLS and certificate validation enabled where required;
- local evidence/database directories protected;
- approved Azure storage private;
- production secrets stored in Key Vault or approved local store;
- endpoint and network rules tested;
- audit logging tested;
- data-use rights and dataset lineage recorded;
- backup, retention, and incident contacts documented.
