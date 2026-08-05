#!/usr/bin/env python3
"""Reproducible YOLO training entry point for the PTC detector.

The dataset YAML and output artifacts must live in approved restricted storage.
Only sanitized configuration, metrics, checksums, and version references belong in GitHub.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--base-model", default="yolo11n.pt")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--imgsz", type=int, default=960)
    parser.add_argument("--batch", type=int, default=-1)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", default="0")
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()

    try:
        from ultralytics import YOLO  # type: ignore
    except ImportError as exc:
        raise SystemExit("Install the train extra: pip install -e '.[train]'") from exc

    model = YOLO(args.base_model)
    result = model.train(
        data=str(args.data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        seed=args.seed,
        device=args.device,
        project=str(args.project),
        name=args.name,
        deterministic=True,
    )
    manifest = {
        "baseModel": args.base_model,
        "data": str(args.data),
        "epochs": args.epochs,
        "imgsz": args.imgsz,
        "batch": args.batch,
        "seed": args.seed,
        "device": args.device,
        "saveDir": str(result.save_dir),
    }
    output = args.project / args.name / "training-manifest.json"
    output.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
