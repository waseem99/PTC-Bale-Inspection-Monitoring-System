#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", type=Path, required=True)
    parser.add_argument("--format", choices=["onnx", "engine"], default="onnx")
    parser.add_argument("--imgsz", type=int, default=960)
    parser.add_argument("--half", action="store_true")
    args = parser.parse_args()
    try:
        from ultralytics import YOLO  # type: ignore
    except ImportError as exc:
        raise SystemExit("Install the train extra: pip install -e '.[train]'") from exc
    model = YOLO(str(args.weights))
    path = model.export(format=args.format, imgsz=args.imgsz, half=args.half, dynamic=False, simplify=True)
    print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
