# Client Inputs and Decisions Required

This register contains the decisions and access required to deliver the MVP without relying on assumptions.

## Process and acceptance

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-01 | Final bale inspection SOP in ordered steps | Defines AI state transitions and violation logic | Week 1 |
| CI-02 | Definition of missed versus incomplete inspection | Prevents ambiguous classification | Week 1 |
| CI-03 | Valid operational exceptions | Avoids false violations | Week 1 |
| CI-04 | Approved UAT scenarios and acceptance dataset rules | Defines measurable completion | Week 1–2 |
| CI-05 | Accuracy and false-alert acceptance thresholds | Required for final AI acceptance | Before UAT |
| CI-06 | Confirmation of basic report scope | Proposal references exports and also lists scheduled reports as future scope | Week 1 |
| CI-07 | Review-status values and operator-remarks workflow | Finalizes dashboard and audit behavior | Week 1 |

## Site and hardware

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-08 | Site access dates, safety induction, and working-hour restrictions | Required for survey and installation | Week 1 |
| CI-09 | Approval of four camera locations, heights, and fields of view | Required before installation and data collection | Week 1–2 |
| CI-10 | Approved power, network, switch, workstation, and UPS locations | Required for installation | Week 1–2 |
| CI-11 | Network/IP allocation and time source | Required for stable streams and timestamps | Week 2 |
| CI-12 | Confirmation of camera and edge workstation procurement | Hardware availability affects timeline | Week 1 |
| CI-13 | Permission to stage missed/incomplete scenarios safely | Required for representative data and UAT | Week 1–2 |

## Data and privacy

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-14 | Written approval for footage collection and annotation | Required before AI dataset creation | Week 1 |
| CI-15 | Raw footage retention period | Controls storage and deletion | Week 1–2 |
| CI-16 | Event snapshot and clip retention period | Controls edge and Azure storage | Week 1–2 |
| CI-17 | Approved evidence clip duration | Controls system behavior and capacity | Week 2 |
| CI-18 | Approved users who may view footage/evidence | Required for access design | Week 2 |
| CI-19 | Approved storage location for datasets and model artifacts | Sensitive data cannot be stored in GitHub | Week 1 |

## Azure and Microsoft environment

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-20 | Azure tenant, subscription, region, and resource group | Required for infrastructure deployment | Week 1–2 |
| CI-21 | Azure naming, tagging, and cost-governance standards | Required for compliant resource creation | Week 1–2 |
| CI-22 | Entra ID application-registration and group process | Required for authentication | Week 2 |
| CI-23 | Site-to-Azure network and firewall requirements | Required for secure edge synchronization | Week 2 |
| CI-24 | Private endpoint, proxy, DNS, and certificate requirements | Affects architecture and deployment effort | Week 2 |
| CI-25 | GitHub Actions deployment identity or approved alternative | Required for CI/CD | Week 2–3 |
| CI-26 | Log and monitoring retention | Required for Application Insights configuration | Week 3 |
| CI-27 | Production deployment approval process | Required before go-live | Week 6 |

## Users and operations

| ID | Required input or decision | Why it is required | Target |
|---|---|---|---|
| CI-28 | Named product owner and UAT owner | Required for decisions and acceptance | Week 1 |
| CI-29 | Dashboard user list or Entra groups | Required for access | Week 6 |
| CI-30 | Client support and escalation contacts | Required for go-live and hypercare | Week 7 |
| CI-31 | Training attendees and schedule | Required for handover | Week 7 |
| CI-32 | Planned maintenance windows | Required for production deployments | Week 6–7 |

## Decisions not to assume

The project team must not assume:

- permanent bale identity;
- worker identity or face recognition;
- continuous cloud video recording;
- a specific accuracy percentage before representative testing;
- public Azure endpoints;
- scheduled email reports;
- additional cameras or external integrations;
- unlimited retention;
- client administrator access for Codistan.

## Escalation rule

Any client dependency that blocks a critical-path issue for more than two working days must be marked blocked, raised to the project owner, and reflected in the delivery-risk log.
