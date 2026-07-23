# AI Development and Evaluation Plan

## Objective

Build a site-specific computer-vision pipeline that detects bales and workers, tracks their movement, evaluates the client-approved inspection sequence, and creates evidence-backed normal or violation events.

## Delivery approach

The MVP will not rely on one opaque end-to-end model. It will combine:

1. object detection;
2. camera-local tracking;
3. configurable zones;
4. worker-to-bale association;
5. action or interaction signals;
6. deterministic SOP state transitions;
7. evidence generation and human review.

This makes outcomes easier to test, tune, and explain.

## Data collection

### Required coverage

- all four planned camera views;
- normal completed inspections;
- intentionally missed inspections;
- intentionally incomplete inspections;
- different workers and bale appearances;
- expected lighting changes;
- partial occlusion and crowding;
- conveyor stoppage and irregular movement;
- camera outage or degraded visibility examples.

### Data controls

- obtain written client approval before collecting footage;
- record collection dates, camera IDs, shifts, and scenario labels;
- store raw footage in restricted project-approved storage;
- do not commit footage or extracted frames to GitHub;
- remove footage that falls outside the approved retention period.

## Annotation plan

### Core object classes

- `bale`
- `person`

### Optional visual classes after footage review

- `opened_bale_region`
- `inspection_tool_or_hand_region` only where visually reliable and approved

### Temporal labels

- bale enters inspection zone;
- worker-bale interaction begins;
- required checking action observed;
- required action completes;
- bale exits inspection zone;
- missed/incomplete scenario reason.

### Annotation QA

- written annotation guide;
- sample review before bulk annotation;
- second-person review of a defined sample;
- correction of ambiguous labels;
- dataset manifest with source and annotation versions.

## Dataset splits

- training set;
- validation set;
- locked acceptance/test set;
- live calibration set kept separate from final acceptance scoring.

Footage from one continuous sequence must not be randomly split across training and test sets in a way that leaks near-identical frames.

## Model development

1. establish a pretrained detector baseline;
2. fine-tune for site footage where required;
3. select a tracker and validate track stability;
4. implement zone and association logic;
5. implement inspection-interaction signals;
6. implement SOP state machine and reason codes;
7. export and benchmark the selected model with ONNX Runtime CUDA;
8. package model and configuration versions for edge release.

## Evaluation levels

### Object detection

- precision and recall for bales;
- precision and recall for workers;
- missed detections in critical zones;
- false detections affecting SOP outcomes.

### Tracking

- track continuity through the inspection area;
- duplicate bale tracks;
- lost tracks near entry, inspection, and exit boundaries;
- worker-bale association stability.

### Scenario outcome

- completed inspection correctly classified;
- missed inspection correctly classified;
- incomplete inspection correctly classified;
- false violation rate;
- missed violation rate;
- insufficient-visibility cases handled without false certainty.

### Runtime

- sustained processing of four configured feeds;
- average and percentile inference latency;
- GPU, CPU, memory, and disk use;
- evidence clip generation time;
- recovery after stream interruption.

## Acceptance metrics

Exact numerical thresholds must be agreed with the client after reviewing representative footage. No unsupported accuracy percentage is committed in advance.

The acceptance report will include:

- scenario definitions;
- test-set composition;
- configuration and model versions;
- confusion matrix at scenario level;
- false-positive and false-negative examples;
- known limitations;
- approved thresholds.

## Calibration controls

- frame sampling rate;
- detection confidence threshold;
- track persistence;
- zone coordinates;
- interaction-distance thresholds;
- minimum interaction duration;
- state timeouts;
- evidence pre-roll and post-roll;
- insufficient-visibility threshold.

Calibration values must be configuration, not hard-coded application logic.

## Model release package

- model artifact stored outside Git;
- checksum and version manifest;
- compatible runtime version;
- class definitions;
- preprocessing and postprocessing configuration;
- calibration configuration;
- evaluation report;
- rollback reference to the previous approved model.

## Hypercare improvement cycles

- collect confirmed false positives and false negatives;
- review client feedback and review-status outcomes;
- add only approved and representative samples;
- retrain or tune where evidence supports it;
- rerun the locked acceptance set;
- deploy only when regression results are acceptable;
- document every model and rule change.
