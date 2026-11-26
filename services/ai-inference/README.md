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

Camera roles (see `config/poc.example.json`):

- **CAM-01 / CAM-02 (`detect`)** use `bale_detect_*.pt` to track bales and keep stable IDs (`bale-1`, `bale-2`, …) at **≥85%** confidence.
- **CAM-03 / CAM-04 (`inspect`)** keep **tracking with the detect model** (≥85%) and also run `bale_inspect_*.pt` (`Bale Opening`, `Bale Inspection`) at **≥65%** on the same global bale IDs. Tracking continues on these cameras so opening/inspection stay attached to the correct bale number.

Offline demo (pre-render annotated MP4s for the dashboard, no live OpenCV windows):

```bash
python scripts/play_local_videos.py \
  --videos-dir ../../videos \
  --models-dir ../../models
```

Then run the dashboard with `VITE_CAMERA_PREVIEW_MODE=local` so Live Monitoring plays `public/media/camera-01.mp4` … `camera-04.mp4`.

Place weights in repo `models/` (gitignored) or pass explicit paths.

```bash
python scripts/run_video.py \
  --video /restricted/sample.mp4 \
  --config config/poc.example.json \
  --camera CAM-01 \
  --models-dir ../../models \
  --output /restricted/results/events.jsonl \
  --audit-output /restricted/results/events.audit.jsonl \
  --start-time 2026-08-05T10:00:00+05:00
```

Four-camera shared identity:

```bash
python scripts/run_multi_camera.py \
  --config config/poc.example.json \
  --models-dir ../../models \
  --camera CAM-01=/restricted/cam1.mp4 \
  --camera CAM-02=/restricted/cam2.mp4 \
  --camera CAM-03=/restricted/cam3.mp4 \
  --camera CAM-04=/restricted/cam4.mp4 \
  --output /restricted/results/events.jsonl
```

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
