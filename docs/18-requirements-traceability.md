# Requirements Traceability Matrix

This matrix links the awarded proposal scope and the controlled Bangladesh-reference analysis to implementation workstreams and acceptance evidence.

| Requirement | Source scope | Implementation area | Acceptance evidence |
|---|---|---|---|
| Bangladesh reference used as benchmark without adding scope | Project-owner clarification / reference media | Scope, reference mapping, PM governance | Approved #59 mapping and `docs/20-bangladesh-reference-poc-analysis.md` |
| Four-camera monitoring | Hardware/BOQ and proposed solution | Site, hardware, edge ingest | Approved PTC layout, camera inventory, orientation, stream stability test |
| Bale detection | AI Vision Module | AI inference | Locked PTC test-set detection results and live scenario evidence |
| Anonymous worker detection | AI Vision Module | AI inference | PTC detection evaluation; no identity/biometric output |
| Temporary bale/session tracking | Client need to identify which visible bale was not opened | Tracking and compliance | Camera/zone session IDs and approved multi-bale scenario results |
| Bale opening/frisking activity detection | AI Vision Module / BOQ | AI interaction logic and SOP engine | Approved PTC completed/incomplete scenario results |
| Missed inspection detection | AI Vision Module | Compliance engine | UAT missed-inspection scenario and event reason code |
| Incomplete inspection detection | AI Vision Module | Compliance engine | UAT incomplete-inspection scenario and event reason code |
| Insufficient visibility handling | Necessary safe classification boundary | AI/edge/compliance | Occlusion scenario produces unresolved status rather than definite violation |
| Camera-wise event tagging | AI Vision Module / event recording | Edge contracts and local application | Event detail contains approved camera/zone ID |
| Timestamp-based evidence | Event Recording | Local evidence and data model | Timestamped snapshot/clip available for UAT event |
| Local live camera view | Dashboard Module / BOQ local intranet | Local live gateway and React dashboard | All approved live feeds visible to authorized local user |
| Event/violation list | Dashboard Module | Local Node API, MongoDB, and dashboard | Paginated local event list matches stored records |
| Violation detail view | Dashboard Module | Local API and dashboard | Outcome, reason, timestamp, camera, evidence, status displayed |
| Image/video evidence | Dashboard Module | Edge evidence, local storage, optional Blob, dashboard | Authorized local evidence playback/preview; cloud copy only where approved |
| Camera-wise logs | Dashboard Module | Event filters | Filter returns only selected camera records |
| Date/time filters | Dashboard Module | API and dashboard | Filtered result matches test records |
| Basic reports/export | Functional requirements | API and dashboard | On-demand CSV/PDF export generated from active filters |
| Review status | Event Recording | Data model and dashboard | Status change persists and audit record is created |
| Operator remarks | Event Recording | Data model and dashboard | Remark persists with user and timestamp |
| On-premise/local processing | Deployment Environment | Python edge runtime | Inference works on site workstation without internet |
| Local database and intranet dashboard | BOQ | Local Node/Mongo/React application | Events, evidence, review, and reports work on the local network |
| Core operation without internet/Azure | Deployment Environment | Local spool, database, evidence, and dashboard | Outage test shows continued local operation and optional later sync |
| Local storage | Deployment Environment | Local evidence, database, and spool | Events retained locally according to approved policy |
| Optional Azure alignment | Client Microsoft/Azure environment | Approved management plane only | #11 decision and tests for approved synchronization/identity/monitoring components |
| Site-specific model training | AI Model Training | PTC dataset, annotation, training, evaluation | PTC dataset manifest, model version, evaluation report |
| Bangladesh data kept separate from PTC acceptance | Data governance / reference analysis | Dataset lineage and UAT | Separate manifests; UAT report cites PTC data only |
| Live testing and calibration | Implementation Plan | AI, edge, QA | PTC calibration report and approved configuration version |
| User training | Deliverables | Documentation and handover | Attendance/training record and user guide |
| Technical documentation | Deliverables | Repository docs and handover | Approved documentation package and release manifest |
| One-year support/warranty | Deliverables | Commercial/support process | Separate support and warranty records; not a development feature |

## Traceability rule

Every PoC/MVP issue must reference at least one awarded requirement, controlled reference-mapping decision, acceptance dependency, security requirement, or necessary engineering support need. Issues that do not trace to one of these must not enter the PoC backlog.
