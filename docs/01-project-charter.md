# Project Charter

## Project

PTC Bale Inspection & Monitoring System

## Objective

Deliver an AI-assisted monitoring system that observes the bale inspection area through four fixed IP cameras, detects bale and worker activity, evaluates the client-approved inspection sequence, identifies missed or incomplete checks, and provides timestamped visual evidence through a dashboard.

## Delivery model

- **MVP:** 8 weeks
- **Hypercare and improvements:** 5 weeks following MVP acceptance
- **Runtime:** hybrid edge and Azure
- **Source control and delivery management:** GitHub
- **Primary client technology alignment:** Microsoft, Windows, Azure, and Microsoft Entra ID

## MVP outcomes

1. Four approved camera feeds are connected and stable.
2. The edge system detects bales and workers in the inspection area.
3. The agreed inspection steps are represented in a deterministic SOP state machine.
4. Missed and incomplete inspections generate events.
5. Events include camera ID, timestamp, reason, snapshot, and short evidence clip.
6. Supervisors can view live feeds, review events, filter records, mark review status, add remarks, and export basic reports.
7. Core camera processing continues during temporary internet outages.
8. Approved event data is synchronized to Azure where the deployment topology permits.
9. The solution is tested against agreed scenarios and handed over with documentation and training.

## Success authority

Success is measured against the client-approved acceptance scenarios and the awarded scope, not against unapproved assumptions or future enhancements.

## Stakeholder responsibilities

### Codistan

- solution architecture and implementation;
- camera and edge software integration;
- AI data preparation, model training, and evaluation;
- dashboard and API development;
- Azure deployment automation;
- testing, calibration, documentation, and training;
- hypercare and agreed improvement cycles.

### Client

- site access and safety induction;
- confirmed SOP and violation definitions;
- approval of camera locations and coverage;
- access to representative operational footage;
- network, Azure tenant, identity, and security approvals;
- timely UAT participation and acceptance decisions.

## Delivery principles

- No permanent bale identity is claimed without barcode, RFID, or another external identifier.
- No face recognition or worker identification is included.
- AI outcomes are evidence-assisted compliance signals and require agreed confidence thresholds and client validation.
- Site footage and evidence are handled as restricted client data.
- Any requirement outside the approved scope enters a documented change-control process.
