# Scope and Boundaries

## In scope for the MVP

### Hardware integration

- four IP cameras from the awarded BOQ;
- camera mounting, CAT6 cabling, PoE switching, edge workstation, storage, and UPS;
- camera addressing, stream configuration, time synchronization, and health monitoring;
- approved site installation, testing, and calibration.

### Edge and AI

- RTSP/ONVIF camera integration;
- bale detection;
- worker detection;
- temporary object tracking inside each camera view;
- inspection-zone configuration;
- bale-opening/checking interaction detection based on the approved SOP;
- missed and incomplete inspection classification;
- local event buffering;
- snapshot and short evidence-clip generation;
- model, threshold, zone, and configuration version tracking.

### Application

- live camera view;
- dashboard KPIs limited to data produced by the MVP;
- event and violation list;
- event detail with evidence;
- camera, date/time, event-type, and review-status filters;
- reviewed/unreviewed status;
- operator remarks;
- basic CSV and PDF export;
- camera and service health indicators.

### Deployment

- edge runtime at the client site;
- Azure-hosted components approved by the client;
- Microsoft Entra ID authentication where client tenant access is available;
- GitHub Actions CI/CD;
- operational documentation and user training.

## Explicitly out of scope

- face recognition or worker identity;
- worker performance ranking;
- barcode, QR, or RFID integration;
- permanent bale identity across cameras or external systems;
- ERP, MES, SAP, or production-system integration;
- mobile application;
- WhatsApp, SMS, or external notification gateways;
- multi-site management;
- advanced compliance scoring;
- predictive analytics;
- continuous long-term cloud video recording;
- video wall or control-room buildout;
- camera firmware development;
- custom IoT device firmware;
- additional cameras beyond the awarded quantity;
- automated scheduled email delivery unless confirmed in writing;
- granular role-based access beyond the approved MVP user model;
- cloud disaster-recovery architecture beyond the agreed deployment;
- infrastructure or licenses not stated in the BOQ or approved change request.

## Scope interpretation rules

1. The proposal, BOQ, approved SOP, and written clarifications override this document.
2. A dashboard display of existing data does not imply a new analytics capability.
3. A camera track ID is temporary and local to the visible sequence.
4. “Real time” means operationally near real time, subject to configured sampling, inference time, network conditions, and evidence processing.
5. AI accuracy targets must be defined against an agreed test set and scenario definitions.
6. Continuous raw-video retention is excluded unless an explicit retention policy and storage variation are approved.
7. New requirements are recorded as `scope:change-request` and are not scheduled into the MVP without commercial and timeline approval.
