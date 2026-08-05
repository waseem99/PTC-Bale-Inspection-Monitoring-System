from __future__ import annotations

from datetime import datetime, timezone

from .models import InspectionEvent


def _iso(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace("+00:00", "Z")


def _relative(start: float, current: float | None) -> str | None:
    if current is None:
        return None
    seconds = max(0, int(round(current - start)))
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def to_platform_payload(event: InspectionEvent, camera_name: str | None = None, zone: str = "Inspection Zone") -> dict:
    reason_text = "Inspection completed" if event.reason_code.value == "NONE" else event.reason_code.value.replace("_", " ").title()
    return {
        "id": event.event_id,
        "cameraId": event.camera_id,
        "cameraName": camera_name or event.camera_id,
        "zone": zone,
        "timestamp": _iso(event.ended_at),
        "outcome": event.outcome.value,
        "reason": reason_text,
        "confidence": int(round(event.confidence * 100)),
        "summary": f"Bale {event.bale_id}: {reason_text}",
        "modelVersion": event.model_version,
        "ruleVersion": event.rule_version,
        "configVersion": event.config_version,
        "edgeVersion": "ptc-ai-runtime-v1",
        "schemaVersion": event.schema_version,
        "source": event.source,
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
        "aiMetadata": {
            "sessionId": event.session_id,
            "baleId": event.bale_id,
            "reasonCode": event.reason_code.value,
            **event.metadata,
        },
    }
