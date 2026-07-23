# Requirements Traceability Matrix

This matrix links the awarded proposal scope to implementation workstreams and acceptance evidence.

| Requirement | Source scope | Implementation area | Acceptance evidence |
|---|---|---|---|
| Four-camera monitoring | Hardware/BOQ and proposed solution | Site, hardware, edge ingest | Approved layout, camera inventory, stream stability test |
| Bale detection | AI Vision Module | AI inference | Locked test-set detection results and live scenario evidence |
| Worker detection | AI Vision Module | AI inference | Detection evaluation and live scenario evidence |
| Bale opening/checking activity detection | AI Vision Module | AI interaction logic and SOP engine | Approved completed/incomplete scenario results |
| Missed inspection detection | AI Vision Module | Compliance engine | UAT missed-inspection scenario and event reason code |
| Incomplete inspection detection | AI Vision Module | Compliance engine | UAT incomplete-inspection scenario and event reason code |
| Camera-wise event tagging | AI Vision Module / event recording | Edge contracts and backend | Event detail contains approved camera ID |
| Timestamp-based evidence | Event Recording | Edge evidence and data model | Timestamped snapshot/clip available for UAT event |
| Live camera view | Dashboard Module | Edge/live gateway and dashboard | All approved live feeds visible to authorized user |
| Event/violation list | Dashboard Module | API and dashboard | Paginated event list matches stored records |
| Violation detail view | Dashboard Module | API and dashboard | Reason, timestamp, camera, evidence, status displayed |
| Image/video evidence | Dashboard Module | Edge evidence, Blob/local storage, dashboard | Authorized evidence playback/preview |
| Camera-wise logs | Dashboard Module | Event filters | Filter returns only selected camera records |
| Date/time filters | Dashboard Module | API and dashboard | Filtered result matches test records |
| Basic reports/export | Functional requirements | API and dashboard | CSV/PDF export generated from active filters |
| Review status | Event Recording | Data model and dashboard | Status change persists and audit record is created |
| Operator remarks | Event Recording | Data model and dashboard | Remark persists with user and timestamp |
| On-premise processing | Deployment Environment | Edge runtime | Inference works on site workstation |
| Core operation without internet | Deployment Environment | Local spool and edge services | Outage test shows processing/queue and later sync |
| Local storage | Deployment Environment | Edge evidence and spool | Events retained locally according to approved policy |
| Site-specific model training | AI Model Training | Dataset, annotation, training, evaluation | Dataset manifest, model version, evaluation report |
| Live testing and calibration | Implementation Plan | AI, edge, QA | Calibration report and approved configuration version |
| User training | Deliverables | Documentation and handover | Attendance/training record and user guide |
| Technical documentation | Deliverables | Repository docs and handover | Approved documentation package |
| One-year support/warranty | Deliverables | Commercial/support process | Separate support and warranty records; not a development feature |

## Traceability rule

Every MVP issue must reference at least one requirement or supporting operational need. Issues that do not trace to the awarded scope, an acceptance dependency, security requirement, or necessary engineering support must not enter the MVP.
