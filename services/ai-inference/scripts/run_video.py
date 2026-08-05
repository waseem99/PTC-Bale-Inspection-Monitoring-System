#!/usr/bin/env python3
"""Run the baseline PTC AI pipeline against a recorded video.

Requires approved PTC-trained YOLO weights and the runtime dependency group.
The command writes platform-compatible event JSONL for integration testing.
It does not upload restricted video or generated crops to GitHub.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--camera", required=True)
    parser.add_argument("--weights", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cpu-ocr", action="store_true")
    parser.add_argument("--tracker", default="bytetrack.yaml")
    args = parser.parse_args()

    try:
        import cv2  # type: ignore
    except ImportError as exc:
        raise SystemExit("Install runtime dependencies: pip install -e '.[runtime]'") from exc

    from ptc_ai.config import AiConfig
    from ptc_ai.event_mapper import to_platform_payload
    from ptc_ai.models import ObservationKind
    from ptc_ai.pipeline import RuntimePipeline
    from ptc_ai.runtime_adapters import EasyOcrDisplayAdapter, MediaPipeHandAdapter, UltralyticsByteTrackAdapter

    config = AiConfig.load(args.config)
    pipeline = RuntimePipeline(
        config=config,
        camera_id=args.camera,
        detector=UltralyticsByteTrackAdapter(args.weights, tracker=args.tracker),
        hand_reader=MediaPipeHandAdapter(),
        display_reader=EasyOcrDisplayAdapter(gpu=not args.cpu_ocr),
    )

    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise SystemExit(f"Unable to open video: {args.video}")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
    frame_index = 0
    payloads: list[dict] = []
    last_timestamp = 0.0
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            frame_index += 1
            position_ms = float(capture.get(cv2.CAP_PROP_POS_MSEC) or 0.0)
            timestamp = position_ms / 1000.0 if position_ms > 0 else frame_index / (fps or 25.0)
            last_timestamp = timestamp
            payloads.extend(to_platform_payload(event) for event in pipeline.process_frame(frame, timestamp))
    except Exception:
        payloads.extend(to_platform_payload(event) for event in pipeline.fail_active(ObservationKind.MODEL_FAILURE, last_timestamp))
        raise
    finally:
        capture.release()
    payloads.extend(to_platform_payload(event) for event in pipeline.finish(last_timestamp))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("".join(json.dumps(item, sort_keys=True) + "\n" for item in payloads), encoding="utf-8")
    print(json.dumps({"frames": frame_index, "events": len(payloads), "output": str(args.output)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
