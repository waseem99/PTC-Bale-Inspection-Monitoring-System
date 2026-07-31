#!/usr/bin/env python3
"""Durable PTC edge simulator/spool using only the Python standard library."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable

TERMINAL_HTTP = {400, 401, 403, 404, 409, 413, 415, 422}
ACK_HTTP = {200, 201, 202}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def deterministic_event(camera_id: str, scenario: str, sequence: int) -> dict:
    if scenario not in {"completed", "missed", "incomplete", "unresolved"}:
        raise ValueError("Unsupported scenario")
    event_id = f"SIM-{camera_id}-{scenario}-{sequence:06d}"
    confidence = 40 if scenario == "unresolved" else 92
    return {
        "id": event_id,
        "cameraId": camera_id,
        "cameraName": camera_id.replace("CAM-", "Camera "),
        "zone": f"Inspection Zone {camera_id[-1]}",
        "timestamp": datetime(2026, 1, 1, 0, 0, sequence % 60, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
        "outcome": scenario,
        "reason": "Synthetic completed workflow" if scenario == "completed" else f"Synthetic {scenario} workflow",
        "confidence": confidence,
        "summary": "Deterministic edge-spool fixture. This is not actual AI inference.",
        "modelVersion": "simulator-v1",
        "ruleVersion": "simulator-rules-v1",
        "configVersion": "camera-config-v1",
        "edgeVersion": "edge-spool-v1",
        "schemaVersion": 1,
        "source": "simulator",
        "steps": [
            {"label": "Bale entered inspection zone", "state": "complete", "time": "00:00"},
            {"label": "Inspection started", "state": "failed" if scenario == "missed" else "complete", "time": "00:02"},
            {"label": "Opening/checking observed", "state": "complete" if scenario == "completed" else "unknown" if scenario == "unresolved" else "failed", "time": "00:05"},
        ],
    }


def deterministic_health(source: str, sequence: int, state: str = "healthy") -> dict:
    if state not in {"healthy", "warning", "critical", "neutral"}:
        raise ValueError("Unsupported health state")
    return {
        "id": f"SIM-HEALTH-{source.upper().replace('-', '_')}",
        "label": source.replace("-", " ").title(),
        "value": "ready" if state == "healthy" else state,
        "detail": "Deterministic simulator health record.",
        "state": state,
        "checkedAt": datetime(2026, 1, 1, 0, 0, sequence % 60, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "simulator",
        "sequence": sequence,
    }


@dataclass
class SpoolItem:
    item_id: str
    kind: str
    payload: dict
    attempts: int


class SpoolStore:
    def __init__(self, database: Path):
        database.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(database)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("PRAGMA synchronous=FULL")
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS spool (
              item_id TEXT PRIMARY KEY,
              kind TEXT NOT NULL CHECK(kind IN ('event','health')),
              payload TEXT NOT NULL,
              state TEXT NOT NULL CHECK(state IN ('pending','acknowledged','rejected')) DEFAULT 'pending',
              attempts INTEGER NOT NULL DEFAULT 0,
              next_attempt REAL NOT NULL DEFAULT 0,
              last_error TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS spool_pending_idx ON spool(state, next_attempt, created_at);
            """
        )
        self.connection.commit()

    def close(self) -> None:
        self.connection.close()

    def enqueue(self, kind: str, payload: dict) -> str:
        item_id = str(payload.get("id") or uuid.uuid4())
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        now = utc_now()
        existing = self.connection.execute("SELECT payload FROM spool WHERE item_id = ?", (item_id,)).fetchone()
        if existing:
            if existing["payload"] != encoded:
                raise ValueError(f"Spool ID {item_id} already exists with a different payload")
            return item_id
        self.connection.execute(
            "INSERT INTO spool(item_id, kind, payload, created_at, updated_at) VALUES(?,?,?,?,?)",
            (item_id, kind, encoded, now, now),
        )
        self.connection.commit()
        return item_id

    def pending(self, limit: int = 100) -> list[SpoolItem]:
        rows = self.connection.execute(
            "SELECT item_id, kind, payload, attempts FROM spool WHERE state='pending' AND next_attempt <= ? ORDER BY created_at, item_id LIMIT ?",
            (time.time(), limit),
        ).fetchall()
        return [SpoolItem(row["item_id"], row["kind"], json.loads(row["payload"]), row["attempts"]) for row in rows]

    def acknowledge(self, item_id: str) -> None:
        self.connection.execute(
            "UPDATE spool SET state='acknowledged', attempts=attempts+1, last_error=NULL, updated_at=? WHERE item_id=?",
            (utc_now(), item_id),
        )
        self.connection.commit()

    def reject(self, item_id: str, error: str) -> None:
        self.connection.execute(
            "UPDATE spool SET state='rejected', attempts=attempts+1, last_error=?, updated_at=? WHERE item_id=?",
            (error[:1000], utc_now(), item_id),
        )
        self.connection.commit()

    def retry(self, item_id: str, attempts: int, error: str) -> None:
        delay = min(300, 2 ** min(attempts, 8))
        self.connection.execute(
            "UPDATE spool SET attempts=attempts+1, next_attempt=?, last_error=?, updated_at=? WHERE item_id=?",
            (time.time() + delay, error[:1000], utc_now(), item_id),
        )
        self.connection.commit()

    def counts(self) -> dict[str, int]:
        rows = self.connection.execute("SELECT state, COUNT(*) AS total FROM spool GROUP BY state").fetchall()
        return {row["state"]: row["total"] for row in rows}


