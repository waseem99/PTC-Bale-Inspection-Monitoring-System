# Finalized PTC AI Model Delivery Plan

**Controlling issue:** #86  
**Implementation issues:** #27–#34 and #114–#116  
**Actual camera/site gate:** #84  
**Actual model and PM/client acceptance:** #85

## Finalized process

```text
Bale enters inspection area
→ bale is cut/opened
→ proper hand inspection is completed
→ grading is completed
→ bale is routed to accepted or rejected lane
→ left-side movement means rejection
→ weighing-machine display is read through AI/camera OCR
→ inspection completes only when every required validation passes
```

The approved anomaly scope is limited to missing, incomplete, inconsistent or technically unresolved versions of these validations. Direct RS-232, Modbus or PLC scale integration is outside the current scope.

## AI-first architecture

```text
Recorded video / actual camera stream
→ frame sampling and rolling evidence buffer
→ custom YOLOv11 object/state detector
→ ByteTrack camera-local bale tracking
→ inspector-to-bale association
→ pose/hand and temporal interaction analysis
→ grading verification
→ accepted/rejected lane ROI verification
→ scale-display OCR with temporal stabilization
→ deterministic SOP and anomaly rule engine
→ existing AI adapter and durable edge delivery
→ Node.js API
→ PostgreSQL, dashboard, evidence, review and reporting
```

## Technical decisions

- YOLOv11 is the initial detector baseline; exact size/runtime is selected after PTC evaluation and licensing review.
- ByteTrack is the primary tracker. BoT-SORT is considered only if actual occlusion testing justifies it.
- No face recognition, biometrics, employee identity or cross-camera person re-identification.
- Proper hand inspection is evaluated using pose/hand, duration, movement, proximity and temporal evidence. A temporal action model may supplement the baseline only when labeled evaluation proves it necessary.
- Grading is detected only through visible and consistently labelable signals.
- Accepted/rejected routing uses versioned camera ROIs; the left-side lane is rejected.
- Weight is accepted only after OCR readings stabilize across consecutive frames.
- Ambiguous, occluded or low-confidence cases are `UNRESOLVED`, not fabricated violations.
- Camera/model/service failures remain operational outcomes, never process violations.

## Ordered delivery

1. #27 — video, process-view, permission and data-readiness audit;
2. #28 — detection/action/grading/routing/OCR annotation specification and pilot QA;
3. #29 — leakage-safe dataset v1 and locked-test manifests;
4. #30 — reproducible YOLO detector training and selection;
5. #31 — ByteTrack and inspector-to-bale association;
6. #32 — opening and genuine hand-inspection recognition;
7. #114 — grading verification;
8. #115 — accepted/rejected routing and grade-route consistency;
9. #116 — weighing-display OCR and Bale ID association;
10. #33 — complete deterministic SOP and anomaly engine;
11. #34 — locked component/event evaluation, packaging and multi-stream benchmark;
12. #84 — actual cameras and finalized inspection/lane/scale-display ROIs;
13. #85 — complete actual-stream integration and PM/client acceptance.

## Implemented repository baseline

`services/ai-inference` provides:

- versioned configuration and normalized camera ROIs;
- YOLO/ByteTrack, MediaPipe hands and OCR runtime adapters;
- frame-by-frame recorded-video/live-camera pipeline;
- explainable hand-inspection classifier;
- route and grading contracts;
- OCR parsing and temporal stabilization;
- deterministic SOP engine and anomaly reason codes;
- platform-compatible event payload mapping;
- evaluation helpers;
- detector training/export and recorded-video runner scripts;
- Docker packaging, CI and automated tests.

See `docs/39-ai-implementation-and-testing.md` and `services/ai-inference/README.md`.

## Restricted release inputs

The following remain outside GitHub and are required before accuracy testing can be completed:

- approved factory recordings and permitted-use records;
- annotations and dataset files;
- trained model weights;
- production camera credentials and exact ROIs;
- OCR crops and locked ground truth;
- final acceptance thresholds and client evidence.

## Required anomaly reason codes

- `BALE_NOT_OPENED`
- `HAND_INSPECTION_MISSING`
- `HAND_INSPECTION_INCOMPLETE`
- `GRADING_MISSING`
- `ROUTING_MISSING`
- `ROUTING_MISMATCH`
- `WEIGHT_MISSING`
- `WEIGHT_UNREADABLE`
- `WEIGHT_UNSTABLE`
- `SEQUENCE_INCOMPLETE`
- `TRACK_OR_ASSOCIATION_AMBIGUOUS`
- `INSUFFICIENT_VISIBILITY`

Operational outcomes: `CAMERA_FAILURE`, `MODEL_FAILURE`, `SERVICE_FAILURE`, `ABORTED`.

## Evaluation gates

Evaluation must report:

- detection precision, recall and mAP by class/camera/scenario;
- tracking continuity, fragmentation, ID switches and association accuracy;
- proper/incomplete/no-inspection precision and recall;
- grading and routing accuracy;
- OCR exact-match, numeric error, unreadable rate and correct Bale ID association;
- completed/anomaly/unresolved event-level metrics;
- false anomaly alerts per operating hour and missed anomalies;
- event latency and evidence availability;
- four-stream CPU/GPU/RAM, queue, dropped-frame and stability results.

One aggregate score must not hide weak minority scenarios.

## Definition of done

The AI work is complete only when the code baseline, controlled data, trained artifacts, locked evaluation, actual camera/ROI integration, platform delivery and PM/client acceptance are all recorded under #86/#85.
