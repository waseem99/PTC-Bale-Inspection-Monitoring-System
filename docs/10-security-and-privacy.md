# Security and Privacy

## Security objectives

- protect camera streams, site footage, evidence, and client operational data;
- prevent unauthorized access to cameras, edge services, dashboard, and Azure resources;
- maintain traceable review and configuration changes;
- preserve edge operation without exposing inbound services;
- align deployment with client Microsoft and Azure security controls.

## Data classification

Treat the following as restricted client data:

- camera credentials and stream URLs;
- live and recorded footage;
- snapshots and evidence clips;
- site layouts, camera positions, IP plans, and power/network diagrams;
- annotated datasets;
- user identities and remarks;
- model outputs tied to operational events;
- production configuration and logs containing identifiers.

## Repository controls

- repository must be private before site-specific or client-sensitive artifacts are added;
- enable branch protection for `main`;
- require pull requests and review for production-impacting changes;
- enable secret scanning and dependency alerts where available;
- do not commit `.env`, certificates, camera URLs, IP addresses, footage, datasets, evidence, or model binaries;
- use Git LFS only if explicitly approved; secure object storage is preferred for models and datasets.

## Authentication and authorization

- dashboard users authenticate with Microsoft Entra ID where approved;
- edge-to-cloud calls use a dedicated machine identity;
- camera credentials use a dedicated restricted service account where camera support allows;
- no shared administrator credentials in code or documentation;
- access is granted according to least privilege;
- production administration is separated from normal dashboard use.

## Network controls

- place cameras and edge workstation in the client-approved network segment;
- restrict camera access to the required workstation and administration points;
- no direct public exposure of RTSP streams;
- use outbound-only synchronization from edge to Azure;
- require TLS for all application API communication;
- validate client proxy, firewall, DNS, and certificate requirements;
- use private endpoints or network restrictions where mandated.

## Edge hardening

- current supported operating system and security updates;
- approved endpoint protection;
- restricted local administrator access;
- automatic service start under a dedicated service identity;
- host firewall rules limited to required traffic;
- encrypted disk where required by client policy;
- protected configuration and evidence directories;
- software inventory and signed/approved release packages;
- remove unnecessary services and development tools from production.

## Application security

- validate all API inputs;
- enforce authorization on every event and evidence endpoint;
- use parameterized data access through the ORM;
- use private evidence containers;
- generate only short-lived authorized evidence access;
- protect export endpoints from unbounded queries;
- apply pagination, rate limits where required, and file-size controls;
- record security-relevant application events without logging secrets.

## Evidence integrity

- use stable event IDs;
- record evidence checksums;
- store original AI outcome separately from human review status;
- retain model, SOP, and configuration versions with each event;
- audit changes to review status and remarks;
- define the approved handling of deleted or expired evidence.

## Privacy boundaries

- no face recognition;
- no biometric identification;
- no employee scoring or profiling;
- person detections are temporary tracks used only for process interaction;
- dashboard access and evidence visibility are limited to approved users;
- data collection is restricted to the agreed inspection area and purpose.

## Retention and deletion

The client must approve retention for:

- raw training footage;
- annotated data;
- local event evidence;
- cloud evidence;
- event metadata;
- audit logs;
- diagnostic logs.

Deletion must be auditable and must not occur before required acceptance or investigation periods.

## Logging rules

Do not log:

- passwords, tokens, certificates, or full connection strings;
- camera credentials or full stream URLs;
- raw image contents in application logs;
- personal data not required for support.

Log:

- service status;
- camera ID rather than credentials;
- event ID and reason code;
- error category and correlation ID;
- configuration/model version;
- synchronization attempt and outcome.

## Incident handling

1. contain access or stop affected synchronization where required;
2. preserve relevant logs and event identifiers;
3. notify the approved project/client contacts;
4. rotate affected secrets;
5. assess footage/evidence exposure;
6. document root cause and corrective action;
7. validate the fix before restoring normal operation.

## Pre-production security checklist

- private repository confirmed;
- no secrets in commit history;
- Entra ID application and groups approved;
- edge service identity approved;
- camera credentials rotated from defaults;
- TLS and certificate validation enabled;
- Azure storage is private;
- production secrets stored in Key Vault or approved store;
- endpoint and network rules tested;
- audit logging tested;
- backup, retention, and incident contacts documented.
