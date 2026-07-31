# PTC AI Model Delivery Plan

**Controlling issue:** #86  
**Repository:** `waseem99/PTC-Bale-Inspection-Monitoring-System`  
**Authoritative development path at creation:** `feature/68-platform-api` (PR #69 is open against `main`)  
**Approved frontend control:** #60  
**Software-completion control:** #77  
**Factory-material baseline:** #74  
**Actual hardware integration:** #84  
**Actual model/site acceptance:** #85

## 1. Purpose

This document is the durable implementation and handover plan for delivering the actual PTC-specific bale-inspection AI system. It controls the path from restricted factory media and process observations through annotation, dataset preparation, detector experiments, tracking, worker-to-bale association, interaction detection, deterministic SOP reasoning, locked evaluation, model packaging, four-camera runtime benchmarking and final integration.

It does not redesign the approved frontend, replace the Node.js/PostgreSQL platform or duplicate the software-completion work in #77–#83.

## 2. Ownership

| Responsibility | Owner |
|---|---|
| AI, backend and technical implementation | `zubairahmed02` |
| Project management, data coordination and acceptance | `arifkhannamal9288` |
| Runtime, GPU, deployment and recovery support | `qamarmujtaba` |
| Repository/project ownership | `waseem99` |

Arif coordinates restricted-data access, annotation approvals, review cadence, locked-set freezing and PM/client decisions. Zubair owns technical execution and issue-linked PR delivery. Qamar supports target runtime, deployment, health, spool/retry/recovery and four-camera performance validation.

## 3. Locked delivery boundaries

- The approved frontend and user flow are controlled by #60 and must not be redesigned without PM approval of a specific defect or contract change.
- PR #69 is the authoritative application/backend/frontend/PostgreSQL baseline until it reaches `main`.
- PR #70 is the AWS/Vercel deployment extension and must be consolidated into the PR #69 branch before PR #69 reaches `main`.
- #77–#83 must deliver stable software contracts, simulators, evidence, API, PostgreSQL, frontend integration, security, deployment and UAT.
- #84 controls actual factory camera/hardware integration.
- #85 consumes the release delivered under #86 and records actual model/site acceptance.
- Simulator data may validate software contracts but must never be represented as actual AI performance.

## 4. Data governance and factory-material control

All factory videos, samples, process notes, camera-position observations, workflow observations and bale-inspection examples remain controlled under #74.

### Never commit to GitHub

- raw factory videos or identifiable extracted frames;
- restricted annotations or datasets;
- camera credentials, URLs, IP details or client-sensitive notes;
- database dumps or actual evidence files;
- training checkpoints or model binaries.

### Allowed in GitHub

- source code and safe schemas;
- sanitized manifests and storage reference IDs;
- checksums and version identifiers;
- experiment configurations and commands;
- sanitized metrics and evaluation summaries;
- architecture decisions, limitations and runbooks.

No material may enter training or acceptance until permitted use, lineage, access boundary and retention are recorded. Train/validation/test splits must be made by complete source video, camera session or collection block. Neighbouring frames must not be randomly divided across splits.

## 5. Recommended technical architecture

```text
PTC camera stream
    → frame sampling and rolling evidence buffer
    → custom object detector
    → per-camera multi-object tracking
    → worker-to-bale association
    → temporal interaction features
    → deterministic SOP state machine
    → event outcome, reason code, confidence and evidence
    → existing AI adapter
    → idempotent Node.js API ingestion
    → PostgreSQL, dashboard, review and reporting
```

Zubair may adjust this architecture only through an evidence-backed architecture decision that identifies dataset, API, runtime, performance, security and deployment impact.

## 6. Detector strategy

Benchmark suitable custom-trained YOLO variants rather than selecting one without evidence. Candidate selection must consider:

- PTC validation performance;
- event-level SOP accuracy;
- false violation alerts and missed violations;
- difficult-scene performance;
- inference latency and GPU memory;
- four-camera throughput;
- export/runtime stability;
- licensing suitability for proprietary client deployment.

A detector is not proof that the complete inspection SOP occurred.

## 7. Tracking and worker-to-bale association

- Use independent per-camera tracking.
- Benchmark ByteTrack as the practical baseline and BoT-SORT where occlusion and reattachment require it.
- Do not introduce facial recognition, biometrics or cross-camera personal identification.
- Associate workers to bales using explainable zones, distance, overlap/proximity, temporal consistency, inspection-region presence, duration and track continuity.
- Support multiple workers, multiple bales, occlusion, interruption, rework and repeated inspection.
- Invalid or ambiguous associations must produce an unresolved state rather than a fabricated confident result.

## 8. Interaction engine

Start with explainable temporal and geometric observations for opening, checking and frisking/required examination. Consider pose, action recognition or temporal video classification only when controlled evaluation proves that the detector/tracker/rule baseline is insufficient.

Every observation should include type/state, timestamps, duration, confidence, visibility and source camera/track/association references.

## 9. Versioned deterministic SOP engine

Required baseline sequence:

```text
WAITING_FOR_BALE
→ BALE_IN_ZONE
→ INSPECTION_STARTED
→ OPENING_OBSERVED
→ CHECKING_OBSERVED
→ FRISKING_OBSERVED
→ COMPLETED
```

Alternative terminal outcomes:

- `MISSED`
- `INCOMPLETE`
- `UNRESOLVED`
- `ABORTED`
- `CAMERA_FAILURE`
- `MODEL_FAILURE`
- `INSUFFICIENT_VISIBILITY`

Operational failures must never be recorded as process violations. Each final outcome must contain:

- stable event ID;
- reason code and confidence;
- camera ID and timestamps;
- model, rules and configuration versions;
- evidence references;
- temporary track/association references where relevant.

## 10. Controlled workstreams

### #27 — Factory-video/data audit and permissions

First deliverable from Zubair:

- inventory of every collected video/material reference;
- source date/session, camera/view, duration, resolution/FPS and scenario;
- intended training/calibration/validation/locked-test/reference use;
- duplicates/corruption, permissions and storage references;
- missing scenarios, privacy risks and annotation-effort estimate;
- recommended additional capture;
- architecture decision, experiment plan and realistic schedule.

### #28 — Annotation specification and QA

Define detector classes, temporal/action labels, positive/negative/ambiguous examples, occlusion and partial-object rules, multiple-worker/multiple-bale rules, difficult-scene handling, ignore regions, quality control, inter-annotator review and annotation versioning. Avoid speculative labels humans cannot apply consistently.

### #29 — Dataset v1

Produce controlled train, validation and frozen test/acceptance manifests. Include hard negatives; normal, missed, incomplete and unresolved scenarios; lighting/glare/dust/occlusion; repeated/interrupted workflows; and multiple-worker/multiple-bale cases. Preserve lineage, permissions and hashes outside GitHub with sanitized manifests in GitHub.

### #30 — Detector experiments

Record model/version, initial weights, image size, epochs, augmentation, random seed, dataset/annotation versions, hardware, training/evaluation commands, metrics, error analysis and selected-model rationale. Resolve the selected implementation's licensing position before proprietary deployment.

### #31 — Tracking and association

Evaluate continuity, ID switches, fragmentation, temporary occlusion, multi-worker/multi-bale behavior, worker-to-bale association accuracy and unresolved/invalid states.

### #32 — Interaction engine

Generate explainable observations for opening, checking, frisking/required examination, duration, step order, visibility, interruptions, repeated steps and incomplete steps.

### #33 — SOP state machine

Implement approved sequence, timing windows, timeout/rework/interruption handling, insufficient visibility, camera/model failures, deterministic replay, versioned rules and explainable reason codes.

### #34 — Locked evaluation, packaging and four-camera benchmark

Freeze the locked acceptance set before final tuning.

Detection metrics:

- precision, recall and mAP by class;
- difficult-scene performance;
- hard-negative false positives.

Tracking and association metrics:

- suitable tracking metrics;
- fragmentation and identity switches where relevant;
- association accuracy;
- occlusion recovery.

Primary event-level metrics:

- completed/normal precision and recall;
- missed precision and recall;
- incomplete precision and recall;
- unresolved-case quality;
- false violation alerts per operating hour;
- missed violations;
- event latency and evidence availability;
- performance by camera and scenario.

One aggregate score must not hide weak minority-scenario performance.

Packaging requirements:

- reproducible checkpoint references stored outside GitHub;
- ONNX export and parity testing;
- TensorRT FP16 evaluation for NVIDIA runtime;
- INT8 only after representative calibration and verified accuracy;
- preprocessing, metadata, readiness/loading/degraded/failure states and warm-up documentation;
- bounded queues and backpressure;
- release manifest, limitations and rollback/runbooks.

## 11. Four-camera runtime baseline

- one ingestion worker per stream;
- configurable frame sampling;
- shared GPU inference scheduler;
- optional safe cross-stream batching;
- independent tracker and state machine per camera/process;
- rolling evidence buffers;
- bounded queues and backpressure;
- health monitoring;
- local durable spool;
- idempotent backend delivery.

Benchmark four simultaneous streams for:

- throughput/FPS and end-to-end latency;
- CPU, GPU utilization, GPU memory and RAM;
- queue age and dropped frames;
- disk/evidence load;
- API and PostgreSQL load;
- failure isolation, recovery and sustained stability.

## 12. Correct execution sequence

1. Factory-video and data audit — #27
2. Annotation guide — #28
3. Dataset v1 — #29
4. Detector experiments — #30
5. Tracking and worker-to-bale association — #31
6. Interaction engine — #32
7. SOP state machine — #33
8. Locked evaluation, export and four-camera benchmark — #34
9. Actual camera/hardware connection — #84
10. Actual model integration and PM/client site validation — #85

Software scaffolding may proceed in parallel, but final model selection must not precede controlled data, annotation and evaluation preparation.

## 13. GitHub/PR delivery requirements

Each issue-linked PR must:

- reference one primary issue;
- state dataset, annotation, model, rules and configuration versions;
- include tests and reproducibility instructions;
- identify API and runtime impact;
- avoid unrelated frontend/backend changes;
- never claim actual AI performance using simulator data;
- contain no restricted media, credentials, datasets, database dumps or model binaries.

Expected repository deliverables include:

- architecture decision records;
- video/data audit and annotation guide;
- safe dataset manifests and experiment configurations;
- training and evaluation scripts;
- tracking, association, interaction and SOP implementation;
- AI adapter and export scripts;
- sanitized evaluation/benchmark results;
- limitations, release manifest and setup/deployment/troubleshooting runbooks.

## 14. Definition of done

The AI epic #86 may close only when:

- dataset lineage, permission, access and retention are controlled;
- annotation specification is approved and versioned;
- train, validation and locked test sets are separated without leakage;
- detector selection is supported by reproducible PTC results and licensing is resolved;
- tracking and worker-to-bale association are validated;
- required interactions generate explainable observations;
- SOP state machine produces correct outcomes and reason codes, including unresolved/failure states;
- locked event-level acceptance evaluation is complete with camera/scenario breakdowns;
- selected model is packaged through the approved AI adapter with export parity verified;
- four-camera target-hardware benchmark and sustained stability test are complete;
- actual events flow through API, PostgreSQL, evidence, dashboard, supervisor review and reporting;
- model, dataset, annotation, rules, configuration, edge, API, database and frontend versions are recorded;
- PM/client acceptance is recorded in #85.

## 15. Milestone

Target milestone name: **AI Model v1 — PTC PoC**. No due date is authorized. The current connector does not expose milestone creation, so the repository owner must create and attach this milestone manually.