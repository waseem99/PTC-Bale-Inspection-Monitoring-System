# PTC Bale AI Runtime

This service contains the testable orchestration and deterministic compliance logic for the finalized PTC process:

```text
bale enters → opened → proper hand inspection → graded
→ accepted or left-side rejected route → weight read by AI/OCR → completed
```

## Implemented in this package

- versioned camera/ROI and threshold configuration;
- YOLO + ByteTrack runtime adapter with mandatory custom-weights input;
- MediaPipe hands adapter;
- explainable proper/incomplete/no hand-inspection baseline;
- grading observation contract;
- accepted/rejected ROI routing, with left configured as rejection;
- EasyOCR display adapter and temporal weight stabilization;
- deterministic SOP/anomaly state machine;
- strict platform-ingestion event mapping plus protected AI audit sidecars;
- component evaluation helpers;
- reproducible YOLO training/export entry points;
- unit and deterministic replay tests.

## Required external release inputs

The repository intentionally does not contain:

- factory videos or extracted frames;
- annotations or datasets;
- trained model weights;
- OCR crops;
- camera credentials or production ROIs.

Those inputs must be supplied from approved restricted storage. Until trained PTC weights and locked evaluation data are supplied, the runtime is implementation-complete but not accuracy-certified.

## Core tests

```bash
cd services/ai-inference
python -m pip install -e .
python -m unittest discover -s tests -v
python -m ptc_ai replay \
  --config config/poc.example.json \
  --input tests/observations.completed.jsonl
```

## Runtime dependencies

```bash
python -m pip install -e '.[runtime]'
```

The runtime adapters require a PTC-trained weights file. A generic COCO model may be used only for plumbing experiments and cannot be reported as PTC accuracy.

## Recorded-video testing

Use an ISO capture start time when it is known. Without it, the runner uses the current UTC time so generated events are never dated at the Unix epoch.

```bash
python scripts/run_video.py \
  --video /restricted/sample.mp4 \
  --config /restricted/approved-camera-config.json \
  --camera CAM-01 \
  --weights /restricted/models/ptc-yolo-v1.pt \
  --output /restricted/results/events.jsonl \
  --audit-output /restricted/results/events.audit.jsonl \
  --start-time 2026-08-05T10:00:00+05:00
```

This command is ready for the team to use once the approved weights and camera ROI configuration exist.

## Detector training

```bash
python -m pip install -e '.[train]'
python scripts/train_yolo.py \
  --data /restricted/dataset-v1/data.yaml \
  --project /restricted/runs \
  --name ptc-yolo-v1
```

## Delivery contract

`ptc_ai.event_mapper.to_platform_payload` produces the current `/api/ingest/events` payload shape. Actual deployment should send the payload through the existing durable edge spool so API outages do not lose events.

## Runtime safety notes

- The current platform ingestion endpoint is strict. Platform payloads use `source: edge` and contain no unsupported fields.
- Complete Bale ID, session ID, reason-code, route, weight and component metadata is written only to the optional protected audit sidecar.
- When more than one routed bale is simultaneously awaiting a single scale reading, the runtime produces an unresolved association instead of assigning one weight to the wrong bale.
- The supplied `Dockerfile` packages the dependency-light SOP/replay core. GPU computer-vision deployment must use the approved NVIDIA/runtime image and install the `runtime` dependency group with the selected model artifacts.
