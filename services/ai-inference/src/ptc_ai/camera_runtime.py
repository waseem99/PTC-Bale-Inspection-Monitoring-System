"""Build per-camera detectors from local PTC YOLO weights."""
from __future__ import annotations

from pathlib import Path

from .runtime_adapters import SequentialBaleInspectionAdapter, UltralyticsByteTrackAdapter
from .weights import resolve_model_weights


def build_camera_detector(
    role: str,
    *,
    track_weights: str | Path | None = None,
    inspection_weights: str | Path | None = None,
    models_dir: str | Path | None = None,
    tracker: str = "bytetrack.yaml",
    detect_conf: float = 0.50,
    inspect_conf: float = 0.40,
):
    """Return the detector for a camera role.

    - detect: bale detection / ByteTrack only (CAM-01, CAM-02)
    - inspect: track + inspection/opening on the same camera (CAM-03, CAM-04)
      Tracking continues here so bale-1/bale-2 IDs stay consistent while
      opening and inspection are observed from this angle.
    - combined: same as inspect (legacy alias)
    """
    normalized = role.strip().lower()
    track, inspect = resolve_model_weights(track_weights, inspection_weights, models_dir)
    if normalized == "detect":
        return UltralyticsByteTrackAdapter(track, tracker=tracker, conf=detect_conf)
    if normalized in {"inspect", "combined"}:
        return SequentialBaleInspectionAdapter.from_weights(
            track,
            inspect,
            tracker=tracker,
            detect_conf=detect_conf,
            inspect_conf=inspect_conf,
        )
    raise ValueError(f"Unsupported camera role: {role}")
