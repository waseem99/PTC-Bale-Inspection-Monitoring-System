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
- the React application uses MSAL without a browser-side client secret;
- the Node.js API validates issuer, audience, signature, expiry, and approved claims server-side;
- edge-to-cloud calls use a dedicated machine identity separate from user identity;
- camera credentials use a dedicated restricted service account where camera support allows;
- no shared administrator credentials in code or documentation;
- access is granted according to least privilege;
- production administration is separated from normal dashboard use.

## Network controls

- place cameras and edge workstation in the client-approved network segment;
- restrict camera access to the required workstation and administration points;
- no direct public exposure of RTSP streams;
- no camera credentials or raw RTSP URLs are exposed to the React frontend;
- use outbound-only synchronization from edge to Azure;
- require TLS for all application API communication;
- validate client proxy, firewall, DNS, and certificate requirements;
- use private endpoints or network restrictions where mandated;
- restrict MongoDB/Cosmos DB and Blob access to approved application identities and networks.

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

- validate all external payloads using versioned schemas before persistence or processing;
- enforce authorization on every event, evidence, review, health, and export endpoint;
- use Mongoose/MongoDB driver APIs and never construct untrusted database operators from request input;
- explicitly allow approved filters and sort fields;
- apply NoSQL injection protections and reject operator-shaped input where not required;
- use private evidence containers;
- generate only short-lived authorized evidence access;
- protect export endpoints from unbounded queries;
- apply pagination, rate limits where required, and file-size controls;
- configure secure HTTP headers, CORS, and request body limits;
- record security-relevant application events without logging secrets or restricted evidence.

## Dependency and supply-chain controls

- pin Node and Python dependencies through lock files;
- review npm and Python dependency advisories;
- scan source and container/package artifacts for known vulnerabilities where available;
- prevent secrets from entering Git history or workflow logs;
- use approved GitHub Actions and pin third-party actions to trusted versions/commits where required;
- document the Node.js, Python, GPU/runtime, and operating-system versions in each release manifest.

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

Deletion must be auditable and must not occur before required acceptance or investigation periods. MongoDB TTL indexes and Blob lifecycle policies may be used only where their behavior matches the approved policy and never for unsynchronized edge records.

## Logging rules

Do not log:

- passwords, tokens, certificates, or full connection strings;
- camera credentials or full stream URLs;
- raw image contents in application logs;
- evidence access tokens;
- personal data not required for support.

Log:

- service status;
- camera ID rather than credentials;
- event ID and reason code;
- error category and correlation ID;
- configuration/model version;
- synchronization attempt and outcome;
- authenticated actor ID for approved review changes.

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
- Azure Blob and MongoDB/Cosmos DB access restricted;
- production secrets stored in Key Vault or approved store;
- endpoint and network rules tested;
- NoSQL injection, authorization, and evidence access tests passed;
- audit logging tested;
- backup, retention, and incident contacts documented.
