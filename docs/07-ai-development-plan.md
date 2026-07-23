# AI Development and Evaluation Plan

## Objective

Develop a PTC-site-specific computer-vision pipeline that detects bales and anonymous workers, maintains temporary camera/zone sessions, observes the approved opening and frisking interactions, and produces explainable completed, missed, incomplete, or unresolved outcomes.

## Reference-data boundary

The Bangladesh media is used to understand:

- bale appearance and deformability;
- overhead camera possibilities;
- multi-worker/multi-bale occlusion;
- loose-leaf and clutter conditions;
- possible camera/status overlay conventions;
- the staged PoC journey.

It does not establish PTC labels, thresholds, camera placement, `scan` semantics, model architecture, or acceptance performance.

Before any Bangladesh frame is used for training, issue #59/#27 must record explicit data-use rights. Reference media must never be part of the locked PTC acceptance set.

## AI pipeline

1. camera frame orientation, timestamping, and sampling;
2. bale and anonymous person detection;
3. camera/zone-local multi-object tracking;
4. inspection-session creation and lifecycle;
5. worker-to-bale association;
6. approved opening/frisking interaction signals;
7. versioned SOP state machine;
8. event confidence/reason code and unresolved behavior;
9. snapshot/short-clip evidence generation;
10. PTC-specific evaluation and release packaging.

## Dataset plan

### Dataset classes

- **Reference set:** Bangladesh assets, restricted and separately manifested.
- **PTC training set:** approved examples used for model fitting.
- **PTC validation set:** used for development-time model/threshold selection.
- **PTC calibration set:** representative live/site sequences used for zone and threshold tuning.
- **Locked PTC acceptance set:** held out from training and routine tuning.
- **Hypercare feedback set:** client-reviewed production examples added only through controlled data governance.

No continuous sequence may be split across training and locked acceptance sets.

### Required PTC scenario coverage

- bale before, during, and after opening;
- valid completed frisking/checking;
- no opening/no frisking;
- partial opening or partial frisking;
- rework and repeated interaction;
- multiple workers around one bale;
- multiple visible or simultaneously processed bales;
- workers or bales causing temporary/severe occlusion;
- loose tobacco leaves and wrapping changes;
- stopped/irregular movement and long dwell;
- lighting, glare, shadow, dust, and camera differences;
- camera/system outage and unusable imagery;
- safe staged violations approved by the client.

## Annotation plan

The annotation guide must define:

- bale object class and difficult/partial visibility rules;
- anonymous person class;
- camera/zone and session boundaries;
- opening/exposure observable proxies;
- frisking/checking interaction and minimum valid conditions;
- completed, missed, incomplete, unresolved, and excluded scenarios;
- occlusion, truncation, ignore, and ambiguous labels;
- source site, camera, date, shift, scenario, permitted use, and dataset version;
- positive, negative, and difficult examples.

Annotators must complete a pilot batch and reviewer QA before bulk labeling.

## Detection and tracking

### Detector

- start from a suitable pretrained object detector;
- evaluate bale and person precision/recall by PTC camera and critical zone;
- review errors that affect final compliance outcomes rather than optimizing object metrics alone;
- retain reproducible training configuration, dataset manifest, and model checksum.

### Tracking and sessions

- use camera/zone-local temporary IDs;
- define entry, inspection, and exit transitions;
- handle lost tracks, merges, splits, and reappearance conservatively;
- support multiple visible bales only where the camera view provides sufficient separation;
- do not claim cross-camera or permanent bale identity;
- do not store worker names or biometric identity.

## Opening and frisking interaction detection

The exact method depends on the approved PTC SOP and PTC footage. Candidate observable signals may include:

- worker-bale proximity and overlap;
- interaction duration;
- hand/upper-body motion around approved bale regions;
- covering/surface appearance change;
- exposure of approved bale area;
- repeated interaction across required points;
- sequence and timing relative to entry/exit.

A specialized temporal/action model may be introduced only when simpler observable signals are insufficient and the data supports it. Thresholds and per-camera behavior must be configuration, not hard-coded.

The visible reference phrase `Not Scanned` must not become a label or rule until the PTC process owner defines its relevance.

## SOP state machine

Inputs:

- camera/zone and session state;
- bale/person track quality;
- opening/frisking signals;
- timestamps and duration;
- visibility/occlusion quality;
- camera/service health.

Outputs:

- completed inspection;
- missed inspection;
- incomplete inspection;
- unresolved/insufficient visibility;
- operational health event separate from process outcome.

Every final event records model, rule, zone, camera, and threshold/configuration versions.

## Evaluation

### Object-level

- bale precision and recall;
- person precision and recall;
- critical-zone false positives/negatives;
- results by camera, lighting, and occlusion condition.

### Tracking/session-level

- track/session continuity;
- lost/merged/duplicate sessions;
- correct worker-bale association;
- multiple-bale scenario behavior.

### Interaction-level

- opening signal detection;
- frisking/checking signal detection;
- timing/duration error;
- false interaction caused by nearby handling or occlusion.

### Scenario-level

- completed, missed, incomplete, and unresolved confusion matrix;
- violation false-positive rate;
- violation false-negative rate;
- results by camera/zone and scenario type;
- operational outage separation.

Numerical acceptance thresholds are approved after the first representative PTC baseline; no Bangladesh-reference result is a PTC accuracy claim.

## Runtime export and benchmark

- export the selected model to ONNX or another approved local runtime format;
- validate output equivalence within an agreed tolerance;
- benchmark four configured streams on the approved workstation;
- measure decode, preprocessing, inference, tracking, SOP, evidence, and local-dashboard latency;
- measure GPU/CPU/RAM/disk/network use;
- verify evidence encoding and local application operation do not stop inference.

## Calibration

Per-camera configuration includes:

- orientation;
- entry/inspection/exit/ignore zones;
- detector confidence;
- tracker parameters;
- interaction duration and thresholds;
- timeout and lost-track behavior;
- evidence pre/post duration;
- frame sampling rate;
- unresolved-visibility thresholds.

Every material change must be versioned and rerun against the locked PTC regression set.

## Release package

Each AI release includes:

- model artifact reference and checksum outside Git;
- model manifest and training/evaluation configuration;
- dataset manifest/version references;
- SOP rule package;
- camera/zone/threshold configurations;
- evaluation report and known limitations;
- workstation benchmark;
- compatibility requirements;
- rollback package.

## Hypercare improvement cycles

For each client-confirmed error:

1. reference the event ID and approved evidence location;
2. classify root cause as camera/view, data, detection, tracking, association, interaction, SOP rule, or configuration;
3. add PTC samples only through approved dataset governance;
4. implement the smallest evidence-supported correction;
5. rerun locked PTC acceptance/regression tests;
6. record metrics, versions, limitations, and rollback;
7. deploy through the approved release process.

New analytics, worker identity, scanner/IoT integration, and full-production rollout features are not AI improvement tasks; they require change control.
