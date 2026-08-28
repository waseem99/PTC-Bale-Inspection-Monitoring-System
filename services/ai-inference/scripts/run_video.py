#!/usr/bin/env python3
"""Run the baseline PTC AI pipeline against a recorded video.

Requires approved PTC-trained YOLO weights for bale tracking and for inspection
detection, plus the runtime dependency group. Tracking runs first on each frame,
then inspection detection is associated onto those tracks.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def _start_epoch(value: str | None) -> float:
    if value is None:
        return datetime.now(timezone.utc).timestamp()
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        raise ValueError("--start-time must include a timezone offset or Z")
    return parsed.timestamp()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--camera", required=True)
    parser.add_argument("--weights", type=Path, help="Bale-tracking YOLO weights")
    parser.add_argument("--inspection-weights", type=Path, help="Inspected / not-inspected YOLO weights")
    parser.add_argument("--models-dir", type=Path, help="Folder containing both .pt files (defaults to repo models/)")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--audit-output", type=Path)
    parser.add_argument("--start-time", help="ISO-8601 capture start time; defaults to current UTC")
    parser.add_argument("--cpu-ocr", action="store_true")
    parser.add_argument("--tracker", default="bytetrack.yaml")
    args = parser.parse_args()

    try:
        import cv2  # type: ignore
    except ImportError as extra:
        raise SystemExit("Install runtime dependencies: pip install -e '.[runtime]'") from extra

    from ptc_ai.config import AiConfig
    from ptc_ai.event_mapper import to_audit_payload, to_platform_payload
    from ptc_ai.models import InspectionEvent, ObservationKind
    from ptc_ai.pipeline import RuntimePipeline
    from ptc_ai.runtime_adapters import EasyOcrDisplayAdapter, MediaPipeHandAdapter, SequentialBaleInspectionAdapter
    from ptc_ai.weights import resolve_model_weights

    try:
        track_weights, inspection_weights = resolve_model_weights(
            args.weights,
            args.inspection_weights,
            args.models_dir,
        )
    except FileNotFoundError as extra:
        raise SystemExit(str(extra)) from extra

    config = AiConfig.load(args.config)
    pipeline = RuntimePipeline(
        config=config,
        camera_id=args.camera,
        detector=SequentialBaleInspectionAdapter.from_weights(
            track_weights,
            inspection_weights,
            tracker=args.tracker,
        ),
        hand_reader=MediaPipeHandAdapter(),
        display_reader=EasyOcrDisplayAdapter(gpu=not args.cpu_ocr),
    )

    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise SystemExit(f"Unable to open video: {args.video}")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    start_epoch = _start_epoch(args.start_time)
    frame_index = 0
    events: list[InspectionEvent] = []
    last_timestamp = start_epoch
    failure: Exception | None = None
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            frame_index += 1
            position_ms = float(capture.get(cv2.CAP_PROP_POS_MSEC) or 0.0)
            relative = position_ms / 1000.0 if position_ms > 0 else frame_index / (fps or 25.0)
            timestamp = start_epoch + relative
            last_timestamp = timestamp
            events.extend(pipeline.process_frame(frame, timestamp))
    except Exception as extra:
        events.extend(pipeline.fail_active(ObservationKind.MODEL_FAILURE, last_timestamp))
        failure = extra
    finally:
        capture.release()
    events.extend(pipeline.finish(last_timestamp))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "".join(json.dumps(to_platform_payload(item), sort_keys=True) + "\n" for item in events),
        encoding="utf-8",
    )
    if args.audit_output:
        args.audit_output.parent.mkdir(parents=True, exist_ok=True)
        args.audit_output.write_text(
            "".join(json.dumps(to_audit_payload(item), sort_keys=True) + "\n" for item in events),
            encoding="utf-8",
        )
    print(
        json.dumps(
            {
                "frames": frame_index,
                "events": len(events),
                "captureStart": datetime.fromtimestamp(start_epoch, timezone.utc).isoformat().replace("+00:00", "Z"),
                "trackWeights": str(track_weights),
                "inspectionWeights": str(inspection_weights),
                "output": str(args.output),
                "auditOutput": str(args.audit_output) if args.audit_output else None,
            },
            sort_keys=True,
        )
    )
    if failure is not None:
        raise failure
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
