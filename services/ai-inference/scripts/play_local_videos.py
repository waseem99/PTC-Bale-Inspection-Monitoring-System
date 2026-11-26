#!/usr/bin/env python3
"""Offline multi-camera inference for demo playback.

Maps videos/ files to CAM-01..CAM-04, draws detections + bale IDs, and writes:
  videos/output/<CAM>_<stem>.annotated.mp4
  videos/output/<CAM>_<stem>.events.jsonl
  videos/output/dashboard/camera-01.mp4 .. camera-04.mp4  (for Live dashboard)

Dashboard mode uses those pre-rendered clips so review stays smooth on CPU-only laptops.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".m4v"}
# Require an explicit cam/camera/CAM-0N token — bare D03/D04 must NOT steal CAM-03/04.
CAMERA_HINTS = (
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*1|CAM-0*1)\b", re.I), "CAM-01"),
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*2|CAM-0*2)\b", re.I), "CAM-02"),
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*3|CAM-0*3)\b", re.I), "CAM-03"),
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*4|CAM-0*4)\b", re.I), "CAM-04"),
)
DASHBOARD_NAME = {
    "CAM-01": "camera-01.mp4",
    "CAM-02": "camera-02.mp4",
    "CAM-03": "camera-03.mp4",
    "CAM-04": "camera-04.mp4",
}


class _EmptyHands:
    def points(self, _frame):
        return []


class _EmptyOcr:
    def read(self, _frame, _timestamp):
        return []


def _discover_videos(videos_dir: Path) -> list[Path]:
    return [
        path
        for path in sorted(videos_dir.iterdir())
        if path.is_file() and path.suffix.lower() in VIDEO_EXTS
    ]


def _assign_cameras(files: list[Path]) -> list[tuple[str, Path]]:
    """Prefer filename cam hints; otherwise assign sorted files to CAM-01..04 in order."""
    assigned: list[tuple[str, Path]] = []
    used: set[str] = set()
    fallback = ["CAM-01", "CAM-02", "CAM-03", "CAM-04"]
    hinted: list[tuple[str, Path] | None] = [None] * len(files)
    for index, path in enumerate(files):
        for pattern, camera_id in CAMERA_HINTS:
            if pattern.search(path.stem) and camera_id not in used:
                hinted[index] = (camera_id, path)
                used.add(camera_id)
                break
    for index, path in enumerate(files):
        if hinted[index] is not None:
            assigned.append(hinted[index])  # type: ignore[arg-type]
            continue
        camera = None
        for camera_id in fallback:
            if camera_id not in used:
                camera = camera_id
                break
        if camera is None:
            raise SystemExit(f"More than four videos found; cannot assign {path.name}")
        used.add(camera)
        assigned.append((camera, path))
    return assigned


def _draw(frame, detections, active_ids: dict[str, str], role: str):
    import cv2

    out = frame.copy()
    for item in detections:
        x1 = int(item.box.x1 * out.shape[1])
        y1 = int(item.box.y1 * out.shape[0])
        x2 = int(item.box.x2 * out.shape[1])
        y2 = int(item.box.y2 * out.shape[0])
        color = (
            (0, 200, 0)
            if "inspect" in item.class_name.lower() or "opening" in item.class_name.lower()
            else (255, 180, 0)
        )
        if item.track_id is not None and str(item.track_id) in active_ids:
            label = f"{active_ids[str(item.track_id)]} | {item.class_name} {item.confidence:.2f}"
            color = (0, 255, 255)
        else:
            label = f"{item.class_name} {item.confidence:.2f}"
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        cv2.putText(out, label, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
    cv2.putText(out, f"{role}", (12, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    y = 56
    for bale_id in sorted(set(active_ids.values())):
        cv2.putText(out, bale_id, (12, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        y += 24
    return out


def _publish_dashboard_clip(annotated: Path, camera_id: str, dashboard_dir: Path, public_media: Path | None) -> Path:
    dashboard_dir.mkdir(parents=True, exist_ok=True)
    target = dashboard_dir / DASHBOARD_NAME[camera_id]
    shutil.copy2(annotated, target)
    if public_media is not None:
        public_media.mkdir(parents=True, exist_ok=True)
        shutil.copy2(annotated, public_media / DASHBOARD_NAME[camera_id])
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--videos-dir", type=Path, default=Path("../../videos"))
    parser.add_argument("--models-dir", type=Path, default=Path("../../models"))
    parser.add_argument("--config", type=Path, default=Path("config/poc.example.json"))
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--max-frames", type=int, default=0, help="0 = full video")
    parser.add_argument("--display-scale", type=float, default=0.5)
    parser.add_argument("--display", action="store_true", help="Show OpenCV windows (optional)")
    parser.add_argument("--cpu-ocr", action="store_true", default=True)
    parser.add_argument("--wait-seconds", type=int, default=0, help="Wait for videos to appear")
    parser.add_argument(
        "--publish-dashboard-media",
        action="store_true",
        default=True,
        help="Copy annotated clips to videos/output/dashboard/camera-0N.mp4",
    )
    parser.add_argument(
        "--public-media-dir",
        type=Path,
        default=Path("../../apps/dashboard-web/public/media"),
        help="Also copy dashboard clips here for Vite /media/camera-0N.mp4",
    )
    parser.add_argument("--skip-public-media", action="store_true")
    args = parser.parse_args()

    try:
        import cv2
    except ImportError as extra:
        raise SystemExit("Install runtime deps: pip install -e '.[runtime]'") from extra

    videos_dir = args.videos_dir.expanduser().resolve()
    models_dir = args.models_dir.expanduser().resolve()
    output_dir = (args.output_dir or (videos_dir / "output")).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    dashboard_dir = output_dir / "dashboard"
    public_media = None if args.skip_public_media else args.public_media_dir.expanduser().resolve()

    deadline = time.time() + max(0, args.wait_seconds)
    files = _discover_videos(videos_dir)
    while not files and time.time() < deadline:
        print(f"Waiting for videos in {videos_dir} ...")
        time.sleep(2)
        files = _discover_videos(videos_dir)
    if not files:
        print(f"No videos found in {videos_dir}")
        print("Drop MP4/AVI/MOV/MKV files there, then re-run this script.")
        return 2

    from ptc_ai.camera_runtime import build_camera_detector
    from ptc_ai.config import AiConfig
    from ptc_ai.event_mapper import to_platform_payload
    from ptc_ai.identity import BaleIdentityRegistry
    from ptc_ai.pipeline import RuntimePipeline
    from ptc_ai.weights import resolve_model_weights

    try:
        from ptc_ai.runtime_adapters import EasyOcrDisplayAdapter, MediaPipeHandAdapter

        hand_reader = MediaPipeHandAdapter()
        display_reader = EasyOcrDisplayAdapter(gpu=not args.cpu_ocr)
        print("Using MediaPipe + EasyOCR adapters")
    except Exception as extra:
        print(f"Hand/OCR adapters unavailable ({extra}); continuing with YOLO-only stubs")
        hand_reader = _EmptyHands()
        display_reader = _EmptyOcr()

    config = AiConfig.load(args.config)
    detect_conf = config.thresholds.detect_min_confidence
    inspect_conf = config.thresholds.inspect_min_confidence
    track_weights, inspection_weights = resolve_model_weights(models_dir=models_dir)
    identity = BaleIdentityRegistry()
    assignments = _assign_cameras(files)
    print("Assignments:")
    for camera_id, path in assignments:
        print(f"  {camera_id} ({config.cameras[camera_id].role}) <- {path.name}")
    print(f"Confidence: detect>={detect_conf:.2f} inspect>={inspect_conf:.2f}")

    # Process detect cameras before inspect when multiple files exist.
    assignments.sort(key=lambda item: 0 if config.cameras[item[0]].role == "detect" else 1)

    for camera_id, video_path in assignments:
        role = config.cameras[camera_id].role
        detector = build_camera_detector(
            role,
            track_weights=track_weights,
            inspection_weights=inspection_weights,
            detect_conf=detect_conf,
            inspect_conf=inspect_conf,
        )
        pipeline = RuntimePipeline(
            config=config,
            camera_id=camera_id,
            detector=detector,
            hand_reader=hand_reader,
            display_reader=display_reader,
            identity=identity,
        )
        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            print(f"SKIP unreadable video: {video_path}")
            continue
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 25.0)
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
        writer_path = output_dir / f"{camera_id}_{video_path.stem}.annotated.mp4"
        events_path = output_dir / f"{camera_id}_{video_path.stem}.events.jsonl"
        writer = cv2.VideoWriter(
            str(writer_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps if fps > 1 else 25.0,
            (width, height),
        )
        start_epoch = datetime.now(timezone.utc).timestamp()
        frame_index = 0
        events = []
        window = f"PTC {camera_id}"
        print(f"Rendering {camera_id}: {video_path.name}")
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                frame_index += 1
                if args.max_frames and frame_index > args.max_frames:
                    break
                timestamp = start_epoch + frame_index / (fps if fps > 1 else 25.0)
                detections = detector.infer(frame)
                events.extend(pipeline.process_frame(frame, timestamp))
                active_ids = dict(pipeline._local_to_global)
                annotated = _draw(frame, detections, active_ids, f"{camera_id} / {role}")
                writer.write(annotated)
                if args.display:
                    display = annotated
                    if args.display_scale != 1.0:
                        display = cv2.resize(
                            annotated,
                            None,
                            fx=args.display_scale,
                            fy=args.display_scale,
                        )
                    cv2.imshow(window, display)
                    key = cv2.waitKey(1) & 0xFF
                    if key in (27, ord("q")):
                        print("Stopped by user")
                        break
                if frame_index % 100 == 0:
                    print(f"  {camera_id} frame {frame_index}")
        finally:
            events.extend(pipeline.finish(start_epoch + frame_index / (fps if fps > 1 else 25.0)))
            capture.release()
            writer.release()
            if args.display:
                cv2.destroyWindow(window)
        events_path.write_text(
            "".join(json.dumps(to_platform_payload(item), sort_keys=True) + "\n" for item in events),
            encoding="utf-8",
        )
        dashboard_clip = None
        if args.publish_dashboard_media and camera_id in DASHBOARD_NAME:
            dashboard_clip = _publish_dashboard_clip(writer_path, camera_id, dashboard_dir, public_media)
        print(
            json.dumps(
                {
                    "camera": camera_id,
                    "role": role,
                    "frames": frame_index,
                    "events": len(events),
                    "bales": identity.allocated_count,
                    "eventsFile": str(events_path),
                    "annotatedVideo": str(writer_path),
                    "dashboardClip": str(dashboard_clip) if dashboard_clip else None,
                },
                sort_keys=True,
            )
        )

    print(f"Done. Shared bale count={identity.allocated_count}. Output: {output_dir}")
    print(f"Dashboard clips: {dashboard_dir}")
    if public_media is not None:
        print(f"Vite public media: {public_media}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