Sender = Callable[[str, dict], tuple[int, str]]


def http_sender(api_origin: str, token: str, timeout: int = 15) -> Sender:
    origin = api_origin.rstrip("/")

    def send(kind: str, payload: dict) -> tuple[int, str]:
        endpoint = "/api/ingest/events" if kind == "event" else "/api/ingest/health"
        request = urllib.request.Request(
            f"{origin}{endpoint}",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Correlation-ID": f"edge-{uuid.uuid4()}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.status, response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as error:
            return error.code, error.read().decode("utf-8", errors="replace")

    return send


def flush(store: SpoolStore, sender: Sender, limit: int = 100) -> dict[str, int]:
    result = {"acknowledged": 0, "rejected": 0, "retry": 0}
    for item in store.pending(limit):
        try:
            status, body = sender(item.kind, item.payload)
            if status in ACK_HTTP:
                store.acknowledge(item.item_id)
                result["acknowledged"] += 1
            elif status in TERMINAL_HTTP:
                store.reject(item.item_id, f"HTTP {status}: {body}")
                result["rejected"] += 1
            else:
                store.retry(item.item_id, item.attempts + 1, f"HTTP {status}: {body}")
                result["retry"] += 1
        except (OSError, urllib.error.URLError, TimeoutError) as error:
            store.retry(item.item_id, item.attempts + 1, str(error))
            result["retry"] += 1
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="PTC deterministic edge simulator and durable spool")
    parser.add_argument("--database", type=Path, default=Path("./ptc-edge-spool.sqlite3"))
    sub = parser.add_subparsers(dest="command", required=True)
    event = sub.add_parser("enqueue-event")
    event.add_argument("--camera", required=True, choices=["CAM-01", "CAM-02", "CAM-03", "CAM-04"])
    event.add_argument("--scenario", required=True, choices=["completed", "missed", "incomplete", "unresolved"])
    event.add_argument("--sequence", required=True, type=int)
    health = sub.add_parser("enqueue-health")
    health.add_argument("--source", required=True)
    health.add_argument("--sequence", required=True, type=int)
    health.add_argument("--state", default="healthy", choices=["healthy", "warning", "critical", "neutral"])
    send = sub.add_parser("flush")
    send.add_argument("--api-origin", required=True)
    send.add_argument("--token", required=True)
    send.add_argument("--limit", type=int, default=100)
    sub.add_parser("status")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    store = SpoolStore(args.database)
    try:
        if args.command == "enqueue-event":
            print(store.enqueue("event", deterministic_event(args.camera, args.scenario, args.sequence)))
        elif args.command == "enqueue-health":
            print(store.enqueue("health", deterministic_health(args.source, args.sequence, args.state)))
        elif args.command == "flush":
            print(json.dumps(flush(store, http_sender(args.api_origin, args.token), args.limit), sort_keys=True))
        elif args.command == "status":
            print(json.dumps(store.counts(), sort_keys=True))
        return 0
    finally:
        store.close()


if __name__ == "__main__":
    sys.exit(main())
