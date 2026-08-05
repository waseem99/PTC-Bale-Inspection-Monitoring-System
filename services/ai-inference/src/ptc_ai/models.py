from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ObservationKind(StrEnum):
    BALE_ENTERED = "bale.entered"
    BALE_OPENED = "bale.opened"
    HAND_INSPECTION_PROPER = "hand_inspection.proper"
    HAND_INSPECTION_INCOMPLETE = "hand_inspection.incomplete"
    GRADING_COMPLETED = "grading.completed"
    ROUTING_ACCEPTED = "routing.accepted"
    ROUTING_REJECTED = "routing.rejected"
    ROUTING_MISSING = "routing.missing"
    ROUTING_MISMATCH = "routing.mismatch"
    WEIGHT_READ = "weight.read"
    WEIGHT_MISSING = "weight.missing"
    WEIGHT_UNREADABLE = "weight.unreadable"
    WEIGHT_UNSTABLE = "weight.unstable"
    TRACK_AMBIGUOUS = "track.ambiguous"
    INSUFFICIENT_VISIBILITY = "visibility.insufficient"
    CAMERA_FAILURE = "camera.failure"
    MODEL_FAILURE = "model.failure"
    SERVICE_FAILURE = "service.failure"
    BALE_EXITED = "bale.exited"
    SESSION_TIMEOUT = "session.timeout"


class InspectionOutcome(StrEnum):
    COMPLETED = "completed"
    MISSED = "missed"
    INCOMPLETE = "incomplete"
    UNRESOLVED = "unresolved"


class AnomalyCode(StrEnum):
    NONE = "NONE"
    BALE_NOT_OPENED = "BALE_NOT_OPENED"
    HAND_INSPECTION_MISSING = "HAND_INSPECTION_MISSING"
    HAND_INSPECTION_INCOMPLETE = "HAND_INSPECTION_INCOMPLETE"
    GRADING_MISSING = "GRADING_MISSING"
    ROUTING_MISSING = "ROUTING_MISSING"
    ROUTING_MISMATCH = "ROUTING_MISMATCH"
    WEIGHT_MISSING = "WEIGHT_MISSING"
    WEIGHT_UNREADABLE = "WEIGHT_UNREADABLE"
    WEIGHT_UNSTABLE = "WEIGHT_UNSTABLE"
    SEQUENCE_INCOMPLETE = "SEQUENCE_INCOMPLETE"
    TRACK_OR_ASSOCIATION_AMBIGUOUS = "TRACK_OR_ASSOCIATION_AMBIGUOUS"
    INSUFFICIENT_VISIBILITY = "INSUFFICIENT_VISIBILITY"
    CAMERA_FAILURE = "CAMERA_FAILURE"
    MODEL_FAILURE = "MODEL_FAILURE"
    SERVICE_FAILURE = "SERVICE_FAILURE"


@dataclass(frozen=True, slots=True)
class Observation:
    kind: ObservationKind
    camera_id: str
    bale_id: str
    timestamp: float
    confidence: float
    evidence_ref: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.camera_id:
            raise ValueError("camera_id is required")
        if not self.bale_id:
            raise ValueError("bale_id is required")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("confidence must be between 0 and 1")


@dataclass(frozen=True, slots=True)
class StepResult:
    key: str
    label: str
    state: str
    timestamp: float | None
    confidence: float | None
    evidence_ref: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class InspectionEvent:
    event_id: str
    session_id: str
    camera_id: str
    bale_id: str
    started_at: float
    ended_at: float
    outcome: InspectionOutcome
    reason_code: AnomalyCode
    confidence: float
    steps: tuple[StepResult, ...]
    model_version: str
    rule_version: str
    config_version: str
    source: str = "edge"
    schema_version: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)
