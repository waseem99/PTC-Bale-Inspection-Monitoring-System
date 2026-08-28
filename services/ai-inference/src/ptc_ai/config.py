from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

Point = tuple[float, float]
Polygon = tuple[Point, ...]


def _polygon(value: Any, name: str) -> Polygon:
    if not isinstance(value, list) or len(value) < 3:
        raise ValueError(f"{name} must contain at least three points")
    points: list[Point] = []
    for item in value:
        if not isinstance(item, list) or len(item) != 2:
            raise ValueError(f"{name} points must be [x, y]")
        x, y = float(item[0]), float(item[1])
        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
            raise ValueError(f"{name} coordinates must be normalized to 0..1")
        points.append((x, y))
    return tuple(points)


@dataclass(frozen=True, slots=True)
class CameraRois:
    inspection: Polygon
    accepted: Polygon
    rejected: Polygon
    scale_display: Polygon


@dataclass(frozen=True, slots=True)
class Thresholds:
    min_observation_confidence: float = 0.55
    hand_min_contact_seconds: float = 2.0
    hand_min_motion: float = 0.04
    grading_min_seconds: float = 0.5
    inspection_min_seconds: float = 0.5
    ocr_min_confidence: float = 0.70
    ocr_stable_frames: int = 3
    ocr_tolerance: float = 0.05
    session_timeout_seconds: float = 180.0


@dataclass(frozen=True, slots=True)
class ReleaseVersions:
    model: str
    rules: str
    config: str


@dataclass(frozen=True, slots=True)
class AiConfig:
    versions: ReleaseVersions
    cameras: dict[str, CameraRois]
    thresholds: Thresholds
    weight_unit: str = "kg"
    weight_pattern: str = r"\d+(?:\.\d+)?"

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AiConfig":
        versions_data = data.get("versions") or {}
        versions = ReleaseVersions(
            model=str(versions_data.get("model") or "untrained"),
            rules=str(versions_data.get("rules") or "rules-v1"),
            config=str(versions_data.get("config") or "config-v1"),
        )
        camera_data = data.get("cameras")
        if not isinstance(camera_data, dict) or not camera_data:
            raise ValueError("At least one camera configuration is required")
        cameras: dict[str, CameraRois] = {}
        for camera_id, raw in camera_data.items():
            if not isinstance(raw, dict):
                raise ValueError(f"Camera {camera_id} configuration must be an object")
            cameras[str(camera_id)] = CameraRois(
                inspection=_polygon(raw.get("inspection"), f"{camera_id}.inspection"),
                accepted=_polygon(raw.get("accepted"), f"{camera_id}.accepted"),
                rejected=_polygon(raw.get("rejected"), f"{camera_id}.rejected"),
                scale_display=_polygon(raw.get("scaleDisplay"), f"{camera_id}.scaleDisplay"),
            )
        threshold_data = data.get("thresholds") or {}
        thresholds = Thresholds(
            min_observation_confidence=float(threshold_data.get("minObservationConfidence", 0.55)),
            hand_min_contact_seconds=float(threshold_data.get("handMinContactSeconds", 2.0)),
            hand_min_motion=float(threshold_data.get("handMinMotion", 0.04)),
            grading_min_seconds=float(threshold_data.get("gradingMinSeconds", 0.5)),
            inspection_min_seconds=float(threshold_data.get("inspectionMinSeconds", 0.5)),
            ocr_min_confidence=float(threshold_data.get("ocrMinConfidence", 0.70)),
            ocr_stable_frames=int(threshold_data.get("ocrStableFrames", 3)),
            ocr_tolerance=float(threshold_data.get("ocrTolerance", 0.05)),
            session_timeout_seconds=float(threshold_data.get("sessionTimeoutSeconds", 180.0)),
        )
        return cls(
            versions=versions,
            cameras=cameras,
            thresholds=thresholds,
            weight_unit=str(data.get("weightUnit") or "kg"),
            weight_pattern=str(data.get("weightPattern") or r"\d+(?:\.\d+)?"),
        )

    @classmethod
    def load(cls, path: str | Path) -> "AiConfig":
        with Path(path).open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, dict):
            raise ValueError("Configuration root must be an object")
        return cls.from_dict(data)
