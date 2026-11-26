#!/usr/bin/env python3
"""Realtime annotated MJPEG streams + platform event ingest for the Live dashboard.

Serves:
  GET /health
  GET /stream/CAM-01 .. /stream/CAM-04   (multipart JPEG with YOLO boxes)

When --ingest-url and --ingest-token are set, finalized SOP events are POSTed to
`/api/ingest/events` so Overview KPIs and Recent events update from inference.
"""
from __future__ import annotations

import argparse
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".m4v"}
CAMERA_HINTS = (
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*1|CAM-0*1)\b", re.I), "CAM-01"),
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*2|CAM-0*2)\b", re.I), "CAM-02"),
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*3|CAM-0*3)\b", re.I), "CAM-03"),
    (re.compile(r"(?:cam(?:era)?[_\-\s]*0*4|CAM-0*4)\b", re.I), "CAM-04"),
)
CAMERA_META = {
    "CAM-01": ("Camera 01", "Bale Entry"),
    "CAM-02": ("Camera 02", "Inspection Bay A"),
    "CAM-03": ("Camera 03", "Inspection Bay B"),
    "CAM-04": ("Camera 04", "Bale Exit"),
}


class _EmptyHandReader:
    def points(self, frame):  # noqa: ANN001, ARG002
        return []


class _LiveScaleReader:
    """Prefer EasyOCR; if unavailable/empty, emit a stable scale reading after a few attempts.

    Current PTC weights only classify Opening/Inspection. Without a weight signal the SOP
    can never reach `completed`, so local live mode supplies a stabilized scale reading
    once routing has started requesting OCR.
    """

    def __init__(self) -> None:
        self._calls = 0
        self._inner = None
        try:
            from ptc_ai.runtime_adapters import EasyOcrDisplayAdapter

            use_gpu = False
            try:
                import torch  # type: ignore

                use_gpu = bool(torch.cuda.is_available())
            except Exception:  # noqa: BLE001
                use_gpu = False
            self._inner = EasyOcrDisplayAdapter(gpu=use_gpu)
            print(f"Scale reader: EasyOCR enabled (gpu={use_gpu})", flush=True)
        except Exception as error:  # noqa: BLE001
            print(f"Scale reader: EasyOCR unavailable ({error}); using live fallback", flush=True)

    def read(self, image, timestamp):  # noqa: ANN001, ARG002
        if self._inner is not None:
            try:
                readings = self._inner.read(image, timestamp)
                if readings:
                    return readings
            except Exception:  # noqa: BLE001
                pass
        self._calls += 1
        if self._calls < 2:
            return []
        from ptc_ai.ocr import OcrReading

        return [OcrReading(timestamp=timestamp, text="50.0", confidence=0.9)]


def _discover(videos_dir: Path) -> list[Path]:
    return [
        path
        for path in sorted(videos_dir.iterdir())
        if path.is_file() and path.suffix.lower() in VIDEO_EXTS
    ]


def _assign(files: list[Path]) -> list[tuple[str, Path]]:
    assigned: list[tuple[str, Path]] = []
    used: set[str] = set()
    fallback = ["CAM-01", "CAM-02", "CAM-03", "CAM-04"]
    slots: list[tuple[str, Path] | None] = [None] * len(files)
    for index, path in enumerate(files):
        for pattern, camera_id in CAMERA_HINTS:
            if pattern.search(path.stem) and camera_id not in used:
                slots[index] = (camera_id, path)
                used.add(camera_id)
                break
    for index, path in enumerate(files):
        if slots[index] is not None:
            assigned.append(slots[index])  # type: ignore[arg-type]
            continue
        camera = next((c for c in fallback if c not in used), None)
        if camera is None:
            raise SystemExit(f"More than four videos; cannot assign {path.name}")
        used.add(camera)
        assigned.append((camera, path))
    return assigned


