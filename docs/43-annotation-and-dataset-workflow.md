# Annotation and Dataset Workflow

## Objective

Prepare a controlled, leakage-safe PTC dataset for detection, tracking, hand-inspection, grading, routing and scale-display OCR evaluation.

The machine-readable annotation baseline is:

`services/ai-inference/config/annotation-specification-v1.json`

## Step 1 — restricted media inventory

For every source video, record outside GitHub:

- protected storage reference ID;
- source date/session and camera/view;
- duration, resolution, frame rate and corruption status;
- process stages visible;
- normal, anomaly, unresolved and operational-failure coverage;
- permitted use for training, calibration, validation or locked testing;
- retention and deletion requirement.

Do not extract bulk frames until permissions and split ownership are recorded.

## Step 2 — split before annotation expansion

Split by complete source video, camera session or collection block.

Required sets:

- training;
- validation/calibration;
- locked test/acceptance.

Never divide adjacent frames from the same source sequence across different splits. The same bale or session must not appear in more than one split.

## Step 3 — pilot annotation

Start with at least 20 representative clips covering:

- clear normal workflow;
- missed and incomplete steps;
- accepted and left-side rejected routing;
- readable, unreadable and unstable display cases;
- occlusion, glare, blur and insufficient visibility;
- multiple people and multiple bales where available.

Double-annotate at least 20% of the pilot. Review every disagreement and ambiguous label.

## Step 4 — label only observable evidence

Required object classes:

- `bale_closed`;
- `bale_opened`;
- `inspector`;
- `grade_indicator` only where a visible grading signal exists;
- `scale_display`.

Required temporal labels:

- `opening_completed`;
- `hand_inspection_proper`;
- `hand_inspection_incomplete`;
- `hand_inspection_none`;
- `grading_completed`;
- `routing_accepted`;
- `routing_rejected`;
- `weight_stable`;
- `weight_unreadable`;
- `insufficient_visibility`.

Do not infer a hidden grade, inspection decision or weight that is not visible. Use unresolved/insufficient visibility instead of inventing a violation.

## Step 5 — QA and freeze

Before bulk training:

- approve definitions and examples;
- reach the agreed inter-annotator target;
- record annotation tool and version;
- record annotator/reviewer identity in restricted logs;
- freeze annotation version;
- generate sanitized counts and checksums;
- freeze the locked test set before final model tuning.

## Step 6 — dataset layout

Recommended restricted layout:

```text
ptc-dataset-v1/
  train/
    images/
    labels/
  validation/
    images/
    labels/
  locked-test/
    images-or-clips/
    ground-truth/
  manifests/
  qa/
  ocr-crops/
```

The actual paths, media, labels and OCR crops must remain outside GitHub.

## Step 7 — training and evaluation

Detector training:

```bash
cd services/ai-inference
python -m pip install -e '.[train]'
python scripts/train_yolo.py \
  --data /restricted/ptc-dataset-v1/data.yaml \
  --project /restricted/runs \
  --name ptc-yolo-v1
```

Recorded-video execution:

```bash
python -m pip install -e '.[runtime]'
python scripts/run_video.py \
  --video /restricted/locked-test/sample.mp4 \
  --config /restricted/config/ptc-camera-roi-v1.json \
  --camera CAM-01 \
  --weights /restricted/models/ptc-yolo-v1.pt \
  --output /restricted/results/events.jsonl \
  --audit-output /restricted/results/events.audit.jsonl
```

Report metrics separately for:

- detector classes and camera/scenario;
- Bale ID continuity and association;
- proper/incomplete/missing hand inspection;
- grading and routing;
- OCR exact match, numeric error, unreadable and unstable rates;
- completed, anomaly and unresolved event outcomes;
- false anomalies per operating hour and missed anomalies;
- latency, evidence availability and multi-stream resources.

## GitHub-safe outputs

Allowed:

- specification and configuration templates;
- sanitized storage reference IDs;
- checksums and version identifiers;
- class/scenario counts;
- commands and experiment settings;
- sanitized metrics and limitations.

Prohibited:

- raw videos or extracted factory frames;
- annotations and OCR crops;
- model weights/checkpoints;
- camera URLs, credentials and private network details;
- evidence files and database dumps.
