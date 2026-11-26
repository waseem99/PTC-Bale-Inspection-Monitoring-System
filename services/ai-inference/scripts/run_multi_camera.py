#!/usr/bin/env python3
"""Run detect + inspect cameras with one shared bale-ID registry.

Example (CAM-01/02 detect, CAM-03/04 inspect):

python scripts/run_multi_camera.py \\
  --config config/poc.example.json \\
  --models-dir ../../models \\
  --camera CAM-01=/restricted/cam1.mp4 \\
  --camera CAM-02=/restricted/cam2.mp4 \\
  --camera CAM-03=/restricted/cam3.mp4 \\
  --camera CAM-04=/restricted/cam4.mp4 \\
  --output /restricted/results/events.jsonl
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _parse_camera_video(value: str) -> tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("Use CAMERA_ID=/path/to/video.mp4")
    camera_id, raw_path = value.split("=", 1)
    camera_id = camera_id.strip()
    path = Path(raw_path.strip())
    if not camera_id:
        raise argparse.ArgumentTypeError("Camera ID is required")
    return camera_id, path


def _start_epoch(value: str | None) -> float:
    if value is None:
        return datetime.now(timezone.utc).timestamp()
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("--start-time must include a timezone offset or Z")
    return parsed.timestamp()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--camera", action="append", required=True, type=_parse_camera_video)
    parser.add_argument("--models-dir", type=Path)
    parser.add_argument("--weights", type=Path)
    parser.add_argument("--inspection-weights", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--audit-output", type=Path)
    parser.add_argument("--start-time")
    parser.add_argument("--cpu-ocr", action="store_true")
    parser.add_argument("--tracker", default="bytetrack.yaml")
    args = parser.parse_args()

    try:
        import cv2  # type: ignore
    except ImportError as extra:
        raise SystemExit("Install runtime dependencies: pip install -e '.[runtime]'") from extra

    from ptc_ai.camera_runtime import build_camera_detector
    from ptc_ai.config import AiConfig
    from ptc_ai.event_mapper import to_audit_payload, to_platform_payload
    from ptc_ai.identity import BaleIdentityRegistry
    from ptc_ai.pipeline import RuntimePipeline
    from ptc_ai.runtime_adapters import EasyOcrDisplayAdapter, MediaPipeHandAdapter
    from ptc_ai.weights import resolve_model_weights

    config = AiConfig.load(args.config)
    try:
        track_weights, inspection_weights = resolve_model_weights(
            args.weights, args.inspection_weights, args.models_dir
        )
    except FileNotFoundError as extra:
        raise SystemExit(str(extra)) from extra

    identity = BaleIdentityRegistry()
    pipelines: dict[str, RuntimePipeline] = {}
    captures: dict[str, Any] = {}
    for camera_id, video in args.camera:
        if camera_id not in config.cameras:
            raise SystemExit(f"Camera {camera_id} is not configured")
        role = config.cameras[camera_id].role
        detector = build_camera_detector(
            role,
            track_weights=track_weights,
            inspection_weights=inspection_weights,
            tracker=args.tracker,
            detect_conf=config.thresholds.detect_min_confidence,
            inspect_conf=config.thresholds.inspect_min_confidence,
        )
        pipelines[camera_id] = RuntimePipeline(
            config=config,
            camera_id=camera_id,
            detector=detector,
            hand_reader=MediaPipeHandAdapter(),
            display_reader=EasyOcrDisplayAdapter(gpu=not args.cpu_ocr),
            identity=identity,
        )
        capture = cv2.VideoCapture(str(video))
        if not capture.isOpened():
            raise SystemExit(f"Unable to open video for {camera_id}: {video}")
        captures[camera_id] = capture

    start_epoch = _start_epoch(args.start_time)
    frame_index = 0
    platform_events: list[dict] = []
    audit_events: list[dict] = []
    try:
        while True:
            frames = {}
            alive = False
            for camera_id, capture in captures.items():
                ok, frame = capture.read()
                if ok:
                    alive = True
                    frames[camera_id] = frame
            if not alive:
                break
            frame_index += 1
            # Prefer each stream's FPS when available; fall back to 25.
            timestamp = start_epoch + (frame_index - 1) / 25.0
            # Process detect cameras first so IDs exist before inspection association.
            ordered = sorted(
                frames,
                key=lambda camera_id: 0 if config.cameras[camera_id].role == "detect" else 1,
            )
            for camera_id in ordered:
                events = pipelines[camera_id].process_frame(frames[camera_id], timestamp)
                for event in events:
                    platform_events.append(to_platform_payload(event))
                    audit_events.append(to_audit_payload(event))
    finally:
        for capture in captures.values():
            capture.release()
        finish_ts = start_epoch + max(frame_index - 1, 0) / 25.0
        for pipeline in pipelines.values():
            for event in pipeline.finish(finish_ts):
                platform_events.append(to_platform_payload(event))
                audit_events.append(to_audit_payload(event))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for row in platform_events:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    if args.audit_output is not None:
        args.audit_output.parent.mkdir(parents=True, exist_ok=True)
        with args.audit_output.open("w", encoding="utf-8") as handle:
            for row in audit_events:
                handle.write(json.dumps(row, sort_keys=True) + "\n")
    print(
        f"cameras={len(pipelines)} frames={frame_index} "
        f"events={len(platform_events)} bales={identity.allocated_count}"
    )
    print(f"trackWeights={track_weights}")
    print(f"inspectionWeights={inspection_weights}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
