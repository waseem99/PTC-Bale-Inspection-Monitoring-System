#!/usr/bin/env python3
"""PTC deployment and deterministic synthetic acceptance utilities.

The synthetic scenarios validate platform behavior and workflow plumbing only.
They must never be presented as actual PTC model-accuracy evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

STRICT_EVENT_KEYS = frozenset(
    {
        "id",
        "cameraId",
        "cameraName",
        "zone",
        "timestamp",
        "outcome",
        "reason",
        "confidence",
        "summary",
        "modelVersion",
        "ruleVersion",
        "configVersion",
        "edgeVersion",
        "schemaVersion",
        "source",
        "steps",
        "evidence",
    }
)
STEP_LABELS = (
    "Bale entered inspection zone",
    "Bale cut/opened",
    "Proper hand inspection completed",
    "Grading completed",
    "Routed to accepted/rejected lane",
    "Weight read from scale display",
)
VALID_OUTCOMES = {"completed", "missed", "incomplete", "unresolved"}
VALID_STEP_STATES = {"complete", "failed", "unknown"}
REQUIRED_SCENARIO_CODES = {
    "VALID_ACCEPTED",
    "VALID_REJECTED_LEFT",
    "BALE_NOT_OPENED",
    "HAND_INSPECTION_MISSING",
    "HAND_INSPECTION_INCOMPLETE",
    "GRADING_MISSING",
    "ROUTING_MISSING",
    "ROUTING_MISMATCH",
    "WEIGHT_MISSING",
    "WEIGHT_UNREADABLE",
    "WEIGHT_UNSTABLE",
    "TRACK_ASSOCIATION_AMBIGUOUS",
    "INSUFFICIENT_VISIBILITY",
    "MODEL_FAILURE_OPERATIONAL",
}
PNG_FIXTURE = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010804000000b51c0c"
    "020000000b4944415478da6364f80f00010501012718e3660000000049454e44ae426082"
)


class AcceptanceError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise AcceptanceError(f"File not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise AcceptanceError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise AcceptanceError(f"JSON root must be an object: {path}")
    return value


def load_manifest(path: Path) -> dict[str, Any]:
    manifest = _load_json(path)
    scenarios = manifest.get("scenarios")
    if not isinstance(scenarios, list) or not scenarios:
        raise AcceptanceError("Scenario manifest must contain a non-empty scenarios array")
    codes: list[str] = []
    for index, raw in enumerate(scenarios, start=1):
        if not isinstance(raw, dict):
            raise AcceptanceError(f"Scenario {index} must be an object")
        code = str(raw.get("code") or "")
        outcome = str(raw.get("outcome") or "")
        reason = str(raw.get("reason") or "")
        confidence = raw.get("confidence")
        states = raw.get("stepStates")
        if not code or len(code) > 48:
            raise AcceptanceError(f"Scenario {index} has an invalid code")
        if outcome not in VALID_OUTCOMES:
            raise AcceptanceError(f"Scenario {code} has invalid outcome {outcome!r}")
        if not reason or len(reason) > 200:
            raise AcceptanceError(f"Scenario {code} has an invalid reason")
        if not isinstance(confidence, int) or not 0 <= confidence <= 100:
            raise AcceptanceError(f"Scenario {code} confidence must be an integer from 0 to 100")
        if not isinstance(states, list) or len(states) != len(STEP_LABELS):
            raise AcceptanceError(f"Scenario {code} must define exactly {len(STEP_LABELS)} step states")
        if any(state not in VALID_STEP_STATES for state in states):
            raise AcceptanceError(f"Scenario {code} contains an unsupported step state")
        codes.append(code)
    if len(codes) != len(set(codes)):
        raise AcceptanceError("Scenario codes must be unique")
    missing = sorted(REQUIRED_SCENARIO_CODES - set(codes))
    if missing:
        raise AcceptanceError(f"Required scenarios are missing: {', '.join(missing)}")
    return manifest


def build_event(scenario: dict[str, Any], sequence: int) -> dict[str, Any]:
    code = str(scenario["code"])
    event_id = f"TEST-{sequence:03d}-{code}"
    if len(event_id) > 64:
        raise AcceptanceError(f"Generated event ID exceeds platform limit: {event_id}")
    camera_number = sequence % 4 + 1
    camera_id = f"CAM-{camera_number:02d}"
    timestamp = datetime(2026, 1, 2, 0, 0, tzinfo=timezone.utc) + timedelta(seconds=sequence)
    route = scenario.get("route")
    weight = scenario.get("weight")
    details = [
        "Synthetic acceptance fixture",
        f"Scenario {code}",
        f"Reason {scenario['reason']}",
    ]
    if route:
        details.append(f"Route {route}")
    if weight is not None:
        details.append(f"Weight {weight} kg")
    steps = [
        {"label": label, "state": state, "time": f"00:{index * 2:02d}"}
        for index, (label, state) in enumerate(zip(STEP_LABELS, scenario["stepStates"], strict=True))
    ]
    payload = {
        "id": event_id,
        "cameraId": camera_id,
        "cameraName": f"Camera {camera_number}",
        "zone": f"Inspection Zone {camera_number}",
        "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
        "outcome": scenario["outcome"],
        "reason": scenario["reason"],
        "confidence": scenario["confidence"],
        "summary": " | ".join(details),
        "modelVersion": "synthetic-testing-only-v1",
        "ruleVersion": "ptc-sop-v1",
        "configVersion": "ptc-camera-roi-template-v1",
        "edgeVersion": "testing-readiness-v1",
        "schemaVersion": 1,
        "source": "simulator",
        "steps": steps,
        "evidence": {
            "id": f"EVID-{event_id}",
            "state": "pending",
            "type": "snapshot",
            "mimeType": "image/png",
            "storageKey": f"pending/{event_id}.png",
        },
    }
    validate_event(payload)
    return payload


def generate_events(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    return [build_event(scenario, index) for index, scenario in enumerate(manifest["scenarios"], start=1)]


def validate_event(payload: dict[str, Any]) -> None:
    if set(payload) != STRICT_EVENT_KEYS:
        missing = sorted(STRICT_EVENT_KEYS - set(payload))
        extra = sorted(set(payload) - STRICT_EVENT_KEYS)
        raise AcceptanceError(f"Event keys do not match strict contract; missing={missing}, extra={extra}")
    if payload["outcome"] not in VALID_OUTCOMES:
        raise AcceptanceError(f"Unsupported event outcome: {payload['outcome']}")
    if payload["source"] != "simulator":
        raise AcceptanceError("Synthetic acceptance events must use source=simulator")
    if not isinstance(payload["confidence"], int) or not 0 <= payload["confidence"] <= 100:
        raise AcceptanceError("Event confidence must be an integer from 0 to 100")
    steps = payload["steps"]
    if not isinstance(steps, list) or len(steps) != len(STEP_LABELS):
        raise AcceptanceError("Event must contain the complete six-step workflow")
    for expected_label, step in zip(STEP_LABELS, steps, strict=True):
        if not isinstance(step, dict) or step.get("label") != expected_label:
            raise AcceptanceError("Event step labels do not match the finalized workflow")
        if step.get("state") not in VALID_STEP_STATES:
            raise AcceptanceError("Event contains an invalid step state")


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row, sort_keys=True) + "\n" for row in rows), encoding="utf-8")


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as exc:
            raise AcceptanceError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
        if not isinstance(value, dict):
            raise AcceptanceError(f"JSONL row must be an object at {path}:{line_number}")
        validate_event(value)
        rows.append(value)
    if not rows:
        raise AcceptanceError(f"No events found in {path}")
    ids = [str(row["id"]) for row in rows]
    if len(ids) != len(set(ids)):
        raise AcceptanceError("Event IDs must be unique")
    return rows


def offline_record(manifest_path: Path, output_dir: Path) -> dict[str, Any]:
    manifest = load_manifest(manifest_path)
    events = generate_events(manifest)
    events_path = output_dir / "synthetic-events.jsonl"
    expected_path = output_dir / "expected-results.json"
    write_jsonl(events_path, events)
    read_jsonl(events_path)
    expected = {
        "manifestVersion": manifest["manifestVersion"],
        "generatedAt": utc_now(),
        "scenarioCount": len(events),
        "eventIds": [event["id"] for event in events],
        "expected": [
            {"id": event["id"], "outcome": event["outcome"], "reason": event["reason"]}
            for event in events
        ],
        "warning": "Synthetic fixtures validate platform plumbing only; they are not actual PTC AI accuracy evidence.",
    }
    write_json(expected_path, expected)
    record = {
        "status": "passed",
        "mode": "offline",
        "generatedAt": utc_now(),
        "manifest": str(manifest_path),
        "events": str(events_path),
        "expectedResults": str(expected_path),
        "scenarioCount": len(events),
        "checks": {
            "manifestValidation": "passed",
            "strictEventContract": "passed",
            "requiredScenarioCoverage": "passed",
            "deterministicFixtureGeneration": "passed",
        },
        "limitations": [
            "No actual factory footage was processed.",
            "No trained PTC model accuracy was measured.",
            "No deployed backend was contacted.",
        ],
    }
    write_json(output_dir / "offline-acceptance-record.json", record)
    return record


@dataclass(slots=True)
class Response:
    status: int
    headers: dict[str, str]
    body: bytes

    def json(self) -> Any:
        try:
            return json.loads(self.body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise AcceptanceError(f"Response is not valid JSON (HTTP {self.status})") from exc


class ApiClient:
    def __init__(self, base_url: str, timeout: int = 20) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

    def request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        raw_body: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> Response:
        if json_body is not None and raw_body is not None:
            raise ValueError("Provide either json_body or raw_body, not both")
        outgoing_headers = {"Accept": "application/json", "X-Correlation-ID": "testing-readiness-client"}
        if headers:
            outgoing_headers.update(headers)
        body = raw_body
        if json_body is not None:
            body = json.dumps(json_body).encode("utf-8")
            outgoing_headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            f"{self.base_url}{path}", data=body, headers=outgoing_headers, method=method
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                return Response(response.status, dict(response.headers.items()), response.read())
        except urllib.error.HTTPError as error:
            return Response(error.code, dict(error.headers.items()), error.read())
        except (OSError, urllib.error.URLError, TimeoutError) as error:
            raise AcceptanceError(f"Request failed: {method} {path}: {error}") from error

    def require(self, method: str, path: str, expected: set[int], **kwargs: Any) -> Response:
        response = self.request(method, path, **kwargs)
        if response.status not in expected:
            detail = response.body.decode("utf-8", errors="replace")[:1000]
            raise AcceptanceError(f"Unexpected HTTP {response.status} for {method} {path}: {detail}")
        return response

    def login(self, username: str, password: str) -> dict[str, Any]:
        response = self.require(
            "POST",
            "/api/auth/login",
            {200},
            json_body={"username": username, "password": password},
            headers={"Origin": self.base_url},
        )
        payload = response.json()
        role = str(payload.get("user", {}).get("role", ""))
        if role != username:
            raise AcceptanceError(f"Expected {username} role, got {role!r}")
        return payload


def _required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise AcceptanceError(f"Environment variable {name} is required")
    return value


def deployment_record(output_path: Path) -> dict[str, Any]:
    base_url = _required_env("PTC_BASE_URL")
    viewer_password = _required_env("SEED_VIEWER_PASSWORD")
    client = ApiClient(base_url)
    checks: dict[str, Any] = {}
    checks["proxyHealth"] = client.require("GET", "/healthz", {200}).status
    client.login("viewer", viewer_password)
    for name, path in (
        ("session", "/api/auth/me"),
        ("release", "/api/system/release"),
        ("cameras", "/api/cameras"),
        ("health", "/api/health"),
        ("reports", "/api/reports/summary"),
        ("diagnostics", "/api/operations/diagnostics"),
    ):
        checks[name] = client.require("GET", path, {200}).status
    release = client.require("GET", "/api/system/release", {200}).json()
    record = {
        "status": "passed",
        "mode": "deployment",
        "generatedAt": utc_now(),
        "baseUrl": urllib.parse.urlsplit(base_url)._replace(query="", fragment="").geturl(),
        "checks": checks,
        "releaseIdentity": release,
        "secretValuesRecorded": False,
    }
    write_json(output_path, record)
    return record


def _ingest(client: ApiClient, token: str, event: dict[str, Any]) -> Response:
    return client.request(
        "POST",
        "/api/ingest/events",
        json_body=event,
        headers={"Authorization": f"Bearer {token}"},
    )


def integrated_record(manifest_path: Path, output_path: Path) -> dict[str, Any]:
    base_url = _required_env("PTC_BASE_URL")
    token = _required_env("INGESTION_SERVICE_TOKEN")
    viewer_password = _required_env("SEED_VIEWER_PASSWORD")
    supervisor_password = _required_env("SEED_SUPERVISOR_PASSWORD")
    manifest = load_manifest(manifest_path)
    events = generate_events(manifest)
    client = ApiClient(base_url)
    ingestion_results: list[dict[str, Any]] = []
    for event in events:
        response = _ingest(client, token, event)
        if response.status not in {200, 202}:
            raise AcceptanceError(
                f"Ingestion failed for {event['id']} with HTTP {response.status}: "
                f"{response.body.decode('utf-8', errors='replace')[:500]}"
            )
        ingestion_results.append({"id": event["id"], "status": response.status})

    replay = _ingest(client, token, events[0])
    if replay.status != 200:
        raise AcceptanceError(f"Exact replay must return 200, got {replay.status}")
    conflict_event = dict(events[0])
    conflict_event["summary"] = str(conflict_event["summary"]) + " | conflicting replay"
    conflict = _ingest(client, token, conflict_event)
    if conflict.status != 409:
        raise AcceptanceError(f"Conflicting replay must return 409, got {conflict.status}")

    evidence_event = events[0]
    checksum = hashlib.sha256(PNG_FIXTURE).hexdigest()
    evidence = client.require(
        "POST",
        f"/api/ingest/evidence/{urllib.parse.quote(str(evidence_event['id']), safe='')}",
        {200, 201},
        raw_body=PNG_FIXTURE,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "image/png",
            "Content-Length": str(len(PNG_FIXTURE)),
            "X-Evidence-ID": str(evidence_event["evidence"]["id"]),
            "X-Checksum-SHA256": checksum,
        },
    )

    client.login("viewer", viewer_password)
    observed: list[dict[str, Any]] = []
    for event in events:
        payload = client.require(
            "GET", f"/api/events/{urllib.parse.quote(str(event['id']), safe='')}", {200}
        ).json()
        if payload.get("outcome") != event["outcome"] or payload.get("reason") != event["reason"]:
            raise AcceptanceError(f"Stored event does not match expected result for {event['id']}")
        observed.append(
            {"id": event["id"], "outcome": payload.get("outcome"), "reason": payload.get("reason")}
        )
    evidence_meta = client.require(
        "GET", f"/api/events/{urllib.parse.quote(str(evidence_event['id']), safe='')}/evidence", {200}
    ).json()
    evidence_id = str(evidence_meta.get("id") or evidence_event["evidence"]["id"])
    evidence_content = client.require(
        "GET", f"/api/evidence/{urllib.parse.quote(evidence_id, safe='')}/content", {200, 206}
    )
    if evidence_content.body != PNG_FIXTURE:
        raise AcceptanceError("Protected evidence content does not match uploaded fixture")
    csv_export = client.require(
        "POST",
        "/api/exports/events",
        {200},
        json_body={"format": "csv"},
        headers={"Origin": base_url},
    )
    if b"TEST-" not in csv_export.body:
        raise AcceptanceError("CSV export does not contain synthetic acceptance events")
    pdf = client.require("GET", "/api/reports/pdf", {200})
    if not pdf.body.startswith(b"%PDF"):
        raise AcceptanceError("PDF report response does not contain a PDF signature")

    supervisor = ApiClient(base_url)
    supervisor.login("supervisor", supervisor_password)
    target = supervisor.require(
        "GET", f"/api/events/{urllib.parse.quote(str(events[0]['id']), safe='')}", {200}
    ).json()
    version = int(target.get("version") or 0)
    if version < 1:
        raise AcceptanceError("Event version is missing or invalid")
    reviewed = supervisor.require(
        "PATCH",
        f"/api/events/{urllib.parse.quote(str(events[0]['id']), safe='')}/review",
        {200},
        json_body={
            "reviewStatus": "confirmed",
            "remarks": "Synthetic acceptance fixture reviewed by automated test.",
            "expectedVersion": version,
        },
        headers={"Origin": base_url},
    ).json()
    if reviewed.get("reviewStatus") != "confirmed":
        raise AcceptanceError("Supervisor review was not persisted")
    audit = supervisor.require(
        "GET", f"/api/events/{urllib.parse.quote(str(events[0]['id']), safe='')}/audit", {200}
    ).json()
    if not isinstance(audit, list) or not audit:
        raise AcceptanceError("Audit history was not created")

    record = {
        "status": "passed",
        "mode": "integrated-synthetic",
        "generatedAt": utc_now(),
        "scenarioCount": len(events),
        "ingestion": ingestion_results,
        "exactReplayStatus": replay.status,
        "conflictingReplayStatus": conflict.status,
        "evidenceUploadStatus": evidence.status,
        "storedResults": observed,
        "reviewStatus": reviewed.get("reviewStatus"),
        "auditEntries": len(audit),
        "csvBytes": len(csv_export.body),
        "pdfBytes": len(pdf.body),
        "secretValuesRecorded": False,
        "warning": "Synthetic integration success is not actual PTC AI accuracy evidence.",
    }
    write_json(output_path, record)
    return record


def build_parser() -> argparse.ArgumentParser:
    default_manifest = Path(__file__).with_name("scenarios.json")
    parser = argparse.ArgumentParser(description="PTC deterministic testing-readiness utilities")
    sub = parser.add_subparsers(dest="command", required=True)

    offline = sub.add_parser("offline", help="Generate and validate the complete synthetic scenario package")
    offline.add_argument("--manifest", type=Path, default=default_manifest)
    offline.add_argument("--output", type=Path, required=True)

    validate = sub.add_parser("validate", help="Validate an existing strict event JSONL file")
    validate.add_argument("--events", type=Path, required=True)

    deployment = sub.add_parser("deployment", help="Verify an accessible deployed platform using environment variables")
    deployment.add_argument("--output", type=Path, required=True)

    integrated = sub.add_parser("integrated", help="Run synthetic end-to-end deployed UAT using environment variables")
    integrated.add_argument("--manifest", type=Path, default=default_manifest)
    integrated.add_argument("--output", type=Path, required=True)
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "offline":
            record = offline_record(args.manifest, args.output)
        elif args.command == "validate":
            rows = read_jsonl(args.events)
            record = {"status": "passed", "events": len(rows)}
        elif args.command == "deployment":
            record = deployment_record(args.output)
        elif args.command == "integrated":
            record = integrated_record(args.manifest, args.output)
        else:
            raise AssertionError("Unhandled command")
    except AcceptanceError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    print(json.dumps(record, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
