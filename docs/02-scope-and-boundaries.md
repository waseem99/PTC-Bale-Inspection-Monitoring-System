# Scope and Boundaries

## In scope for the PoC/MVP

### Reference-to-PTC validation

- review and classify the Bangladesh reference features;
- map relevant physical workflow, camera, AI status, and dashboard concepts to the PTC BOQ and approved proposal;
- resolve `scan`, `open`, `check`, and `frisk` terminology;
- document differences between the reference site and PTC;
- treat reference media as restricted visual reference unless training rights are confirmed.

### Hardware integration

- four IP cameras from the awarded BOQ;
- camera mounting, CAT6 cabling, PoE switching, edge workstation, storage, and UPS;
- camera addressing, stream orientation, image configuration, time synchronization, and health monitoring;
- approved PTC site installation, testing, and calibration.

### Edge and AI

- RTSP/ONVIF camera integration;
- bale detection;
- anonymous worker/person detection;
- temporary object tracking inside each camera/zone view;
- inspection-zone and ignored-region configuration;
- bale-opening and frisking/checking interaction detection based on the approved PTC SOP;
- completed, missed, incomplete, and unresolved inspection classification;
- camera/system health events kept separate from process violations;
- local event buffering and persistence;
- snapshot and short evidence-clip generation;
- model, threshold, zone, camera-orientation, and configuration version tracking;
- PTC-specific data collection, annotation, training, evaluation, live calibration, and locked UAT testing.

### Local MERN application

- locally deployed Node.js/Express API;
- local MongoDB-compatible metadata database;
- protected local evidence storage;
- local intranet React dashboard;
- approved local/offline access control;
- local live camera view;
- dashboard KPIs limited to data produced by the PoC;
- event and violation list;
- event detail with evidence;
- camera, date/time, event-type, outcome, and review-status filters;
- reviewed/unreviewed status;
- operator remarks and audit records;
- basic on-demand CSV and PDF export;
- camera, service, storage, database, and synchronization health indicators.

### Approved Azure alignment

Only components approved through issue #11 are included, which may comprise:

- outbound synchronization of approved event metadata and evidence;
- Azure-hosted Node/React application components;
- Azure Cosmos DB for MongoDB or another approved MongoDB service;
- private Azure Blob Storage;
- Microsoft Entra ID for approved central/remote users;
- Key Vault, Application Insights, Azure Web PubSub, and Bicep deployment where required.

Core local AI, event storage, evidence, and dashboard operation must not depend on Azure availability.

### Delivery and support

- GitHub Actions CI/CD and local release packaging;
- installation and commissioning;
- PTC-specific testing and calibration;
- UAT, user training, technical documentation, and release manifest;
- five-week hypercare and two controlled improvement cycles;
- standard warranty/support as stated in the awarded documents.

## Explicitly out of scope

- treating every Bangladesh-reference or generic-demo feature as a PTC requirement;
- use of Bangladesh footage as PTC acceptance evidence;
- face recognition or worker identity;
- named worker tracking;
- worker dwell-time, productivity, attendance, or performance ranking;
- cup/item counting or unrelated generic analytics;
- barcode, QR, RFID, scanner, PLC, MES, sensor, or custom IoT integration;
- permanent bale identity across cameras or external systems;
- ERP, SAP, or production-system integration;
- mobile application;
- WhatsApp, SMS, or external notification gateways;
- multi-site management;
- advanced compliance scoring;
- predictive analytics;
- continuous long-term local or cloud video recording;
- video wall or control-room buildout;
- camera or IoT firmware development;
- additional cameras beyond the awarded quantity;
- automated scheduled email delivery unless confirmed in writing;
- granular enterprise role-based access beyond the approved PoC user model;
- cloud disaster recovery or high-availability architecture beyond the agreed PoC;
- infrastructure, licenses, or cloud services not stated in the BOQ or approved change request.

## Scope interpretation rules

1. The awarded BOQ, approved proposal, final PTC SOP, written clarifications, and signed change requests are authoritative.
2. Reference-project media informs design but does not add scope.
3. The visible reference status `Not Scanned` is not equivalent to missed opening/frisking until the PTC process owner confirms it.
4. A dashboard display of existing data does not imply a new analytics capability.
5. A camera/zone track ID is temporary and local to the visible sequence.
6. “Real time” means operationally near real time, subject to configured sampling, inference time, hardware capacity, and evidence processing.
7. AI accuracy targets must be defined against the agreed PTC test set and scenario definitions.
8. Continuous raw-video retention is excluded unless an explicit retention policy, storage variation, and commercial approval are provided.
9. Azure services are conditional on the approved responsibility matrix and cannot replace the committed local/offline capability.
10. New requirements are recorded as `scope:change-request` and are not scheduled into the PoC without commercial and timeline approval.
