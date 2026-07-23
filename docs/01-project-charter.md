# Project Charter

## Project

PTC Bale Inspection & Monitoring System

## Objective

Deliver a fixed-scope AI-assisted Proof of Concept that observes the approved PTC bale inspection area through four fixed IP cameras, detects bale and anonymous worker activity, evaluates the client-approved opening and frisking sequence, identifies missed or incomplete checks, and provides timestamped evidence through a locally functional browser dashboard.

## Delivery model

- **PoC/MVP:** 8 weeks
- **Hypercare and improvements:** 5 weeks following PoC acceptance
- **Core runtime:** local/offline at the PTC site
- **Optional management plane:** client-approved Microsoft Azure components
- **Application stack:** MERN for the local/approved cloud application and Python for edge/AI
- **Source control and delivery management:** private GitHub repository
- **Primary client technology alignment:** Windows, Microsoft Azure, and Microsoft Entra ID where approved

## Reference implementation context

The client/project owner shared media from a similar Bangladesh PoC. That material is used to understand physical workflow, overhead camera geometry, bale detection, process-state overlays, and the staged PoC journey. It is not the authoritative PTC specification and does not add worker identification, dwell analytics, scanner integration, mobile applications, item counts, or other visible generic-demo features to the fixed scope.

The reference analysis and PTC mapping are maintained in `docs/20-bangladesh-reference-poc-analysis.md` and issue #59.

## PoC outcomes

1. Four PTC-approved camera feeds are connected, oriented, synchronized, and stable.
2. The local edge system detects bales and anonymous workers in the approved inspection area.
3. Each visible bale inspection is represented by a temporary camera/zone session rather than a permanent business identity.
4. The agreed PTC opening and frisking steps are represented in a deterministic, versioned SOP state machine.
5. Completed, missed, incomplete, unresolved, and operational-health outcomes are separated correctly.
6. Events include camera/zone, timestamp, reason, configuration versions, snapshot, and short evidence clip.
7. Supervisors can use the local intranet dashboard to view live feeds, review events, filter records, mark review status, add remarks, and export basic reports.
8. Core AI, local event storage, local evidence, and local dashboard operation continue during internet or Azure outages.
9. Approved event data synchronizes to Azure only where the client-approved topology requires it.
10. The PoC is tested against a locked PTC-specific scenario set and handed over with documentation and training.

## Success authority

Success is measured against the awarded BOQ, the approved technical proposal, the final PTC SOP, and the client-approved PTC acceptance scenarios. Bangladesh reference footage demonstrates concept feasibility but is not PTC acceptance evidence.

## Stakeholder responsibilities

### Codistan

- reference-to-PTC gap analysis;
- solution architecture and implementation;
- camera and edge software integration;
- PTC data preparation, model training, and evaluation;
- local dashboard and API development;
- approved Azure deployment/synchronization automation;
- testing, calibration, documentation, and training;
- hypercare and agreed improvement cycles.

### Client / PTC

- named process owner, project owner, and UAT owner;
- site access and safety induction;
- confirmed opening/frisking SOP and violation definitions;
- clarification of `scan`, `open`, `check`, and `frisk` terminology;
- approval of camera locations and coverage;
- permission and access to representative PTC operational footage;
- confirmation of Bangladesh-media data-use rights;
- local network, access, and optional Azure/identity/security approvals;
- timely UAT participation and acceptance decisions.

## Delivery principles

- The Bangladesh reference is a benchmark, not a feature list.
- No permanent bale identity is claimed without barcode, RFID, scanner, or another approved external identifier.
- No face recognition, named worker tracking, or worker-performance scoring is included.
- AI outcomes are evidence-assisted compliance signals and require agreed PTC confidence thresholds and client validation.
- PTC site footage is required for final training, calibration, and acceptance.
- Site footage, evidence, reference media, and model artifacts are handled as restricted data outside GitHub.
- The local PoC must remain functional without internet access.
- Any requirement outside the approved scope enters documented change control.
