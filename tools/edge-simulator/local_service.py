#!/usr/bin/env python3
"""Long-running local simulator/adapter service for the single-machine PTC deployment."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import signal
import time
import urllib.error
import urllib.request
from pathlib import Path

from ptc_edge_spool import (
    SpoolStore,
    deterministic_camera_status,
    deterministic_event,
    deterministic_health,
    flush,
    http_sender,
)

CAMERAS = ("CAM-01", "CAM-02", "CAM-03", "CAM-04")
SCENARIOS = ("completed", "missed", "incomplete", "unresolved")
PNG_FIXTURE = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
STOP = False


def env_int(name: str, default: int, minimum: int = 1) -> int:
    raw = os.environ.get(name, str(default))
    value = int(raw)
    if value < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return value


def handle_signal(_signum: int, _frame: object) -> None:
    global STOP
    STOP = True


def seed_cycle(store: SpoolStore, sequence_base: int) -> list[dict]:
    events: list[dict] = []
    for offset, (camera_id, scenario) in enumerate(zip(CAMERAS, SCENARIOS, strict=True), start=1):
        sequence = sequence_base + offset
        event = deterministic_event(camera_id, scenario, sequence)
        store.enqueue("event", event)
        events.append(event)
        camera = deterministic_camera_status(camera_id, sequence, "online")
        store.enqueue("camera", camera, f"SIM-CAMERA-{camera_id}-{sequence:010d}")
    for offset, source in enumerate(("camera-ingest", "edge-spool", "evidence-storage", "local-database"), start=20):
        store.enqueue("health", deterministic_health(source, sequence_base + offset))
    return events


def upload_evidence(api_origin: str, token: str, event: dict, timeout: int) -> tuple[int, str]:
    event_id = str(event["id"])
    evidence_id = str(event["evidence"]["id"])
    checksum = hashlib.sha256(PNG_FIXTURE).hexdigest()
    request = urllib.request.Request(
        f"{api_origin.rstrip('/')}/api/ingest/evidence/{event_id}",
        data=PNG_FIXTURE,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "image/png",
            "Content-Length": str(len(PNG_FIXTURE)),
            "X-Evidence-ID": evidence_id,
            "X-Checksum-SHA256": checksum,
            "X-Correlation-ID": f"local-evidence-{event_id}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")
    except (OSError, urllib.error.URLError, TimeoutError) as error:
        return 0, str(error)


def main() -> int:
    mode = os.environ.get("PTC_RUNTIME_MODE", "simulator").strip().lower()
    if mode not in {"simulator", "hardware-ready"}:
        raise ValueError("PTC_RUNTIME_MODE must be simulator or hardware-ready")
    database = Path(os.environ.get("EDGE_SPOOL_DATABASE", "/var/lib/ptc-bale/spool/spool.sqlite3"))
    api_origin = os.environ.get("API_ORIGIN", "http://api:4000")
    token = os.environ.get("INGESTION_SERVICE_TOKEN", "")
    if len(token) < 24:
        raise ValueError("INGESTION_SERVICE_TOKEN is missing or too short")
    interval = env_int("EDGE_FLUSH_INTERVAL_SECONDS", 5)
    timeout = env_int("EDGE_HTTP_TIMEOUT_SECONDS", 15)
    sequence_base = env_int("SIMULATOR_SEQUENCE_BASE", 1000, 0)
    generate_every = env_int("SIMULATOR_GENERATE_EVERY_SECONDS", 300)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    store = SpoolStore(database)
    sender = http_sender(api_origin, token, timeout)
    last_generated = 0.0
    events: list[dict] = []
    try:
        while not STOP:
            now = time.monotonic()
            if mode == "simulator" and (not events or now - last_generated >= generate_every):
                cycle = int(now // generate_every)
                events = seed_cycle(store, sequence_base + cycle * 100)
                last_generated = now
            result = flush(store, sender, 250)
            evidence = {"available": 0, "retry": 0, "rejected": 0}
            if mode == "simulator":
                for event in events:
                    status, _body = upload_evidence(api_origin, token, event, timeout)
                    if status in {200, 201}:
                        evidence["available"] += 1
                    elif status in {0, 404, 429, 500, 502, 503, 504}:
                        evidence["retry"] += 1
                    else:
                        evidence["rejected"] += 1
            print(
                json.dumps(
                    {
                        "level": "info",
                        "message": "local edge delivery cycle",
                        "mode": mode,
                        "flush": result,
                        "evidence": evidence,
                        "spool": store.counts(),
                    },
                    sort_keys=True,
                ),
                flush=True,
            )
            for _ in range(interval):
                if STOP:
                    break
                time.sleep(1)
        return 0
    finally:
        store.close()


if __name__ == "__main__":
    raise SystemExit(main())
