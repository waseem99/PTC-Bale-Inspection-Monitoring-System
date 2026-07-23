# Client Inputs and Decisions Required

This register contains the decisions and access required to deliver the MVP without relying on assumptions.

## Reference implementation mapping

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-33 | Confirmation of which Bangladesh reference features PTC expects in the PoC | The reference media is a benchmark, not a complete specification | Week 1 |
| CI-34 | Definition of `scan`, `open`, `check`, and `frisk` in the PTC workflow | The reference overlay appears to use `Not Scanned`, while the BOQ requires opening/frisking | Week 1 |
| CI-35 | Confirmation whether Bangladesh media is reference-only or approved for model training | Required for data rights, lineage, and privacy | Week 1 |
| CI-36 | Confirmation that named-worker tracking, dwell analytics, item counting, mobile app, and scanner integration are excluded unless separately approved | Prevents generic demo features from entering fixed scope | Week 1 |
| CI-37 | PTC decision on which reference dashboard/status elements are required | Avoids copying an unknown UI or workflow | Week 1–2 |

## Process and acceptance

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-01 | Final bale inspection SOP in ordered steps | Defines AI state transitions and violation logic | Week 1 |
| CI-02 | Definition of missed versus incomplete inspection | Prevents ambiguous classification | Week 1 |
| CI-03 | Valid operational exceptions | Avoids false violations | Week 1 |
| CI-04 | Approved PTC-specific UAT scenarios and acceptance dataset rules | Defines measurable completion | Week 1–2 |
| CI-05 | Accuracy and false-alert acceptance thresholds | Required for final AI acceptance | Before UAT |
| CI-06 | Confirmation of basic report scope | Proposal references exports and also lists scheduled reports as future scope | Week 1 |
| CI-07 | Review-status values and operator-remarks workflow | Finalizes dashboard and audit behavior | Week 1 |
| CI-38 | Number and location of required opening/frisking points per bale | Required for observable action definitions and camera placement | Week 1 |
| CI-39 | Rule for simultaneous bales, multiple workers, rework, and insufficient visibility | Prevents false session association and unsupported violations | Week 1–2 |

## Site and hardware

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-08 | Site access dates, safety induction, and working-hour restrictions | Required for survey and installation | Week 1 |
| CI-09 | Approval of four camera locations, heights, fields of view, and stream orientation | Required before installation and data collection | Week 1–2 |
| CI-10 | Approved power, network, switch, workstation, and UPS locations | Required for installation | Week 1–2 |
| CI-11 | Network/IP allocation and time source | Required for stable streams and timestamps | Week 2 |
| CI-12 | Confirmation of camera and edge workstation procurement | Hardware availability affects timeline | Week 1 |
| CI-13 | Permission to stage missed/incomplete scenarios safely | Required for representative data and UAT | Week 1–2 |
| CI-40 | Approval to test overhead, oblique, and side camera views rather than copying the Bangladesh placement | Required to validate PTC-specific visibility | Week 1 |

## Data and privacy

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-14 | Written approval for PTC footage collection and annotation | Required before AI dataset creation | Week 1 |
| CI-15 | Raw footage retention period | Controls storage and deletion | Week 1–2 |
| CI-16 | Event snapshot and clip retention period | Controls local and approved Azure storage | Week 1–2 |
| CI-17 | Approved evidence clip duration | Controls system behavior and capacity | Week 2 |
| CI-18 | Approved users who may view footage/evidence | Required for local and Entra access design | Week 2 |
| CI-19 | Approved storage location for datasets and model artifacts | Sensitive data cannot be stored in GitHub | Week 1 |
| CI-41 | Separate manifests and access rules for Bangladesh reference, PTC training, PTC calibration, and locked PTC UAT data | Prevents data mixing and invalid acceptance claims | Week 1–2 |

## Local deployment, Azure, and Microsoft environment

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-42 | Confirmation that local AI, local event storage, and local intranet dashboard must remain functional without internet | Required by BOQ/proposal and architecture acceptance | Week 1 |
| CI-43 | Final local-versus-Azure responsibility matrix | Prevents unnecessary duplicate infrastructure and scope conflict | Week 1–2 |
| CI-20 | Azure tenant, subscription, region, resource group, and approval to host any Node.js/React services | Required only for approved Azure components | Week 1–2 |
| CI-21 | Azure naming, tagging, cost-governance standards, and approved MongoDB service/capacity | Required for approved Cosmos DB for MongoDB or alternative MongoDB deployment | Week 1–2 |
| CI-22 | Entra ID application-registration and group process | Required for approved cloud/remote authentication | Week 2 |
| CI-23 | Site-to-Azure network and firewall requirements | Required for secure optional synchronization | Week 2 |
| CI-24 | Private endpoint, proxy, DNS, and certificate requirements | Affects approved Azure architecture and deployment effort | Week 2 |
| CI-25 | GitHub Actions deployment identity or approved alternative | Required for approved Azure CI/CD | Week 2–3 |
| CI-26 | Log and monitoring retention | Required for Application Insights configuration | Week 3 |
| CI-27 | Production deployment approval process | Required before go-live | Week 6 |
| CI-44 | Approved local authentication method during internet/Entra outage | Required to secure offline dashboard use | Week 2 |

## Users and operations

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-28 | Named product owner, process owner, and UAT owner | Required for decisions and acceptance | Week 1 |
| CI-29 | Local dashboard user list and/or Entra groups | Required for access | Week 6 |
| CI-30 | Client support and escalation contacts | Required for go-live and hypercare | Week 7 |
| CI-31 | Training attendees and schedule | Required for handover | Week 7 |
| CI-32 | Planned maintenance windows | Required for production deployments | Week 6–7 |

## Decisions not to assume

The project team must not assume:

- every feature visible in the Bangladesh or generic CV media is part of the PTC PoC;
- `Not Scanned` is equivalent to missed opening/frisking;
- Bangladesh footage may be used for training or PTC acceptance;
- overhead camera placement is automatically valid for PTC;
- permanent bale identity;
- worker identity, named tracking, dwell-time analytics, or performance scoring;
- barcode, RFID, scanner, PLC, or custom IoT integration;
- mobile application;
- continuous cloud video recording;
- a specific accuracy percentage before representative PTC testing;
- public Azure endpoints;
- that Azure is required for core local PoC operation;
- a specific MongoDB hosting tier or capacity before client approval;
- scheduled email reports;
- additional cameras or external integrations;
- unlimited retention;
- client administrator access for Codistan.

## Escalation rule

Any client dependency that blocks a critical-path issue for more than two working days must be marked blocked, raised to the project owner, and reflected in the delivery-risk log.
