from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

from .models import (
    AnomalyCode,
    InspectionEvent,
    InspectionOutcome,
    Observation,
    ObservationKind,
    StepResult,
)


@dataclass(slots=True)
class _SessionData:
    observations: list[Observation] = field(default_factory=list)
    finalized: bool = False


class InspectionSession:
    """Deterministic SOP engine for one camera-local temporary Bale ID."""

    def __init__(
        self,
        camera_id: str,
        bale_id: str,
        started_at: float,
        model_version: str,
        rule_version: str,
        config_version: str,
    ) -> None:
        self.camera_id = camera_id
        self.bale_id = bale_id
        self.started_at = started_at
        self.model_version = model_version
        self.rule_version = rule_version
        self.config_version = config_version
        self._data = _SessionData()

    def add(self, observation: Observation) -> None:
        if self._data.finalized:
            raise RuntimeError("Cannot add observations after finalization")
        if observation.camera_id != self.camera_id or observation.bale_id != self.bale_id:
            raise ValueError("Observation does not belong to this session")
        self._data.observations.append(observation)

    def _latest(self, *kinds: ObservationKind) -> Observation | None:
        matches = [item for item in self._data.observations if item.kind in kinds]
        return max(matches, key=lambda item: item.timestamp, default=None)

    def _first(self, kind: ObservationKind) -> Observation | None:
        matches = [item for item in self._data.observations if item.kind == kind]
        return min(matches, key=lambda item: item.timestamp, default=None)

    def _step(self, key: str, label: str, observation: Observation | None, failed: bool = False) -> StepResult:
        if observation is None:
            return StepResult(key, label, "failed" if failed else "unknown", None, None)
        return StepResult(
            key=key,
            label=label,
            state="failed" if failed else "complete",
            timestamp=observation.timestamp,
            confidence=observation.confidence,
            evidence_ref=observation.evidence_ref,
            metadata=dict(observation.metadata),
        )

    def finalize(self, ended_at: float | None = None) -> InspectionEvent:
        if self._data.finalized:
            raise RuntimeError("Session already finalized")
        self._data.finalized = True
        observations = sorted(self._data.observations, key=lambda item: (item.timestamp, item.kind.value))
        ended = ended_at if ended_at is not None else (observations[-1].timestamp if observations else self.started_at)

        entered = self._first(ObservationKind.BALE_ENTERED)
        opened = self._first(ObservationKind.BALE_OPENED)
        proper = self._first(ObservationKind.HAND_INSPECTION_PROPER)
        incomplete_hand = self._first(ObservationKind.HAND_INSPECTION_INCOMPLETE)
        graded = self._first(ObservationKind.GRADING_COMPLETED)
        routed = self._latest(ObservationKind.ROUTING_ACCEPTED, ObservationKind.ROUTING_REJECTED)
        weight = self._first(ObservationKind.WEIGHT_READ)

        unresolved = self._latest(
            ObservationKind.TRACK_AMBIGUOUS,
            ObservationKind.INSUFFICIENT_VISIBILITY,
            ObservationKind.WEIGHT_UNREADABLE,
            ObservationKind.WEIGHT_UNSTABLE,
        )
        operational = self._latest(
            ObservationKind.CAMERA_FAILURE,
            ObservationKind.MODEL_FAILURE,
            ObservationKind.SERVICE_FAILURE,
        )
        route_mismatch = self._first(ObservationKind.ROUTING_MISMATCH)
        routing_missing = self._first(ObservationKind.ROUTING_MISSING)
        weight_missing = self._first(ObservationKind.WEIGHT_MISSING)

        reason = AnomalyCode.NONE
        outcome = InspectionOutcome.COMPLETED
        if operational:
            outcome = InspectionOutcome.UNRESOLVED
            reason = {
                ObservationKind.CAMERA_FAILURE: AnomalyCode.CAMERA_FAILURE,
                ObservationKind.MODEL_FAILURE: AnomalyCode.MODEL_FAILURE,
                ObservationKind.SERVICE_FAILURE: AnomalyCode.SERVICE_FAILURE,
            }[operational.kind]
        elif unresolved:
            outcome = InspectionOutcome.UNRESOLVED
            reason = {
                ObservationKind.TRACK_AMBIGUOUS: AnomalyCode.TRACK_OR_ASSOCIATION_AMBIGUOUS,
                ObservationKind.INSUFFICIENT_VISIBILITY: AnomalyCode.INSUFFICIENT_VISIBILITY,
                ObservationKind.WEIGHT_UNREADABLE: AnomalyCode.WEIGHT_UNREADABLE,
                ObservationKind.WEIGHT_UNSTABLE: AnomalyCode.WEIGHT_UNSTABLE,
            }[unresolved.kind]
        elif opened is None:
            outcome = InspectionOutcome.MISSED
            reason = AnomalyCode.BALE_NOT_OPENED
        elif proper is None:
            outcome = InspectionOutcome.INCOMPLETE
            reason = AnomalyCode.HAND_INSPECTION_INCOMPLETE if incomplete_hand else AnomalyCode.HAND_INSPECTION_MISSING
        elif graded is None:
            outcome = InspectionOutcome.INCOMPLETE
            reason = AnomalyCode.GRADING_MISSING
        elif route_mismatch:
            outcome = InspectionOutcome.INCOMPLETE
            reason = AnomalyCode.ROUTING_MISMATCH
        elif routed is None or routing_missing:
            outcome = InspectionOutcome.INCOMPLETE
            reason = AnomalyCode.ROUTING_MISSING
        elif weight is None or weight_missing:
            outcome = InspectionOutcome.INCOMPLETE
            reason = AnomalyCode.WEIGHT_MISSING

        ordered_observations = [entered, opened, proper or incomplete_hand, graded, routed, weight]
        timestamps = [item.timestamp for item in ordered_observations if item is not None]
        if timestamps != sorted(timestamps) and outcome == InspectionOutcome.COMPLETED:
            outcome = InspectionOutcome.INCOMPLETE
            reason = AnomalyCode.SEQUENCE_INCOMPLETE

        confidence_values = [item.confidence for item in ordered_observations if item is not None]
        confidence = min(confidence_values) if confidence_values else 0.0
        if outcome == InspectionOutcome.UNRESOLVED:
            confidence = min(confidence, 0.49)

        steps = (
            self._step("entered", "Bale entered inspection zone", entered, failed=entered is None),
            self._step("opened", "Bale cut/opened", opened, failed=opened is None),
            self._step("handInspection", "Proper hand inspection completed", proper or incomplete_hand, failed=proper is None),
            self._step("grading", "Grading completed", graded, failed=graded is None),
            self._step("routing", "Routed to accepted/rejected lane", routed, failed=routed is None or route_mismatch is not None),
            self._step("weight", "Weight read from scale display", weight, failed=weight is None),
        )
        stable_key = f"{self.camera_id}|{self.bale_id}|{self.started_at:.6f}|{self.rule_version}|{self.config_version}"
        digest = hashlib.sha256(stable_key.encode("utf-8")).hexdigest()[:20].upper()
        event_id = f"AI-{digest}"
        metadata = {
            "observationCount": len(observations),
            "route": routed.metadata.get("route") if routed else None,
            "weight": weight.metadata.get("value") if weight else None,
            "weightUnit": weight.metadata.get("unit") if weight else None,
        }
        return InspectionEvent(
            event_id=event_id,
            session_id=f"SESSION-{digest}",
            camera_id=self.camera_id,
            bale_id=self.bale_id,
            started_at=self.started_at,
            ended_at=ended,
            outcome=outcome,
            reason_code=reason,
            confidence=confidence,
            steps=steps,
            model_version=self.model_version,
            rule_version=self.rule_version,
            config_version=self.config_version,
            metadata=metadata,
        )
