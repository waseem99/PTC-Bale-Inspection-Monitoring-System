from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class HandSample:
    timestamp: float
    contact: bool
    motion: float
    confidence: float
    visible: bool = True


@dataclass(frozen=True, slots=True)
class InteractionDecision:
    classification: str
    confidence: float
    contact_seconds: float
    accumulated_motion: float


class HandInspectionClassifier:
    """Explainable baseline for proper, incomplete, no, or unresolved hand inspection."""

    def __init__(self, min_contact_seconds: float, min_motion: float, min_confidence: float) -> None:
        self.min_contact_seconds = min_contact_seconds
        self.min_motion = min_motion
        self.min_confidence = min_confidence

    def classify(self, samples: list[HandSample]) -> InteractionDecision:
        if not samples:
            return InteractionDecision("no_inspection", 0.0, 0.0, 0.0)
        ordered = sorted(samples, key=lambda item: item.timestamp)
        visible = [item for item in ordered if item.visible]
        if len(visible) < max(2, len(ordered) // 2):
            return InteractionDecision("unresolved", 0.0, 0.0, 0.0)

        contact_seconds = 0.0
        accumulated_motion = 0.0
        confidence_values: list[float] = []
        for previous, current in zip(visible, visible[1:]):
            if previous.contact and current.contact:
                contact_seconds += max(0.0, current.timestamp - previous.timestamp)
                accumulated_motion += max(0.0, current.motion)
                confidence_values.append(current.confidence)

        confidence = sum(confidence_values) / len(confidence_values) if confidence_values else 0.0
        if (
            contact_seconds >= self.min_contact_seconds
            and accumulated_motion >= self.min_motion
            and confidence >= self.min_confidence
        ):
            return InteractionDecision("proper", confidence, contact_seconds, accumulated_motion)
        if any(item.contact for item in visible):
            return InteractionDecision("incomplete", confidence, contact_seconds, accumulated_motion)
        return InteractionDecision("no_inspection", confidence, contact_seconds, accumulated_motion)