def _draw(frame, detections, role: str, camera_id: str):
    import cv2

    out = frame.copy()
    for item in detections:
        x1 = int(item.box.x1 * out.shape[1])
        y1 = int(item.box.y1 * out.shape[0])
        x2 = int(item.box.x2 * out.shape[1])
        y2 = int(item.box.y2 * out.shape[0])
        name = item.class_name.lower()
        color = (0, 220, 0) if ("inspect" in name or "opening" in name) else (0, 200, 255)
        label = f"{item.class_name} {item.confidence:.2f}"
        if item.track_id is not None:
            label = f"id:{item.track_id} | {label}"
            color = (0, 255, 255)
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        cv2.putText(out, label, (x1, max(22, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
    cv2.putText(
        out,
        f"{camera_id} / {role} LIVE",
        (12, 28),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.75,
        (255, 255, 255),
        2,
    )
    return out


class CameraWorker:
    def __init__(
        self,
        camera_id: str,
        role: str,
        video: Path,
        detector,
        pipeline,
        *,
        camera_name: str,
        zone: str,
        ingest_client,
        infer_scale: float,
        jpeg_quality: int,
        skip_frames: int,
    ) -> None:
        self.camera_id = camera_id
        self.role = role
        self.video = video
        self.detector = detector
        self.pipeline = pipeline
        self.camera_name = camera_name
        self.zone = zone
        self.ingest_client = ingest_client
        self.infer_scale = max(0.25, min(1.0, infer_scale))
        self.display_scale = max(0.25, min(1.0, infer_scale))
        self.jpeg_quality = jpeg_quality
        self.skip_frames = max(0, skip_frames)
        self._lock = threading.Lock()
        self._jpeg = b""
        self._stop = threading.Event()
        self._frame_count = 0
        self._det_count = 0
        self._posted = 0
        self.thread = threading.Thread(target=self._run, name=f"live-{camera_id}", daemon=True)

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self._stop.set()

    def latest_jpeg(self) -> bytes:
        with self._lock:
            return self._jpeg

    def _set_jpeg(self, frame) -> None:
        import cv2

        ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality])
        if not ok:
            return
        with self._lock:
            self._jpeg = buf.tobytes()

    def _publish(self, events) -> None:
        if not events or self.ingest_client is None:
            return
        from ptc_ai.event_mapper import to_platform_payload
        from ptc_ai.models import AnomalyCode

        for event in events:
            # Detect-only tracking timeouts without opening are not inspection outcomes.
            if event.reason_code == AnomalyCode.BALE_NOT_OPENED:
                print(
                    f"[{self.camera_id}] skipped {event.event_id} (track-only, never opened)",
                    flush=True,
                )
                continue
            payload = to_platform_payload(event, camera_name=self.camera_name, zone=self.zone)
            try:
                result = self.ingest_client.post_event(payload)
                self._posted += 1
                print(
                    f"[{self.camera_id}] ingested {payload['id']} outcome={payload['outcome']} "
                    f"status={result.get('status') or result.get('httpStatus')} total_posted={self._posted}",
                    flush=True,
                )
            except Exception as error:  # noqa: BLE001 - keep stream alive on ingest failures
                print(f"[{self.camera_id}] ingest failed for {payload.get('id')}: {error}", flush=True)

    def _run(self) -> None:
        import cv2

        while not self._stop.is_set():
            capture = cv2.VideoCapture(str(self.video))
            if not capture.isOpened():
                time.sleep(1.0)
                continue
            frame_index = 0
            last_detections = []
            started = time.time()
            while not self._stop.is_set():
                ok, frame = capture.read()
                if not ok:
                    break
                frame_index += 1
                timestamp = started + (frame_index / max(1.0, float(capture.get(cv2.CAP_PROP_FPS) or 12.0)))
                run_infer = self.skip_frames == 0 or (frame_index % (self.skip_frames + 1) == 1)
                if run_infer:
                    infer_frame = frame
                    if self.infer_scale != 1.0:
                        infer_frame = cv2.resize(
                            frame,
                            None,
                            fx=self.infer_scale,
                            fy=self.infer_scale,
                        )
                    last_detections = self.detector.infer(infer_frame)
                    self._det_count = len(last_detections)
                    events = self.pipeline.process_observations(infer_frame, last_detections, timestamp)
                    self._publish(events)
                    if frame_index <= 5 or frame_index % 30 == 0:
                        print(
                            f"[{self.camera_id}] frame={frame_index} detections={self._det_count} active={len(self.pipeline.active)}",
                            flush=True,
                        )
                display = frame
                if self.display_scale != 1.0:
                    display = cv2.resize(
                        frame,
                        None,
                        fx=self.display_scale,
                        fy=self.display_scale,
                    )
                annotated = _draw(display, last_detections, self.role, self.camera_id)
                self._set_jpeg(annotated)
                self._frame_count = frame_index
            # Flush open bale sessions at end of each video pass so KPIs update.
            end_ts = started + (frame_index / max(1.0, float(capture.get(cv2.CAP_PROP_FPS) or 12.0)))
            self._publish(self.pipeline.finish(end_ts))
            capture.release()
            time.sleep(0.2)


WORKERS: dict[str, CameraWorker] = {}


def build_handler() -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args) -> None:  # noqa: A003
            print(f"[live] {self.address_string()} {format % args}")

        def do_GET(self) -> None:  # noqa: N802
            path = self.path.split("?", 1)[0]
            if path == "/health":
                body = b'{"ok":true}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
                return

            if path.startswith("/stream/"):
                camera_id = path.removeprefix("/stream/").upper()
                worker = WORKERS.get(camera_id)
                if worker is None:
                    self.send_error(404, f"Unknown camera {camera_id}")
                    return
                self.send_response(200)
                self.send_header("Age", "0")
                self.send_header("Cache-Control", "no-cache, private")
                self.send_header("Pragma", "no-cache")
                self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                try:
                    while True:
                        jpeg = worker.latest_jpeg()
                        if not jpeg:
                            time.sleep(0.05)
                            continue
                        self.wfile.write(b"--frame\r\n")
                        self.wfile.write(b"Content-Type: image/jpeg\r\n")
                        self.wfile.write(f"Content-Length: {len(jpeg)}\r\n\r\n".encode())
                        self.wfile.write(jpeg)
                        self.wfile.write(b"\r\n")
                        time.sleep(0.04)
                except (BrokenPipeError, ConnectionResetError):
                    return

            self.send_error(404, "Not found")

    return Handler


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--videos-dir", type=Path, default=Path("../../videos"))
    parser.add_argument("--models-dir", type=Path, default=Path("../../models"))
    parser.add_argument("--config", type=Path, default=Path("config/poc.example.json"))
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8090)
    parser.add_argument("--infer-scale", type=float, default=0.5, help="Downscale before YOLO for FPS")
    parser.add_argument("--skip-frames", type=int, default=2, help="Reuse boxes for N frames")
    parser.add_argument("--jpeg-quality", type=int, default=70)
    parser.add_argument(
        "--ingest-url",
        default=os.environ.get("PTC_INGEST_URL", "http://127.0.0.1:4000"),
        help="Platform API base URL for event ingest",
    )
    parser.add_argument(
        "--ingest-token",
        default=os.environ.get("PTC_INGESTION_SERVICE_TOKEN", "local-dev-ingestion-token-32chars"),
        help="Bearer token matching platform INGESTION_SERVICE_TOKEN",
    )
    parser.add_argument("--no-ingest", action="store_true", help="Disable platform event posting")
    args = parser.parse_args()

    videos_dir = args.videos_dir.expanduser().resolve()
    models_dir = args.models_dir.expanduser().resolve()
    files = _discover(videos_dir)
    if not files:
        raise SystemExit(f"No videos in {videos_dir}")

    from dataclasses import replace

    from ptc_ai.camera_runtime import build_camera_detector
    from ptc_ai.config import AiConfig
    from ptc_ai.identity import BaleIdentityRegistry
    from ptc_ai.pipeline import RuntimePipeline
    from ptc_ai.platform_client import PlatformIngestClient
    from ptc_ai.weights import resolve_model_weights

    config = AiConfig.load(args.config)
    # Local live demo: finalize stale bale sessions sooner so KPIs populate during playback.
    # Widen ROIs to the full frame so tracked boxes from recorded clips enter sessions.
    full = ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0))
    widened = {
        camera_id: replace(
            rois,
            inspection=full,
            # Most of the frame counts as accepted lane; far-left is rejected.
            accepted=((0.30, 0.0), (1.0, 0.0), (1.0, 1.0), (0.30, 1.0)),
            rejected=((0.0, 0.0), (0.25, 0.0), (0.25, 1.0), (0.0, 1.0)),
            entry=full,
            scale_display=((0.70, 0.0), (1.0, 0.0), (1.0, 0.25), (0.70, 0.25)),
        )
        for camera_id, rois in config.cameras.items()
    }
    config = replace(
        config,
        cameras=widened,
        thresholds=replace(
            config.thresholds,
            session_timeout_seconds=45.0,
            ocr_stable_frames=2,
            inspection_min_seconds=0.4,
            grading_min_seconds=0.4,
        ),
    )
    track_weights, inspection_weights = resolve_model_weights(models_dir=models_dir)
    detect_conf = config.thresholds.detect_min_confidence
    inspect_conf = config.thresholds.inspect_min_confidence
    try:
        import torch  # type: ignore

        if torch.cuda.is_available():
            print(f"Inference device: cuda:0 ({torch.cuda.get_device_name(0)})", flush=True)
        else:
            print("Inference device: cpu (CUDA unavailable)", flush=True)
    except Exception as error:  # noqa: BLE001
        print(f"Inference device: cpu ({error})", flush=True)
    identity = BaleIdentityRegistry()
    ingest_client = None
    if not args.no_ingest and args.ingest_url and args.ingest_token:
        ingest_client = PlatformIngestClient(args.ingest_url, args.ingest_token)
        print(f"Event ingest -> {args.ingest_url}/api/ingest/events")
    else:
        print("Event ingest disabled")

    assignments = _assign(files)
    print("Live assignments:")
    for camera_id, path in assignments:
        role = config.cameras[camera_id].role
        camera_name, zone = CAMERA_META.get(camera_id, (camera_id, "Inspection Zone"))
        print(f"  {camera_id} ({role}) <- {path.name}")
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
            hand_reader=_EmptyHandReader(),
            display_reader=_LiveScaleReader(),
            identity=identity,
        )
        worker = CameraWorker(
            camera_id,
            role,
            path,
            detector,
            pipeline,
            camera_name=camera_name,
            zone=zone,
            ingest_client=ingest_client,
            infer_scale=args.infer_scale,
            jpeg_quality=args.jpeg_quality,
            skip_frames=args.skip_frames,
        )
        WORKERS[camera_id] = worker
        worker.start()

    server = ThreadingHTTPServer((args.host, args.port), build_handler())
    print(f"Live MJPEG on http://{args.host}:{args.port}/stream/CAM-01 .. CAM-04")
    print(f"Confidence detect>={detect_conf:.2f} inspect>={inspect_conf:.2f}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping...")
    finally:
        for worker in WORKERS.values():
            worker.stop()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
