from __future__ import annotations

from datetime import datetime, timezone

from .models import InspectionEvent

PLATFORM_EVENT_KEYS = frozenset(
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


def _iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")


def _relative(start: float, current: float | None) -> str | None:
    if current is None:
        return None
    seconds = max(0, int(round(current - start)))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def to_audit_payload(event: InspectionEvent) -> dict:
    """Return the complete local AI record.

    This sidecar record is intentionally not sent to the current strict platform
    ingestion endpoint. It may be retained only in approved protected storage.
    """

    return {
        "eventId": event.event_id,
        "sessionId": event.session_id,
        "cameraId": event.camera_id,
        "baleId": event.bale_id,
        "startedAt": _iso(event.started_at),
        "endedAt": _iso(event.ended_at),
        "outcome": event.outcome.value,
        "reasonCode": event.reason_code.value,
        "confidence": event.confidence,
        "modelVersion": event.model_version,
        "ruleVersion": event.rule_version,
        "configVersion": event.config_version,
        "schemaVersion": event.schema_version,
        "metadata": dict(event.metadata),
        "steps": [
            {
                "key": step.key,
                "label": step.label,
                "state": step.state,
                "timestamp": _iso(step.timestamp) if step.timestamp is not None else None,
                "confidence": step.confidence,
                "evidenceRef": step.evidence_ref,
                "metadata": dict(step.metadata),
            }
            for step in event.steps
        ],
    }


def to_platform_payload(event: InspectionEvent, camera_name: str | None = None, zone: str = "Inspection Zone") -> dict:
    """Map an AI event to the current strict `/api/ingest/events` contract."""

    reason_code = event.reason_code.value
    reason_text = "Inspection completed" if reason_code == "NONE" else reason_code.replace("_", " ").title()
    route = event.metadata.get("route")
    weight = event.metadata.get("weight")
    unit = event.metadata.get("weightUnit")
    details = [
        f"Session {event.session_id}",
        f"Bale {event.bale_id}",
        f"Reason {reason_code}",
    ]
    if route:
        details.append(f"Route {route}")
    if weight is not None:
        details.append(f"Weight {weight} {unit or ''}".strip())

    payload = {
        "id": event.event_id,
        "cameraId": event.camera_id,
        "cameraName": camera_name or event.camera_id,
        "zone": zone,
        "timestamp": _iso(event.ended_at),
        "outcome": event.outcome.value,
        "reason": reason_code if reason_code != "NONE" else reason_text,
        "confidence": int(round(event.confidence * 100)),
        "summary": " | ".join(details),
        "modelVersion": event.model_version,
        "ruleVersion": event.rule_version,
        "configVersion": event.config_version,
        "edgeVersion": "ptc-ai-runtime-v1",
        "schemaVersion": event.schema_version,
        "source": "edge",
        "steps": [
            {
                "label": step.label,
                "state": step.state,
                **({"time": relative} if (relative := _relative(event.started_at, step.timestamp)) else {}),
            }
            for step in event.steps
        ],
        "evidence": {
            "id": f"EVID-{event.event_id}",
            "state": "pending",
            "type": "clip",
            "mimeType": "video/mp4",
            "storageKey": f"pending/{event.event_id}.mp4",
        },
    }
    if set(payload) != PLATFORM_EVENT_KEYS:
        raise AssertionError("Platform event mapper drifted from the strict ingestion contract")
    return payload
