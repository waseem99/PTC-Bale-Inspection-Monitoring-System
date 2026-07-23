# Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner / dependency |
|---|---|---:|---:|---|---|
| R-01 | Final SOP and violation rules are delayed or ambiguous | High | High | Confirm ordered steps, exceptions, reason codes, and approval in Week 1; block AI rule development until approved | Joint / client |
| R-02 | Camera positions do not provide sufficient view of required actions | Medium | High | Site survey, sample captures, field-of-view approval, and camera calibration before final installation | Site and hardware |
| R-03 | Lighting, glare, dust, or occlusion reduces detection quality | High | High | WDR/lighting configuration, representative data collection, insufficient-visibility handling, and live calibration | AI and site |
| R-04 | Hardware procurement delays the critical path | Medium | High | Confirm vendors, stock, alternates, warranty, and lead time early; prepare recorded-stream development environment | Procurement |
| R-05 | Representative missed/incomplete inspection footage is unavailable | High | High | Obtain permission to stage safe scenarios and reserve a locked acceptance set | Client dependency |
| R-06 | Client expects permanent bale identity without identifier integration | Medium | High | Document camera-local temporary tracks and treat barcode/RFID as change request | Scope |
| R-07 | Proposal wording creates conflicting expectations for local versus Azure deployment | Medium | High | Obtain written topology approval; preserve edge processing and offline queue; define which dashboard components are local/cloud | Architecture / client IT |
| R-08 | Scheduled reports are assumed although listed as future enhancement | Medium | Medium | Confirm MVP includes on-demand CSV/PDF export only unless written clarification says otherwise | Scope / client |
| R-09 | Azure tenant, identity, or networking access arrives late | High | High | Track CI-20 through CI-27; use local/integration environment while waiting; raise blockage after two working days | Client IT |
| R-10 | Repository exposes client project details | Medium | High | Keep repository private; prohibit footage, credentials, production IPs, evidence, and raw client documents in Git | Repository owner |
| R-11 | AI workstation cannot sustain four configured streams | Medium | High | Benchmark decoding and inference early; tune sampling/resolution; validate hardware before procurement acceptance | Edge/AI |
| R-12 | False positives undermine supervisor trust | High | High | Reason codes, evidence, review workflow, conservative thresholds, client-approved test set, hypercare feedback cycles | AI/product |
| R-13 | False negatives leave missed checks undetected | Medium | High | Scenario-level recall review, edge-case data, calibration, and documented limitations | AI/product |
| R-14 | Camera or network outage is incorrectly classified as process violation | Medium | High | Separate operational health events from inspection outcomes; use insufficient-visibility/unresolved states | Edge/compliance |
| R-15 | Internet/Azure outage loses events | Medium | High | Durable local spool, idempotent sync, retry/backoff, disk monitoring, and outage tests | Edge/backend |
| R-16 | Evidence storage exceeds capacity | Medium | Medium | Event-based clips only, approved clip duration, retention policy, storage monitoring, and lifecycle deletion | Client/data |
| R-17 | Production secrets appear in source or logs | Low | High | Key Vault/approved secret store, secret scanning, logging rules, service identities, and code review | Security |
| R-18 | Uncontrolled model or threshold changes create regressions | Medium | High | Version model/rules/configuration together; locked regression set; release manifest and rollback | AI/operations |
| R-19 | UAT participation or acceptance decisions are delayed | Medium | High | Named UAT owner, schedule in advance, approve scenarios early, and track open client decisions | Client |
| R-20 | New analytics/integration requests enter MVP informally | High | Medium | Use change-request label, impact assessment, and written approval before scheduling | Project owner |
| R-21 | Bangladesh reference features are assumed to be included in the PTC fixed scope | High | High | Maintain the reference-to-PTC mapping; use BOQ/proposal as authority; require written confirmation before adding scanner, mobile, identity, or analytics features | Project Manager / scope |
| R-22 | The reference overlay term `Not Scanned` is incorrectly treated as equivalent to PTC opening/frisking | High | High | Resolve terminology and physical action definitions with the PTC process owner before annotation, rules, and UAT are finalized | Project Manager / client process owner |
| R-23 | Bangladesh footage is used as a substitute for PTC training or acceptance data | Medium | High | Treat it as visual reference unless rights are approved; collect PTC-specific training, calibration, and locked UAT data | AI Lead / client data approval |
| R-24 | Overhead camera geometry is copied without validating the PTC site | Medium | High | Use reference placement only as a survey hypothesis; approve sample captures showing every mandatory action at PTC | Site / AI / client |
| R-25 | Generic people-tracking demo creates expectations for worker identity, dwell time, or productivity scoring | Medium | Medium | Document the generic demo as non-bale evidence and keep identity/scoring outside scope | Project Manager / scope |

## Risk review cadence

- review weekly during MVP;
- review P0/P1 risks during stand-up when active;
- update after reference mapping, site survey, baseline AI evaluation, Azure design approval, and UAT;
- convert a realized risk into a tracked issue with owner and due date.
