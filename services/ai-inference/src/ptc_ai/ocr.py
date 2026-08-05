from __future__ import annotations

import re
from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class OcrReading:
    timestamp: float
    text: str
    confidence: float


@dataclass(frozen=True, slots=True)
class StableWeight:
    value: float
    unit: str
    confidence: float
    first_timestamp: float
    last_timestamp: float
    samples: int


class WeightStabilizer:
    def __init__(
        self,
        pattern: str,
        unit: str,
        min_confidence: float,
        stable_frames: int,
        tolerance: float,
    ) -> None:
        if stable_frames < 2:
            raise ValueError("stable_frames must be at least 2")
        self.pattern = re.compile(pattern)
        self.unit = unit
        self.min_confidence = min_confidence
        self.stable_frames = stable_frames
        self.tolerance = tolerance
        self._window: deque[tuple[float, float, float]] = deque(maxlen=stable_frames)

    def parse(self, reading: OcrReading) -> float | None:
        if reading.confidence < self.min_confidence:
            return None
        normalized = reading.text.replace(",", ".").replace(" ", "")
        match = self.pattern.search(normalized)
        if not match:
            return None
        try:
            return float(match.group(0))
        except ValueError:
            return None

    def add(self, reading: OcrReading) -> StableWeight | None:
        value = self.parse(reading)
        if value is None:
            self._window.clear()
            return None
        self._window.append((value, reading.confidence, reading.timestamp))
        if len(self._window) < self.stable_frames:
            return None
        values = [item[0] for item in self._window]
        if max(values) - min(values) > self.tolerance:
            return None
        sorted_values = sorted(values)
        median = sorted_values[len(sorted_values) // 2]
        confidence = sum(item[1] for item in self._window) / len(self._window)
        return StableWeight(
            value=median,
            unit=self.unit,
            confidence=confidence,
            first_timestamp=self._window[0][2],
            last_timestamp=self._window[-1][2],
            samples=len(self._window),
        )
