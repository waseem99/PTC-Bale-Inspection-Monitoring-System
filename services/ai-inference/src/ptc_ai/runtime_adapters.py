from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Protocol

from .geometry import Box, intersection_over_union
from .ocr import OcrReading


class MissingRuntimeDependency(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class Detection:
    class_name: str
    confidence: float
    box: Box
    track_id: str | None = None


def normalize_class_name(name: str) -> str:
    return name.strip().lower().replace("-", "_").replace(" ", "_")


BALE_TRACK_CLASSES = frozenset({"bale", "bale_closed", "bale_opened", "opened_bale"})
OPENED_CLASSES = frozenset({"bale_opened", "opened_bale"})
INSPECTED_CLASSES = frozenset(
    {
        "inspected",
        "bale_inspected",
        "inspected_bale",
        "inspection",
        "inspection_done",
        "hand_inspection",
        "checked",
    }
)
NOT_INSPECTED_CLASSES = frozenset(
    {
        "not_inspected",
        "uninspected",
        "no_inspection",
        "bale_not_inspected",
        "not_inspected_bale",
        "unchecked",
        "missed_inspection",
    }
)
GRADING_CLASSES = frozenset({"grade_indicator", "grading_action", "grade_accept", "grade_reject"})
_ASSOCIATION_SKIP_CLASSES = INSPECTED_CLASSES | NOT_INSPECTED_CLASSES | GRADING_CLASSES | {"inspector", "person", "hand"}


def is_inspected_class(name: str) -> bool:
    return normalize_class_name(name) in INSPECTED_CLASSES


def is_not_inspected_class(name: str) -> bool:
    return normalize_class_name(name) in NOT_INSPECTED_CLASSES


def is_opened_class(name: str) -> bool:
    return normalize_class_name(name) in OPENED_CLASSES


def is_grading_class(name: str) -> bool:
    return normalize_class_name(name) in GRADING_CLASSES


def is_bale_track_class(name: str) -> bool:
    normalized = normalize_class_name(name)
    if normalized in _ASSOCIATION_SKIP_CLASSES:
        return False
    return normalized in BALE_TRACK_CLASSES or "bale" in normalized


def relabel_tracker_class(name: str) -> str:
    normalized = normalize_class_name(name)
    if normalized in OPENED_CLASSES:
        return "bale_opened"
    if normalized in BALE_TRACK_CLASSES:
        return normalized
    if "bale" in normalized and normalized not in _ASSOCIATION_SKIP_CLASSES:
        return "bale"
    if normalized in _ASSOCIATION_SKIP_CLASSES:
        return normalized
    return "bale"


class FrameDetector(Protocol):
    def infer(self, frame: Any) -> list[Detection]: ...


def _detections_from_yolo_results(results: Any, width: int, height: int, include_track_id: bool) -> list[Detection]:
    detections: list[Detection] = []
    for result in results:
        names = result.names
        boxes = result.boxes
        if boxes is None:
            continue
        for index in range(len(boxes)):
            xyxy = boxes.xyxy[index].tolist()
            confidence = float(boxes.conf[index].item())
            class_id = int(boxes.cls[index].item())
            track_id = None
            if include_track_id and boxes.id is not None:
                track_id = str(int(boxes.id[index].item()))
            detections.append(
                Detection(
                    class_name=str(names[class_id]),
                    confidence=confidence,
                    box=Box(xyxy[0] / width, xyxy[1] / height, xyxy[2] / width, xyxy[3] / height),
                    track_id=track_id,
                )
            )
    return detections


def _load_yolo(weights: str | Path) -> Any:
    try:
        from ultralytics import YOLO  # type: ignore
    except ImportError as exc:
        raise MissingRuntimeDependency("Install ptc-bale-ai[runtime] for Ultralytics runtime support") from exc
    weights_path = Path(weights)
    if not weights_path.is_file():
        raise FileNotFoundError(f"PTC model weights do not exist: {weights_path}")
    return YOLO(str(weights_path))


def associate_inspection_to_tracks(
    tracked: list[Detection],
    inspected: list[Detection],
    min_iou: float = 0.1,
) -> list[Detection]:
    """Attach tracker IDs to inspection boxes after bale tracking has run."""
    bales = [item for item in tracked if item.track_id is not None]
    merged = [
        Detection(relabel_tracker_class(item.class_name), item.confidence, item.box, item.track_id) for item in tracked
    ]
    for item in inspected:
        best: Detection | None = None
        best_iou = min_iou
        for bale in bales:
            iou = intersection_over_union(bale.box, item.box)
            if iou > best_iou:
                best_iou = iou
                best = bale
        merged.append(
            Detection(
                class_name=normalize_class_name(item.class_name),
                confidence=item.confidence,
                box=item.box,
                track_id=best.track_id if best is not None else None,
            )
        )
    return merged


class UltralyticsByteTrackAdapter:
    """YOLO detector plus ByteTrack using Ultralytics' tracked-result API.

    A PTC-trained weights file is mandatory for bale/grade classes. Pretrained
    COCO weights are not accepted as PTC validation evidence.
    """

    def __init__(self, weights: str | Path, tracker: str = "bytetrack.yaml") -> None:
        self._model = _load_yolo(weights)
        self._tracker = tracker

    def infer(self, frame: Any) -> list[Detection]:
        height, width = frame.shape[:2]
        results = self._model.track(frame, persist=True, tracker=self._tracker, verbose=False)
        return _detections_from_yolo_results(results, width, height, include_track_id=True)


class UltralyticsPredictAdapter:
    """YOLO detector without tracking, used for inspected / not-inspected classes."""

    def __init__(self, weights: str | Path) -> None:
        self._model = _load_yolo(weights)

    def infer(self, frame: Any) -> list[Detection]:
        height, width = frame.shape[:2]
        results = self._model.predict(frame, verbose=False)
        return _detections_from_yolo_results(results, width, height, include_track_id=False)


class SequentialBaleInspectionAdapter:
    """Run bale tracking first, then inspection detection, then join by IoU."""

    def __init__(self, tracker: FrameDetector, inspector: FrameDetector, min_iou: float = 0.1) -> None:
        self._tracker = tracker
        self._inspector = inspector
        self._min_iou = min_iou

    @classmethod
    def from_weights(
        cls,
        track_weights: str | Path,
        inspection_weights: str | Path,
        tracker: str = "bytetrack.yaml",
        min_iou: float = 0.1,
    ) -> "SequentialBaleInspectionAdapter":
        return cls(
            UltralyticsByteTrackAdapter(track_weights, tracker=tracker),
            UltralyticsPredictAdapter(inspection_weights),
            min_iou=min_iou,
        )

    def infer(self, frame: Any) -> list[Detection]:
        tracked = self._tracker.infer(frame)
        inspected = self._inspector.infer(frame)
        return associate_inspection_to_tracks(tracked, inspected, min_iou=self._min_iou)


class MediaPipeHandAdapter:
    def __init__(self) -> None:
        try:
            import mediapipe as mp  # type: ignore
        except ImportError as extra:
            raise MissingRuntimeDependency("Install ptc-bale-ai[runtime] for MediaPipe support") from extra
        self._hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=4)

    def points(self, frame: Any) -> list[tuple[float, float, float]]:
        try:
            import cv2  # type: ignore
        except ImportError as extra:
            raise MissingRuntimeDependency("OpenCV is required for MediaPipe frame conversion") from extra
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self._hands.process(rgb)
        points: list[tuple[float, float, float]] = []
        for hand in result.multi_hand_landmarks or []:
            for landmark in hand.landmark:
                points.append(
                    (
                        float(landmark.x),
                        float(landmark.y),
                        float(landmark.visibility if hasattr(landmark, "visibility") else 1.0),
                    )
                )
        return points


class EasyOcrDisplayAdapter:
    """Digit-focused OCR with deterministic contrast and sharpness preprocessing."""

    def __init__(self, languages: list[str] | None = None, gpu: bool = True, upscale: int = 3) -> None:
        try:
            import easyocr  # type: ignore
        except ImportError as extra:
            raise MissingRuntimeDependency("Install ptc-bale-ai[runtime] for EasyOCR support") from extra
        if upscale < 1:
            raise ValueError("upscale must be at least 1")
        self._reader = easyocr.Reader(languages or ["en"], gpu=gpu)
        self._upscale = upscale

    def _preprocess(self, image: Any) -> Any:
        try:
            import cv2  # type: ignore
        except ImportError as extra:
            raise MissingRuntimeDependency("OpenCV is required for OCR preprocessing") from extra
        if image is None or getattr(image, "size", 0) == 0:
            raise ValueError("Scale-display crop is empty")
        gray = image if len(image.shape) == 2 else cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if self._upscale > 1:
            gray = cv2.resize(gray, None, fx=self._upscale, fy=self._upscale, interpolation=cv2.INTER_CUBIC)
        gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        return cv2.GaussianBlur(gray, (3, 3), 0)

    def read(self, image: Any, timestamp: float) -> list[OcrReading]:
        prepared = self._preprocess(image)
        results: Iterable[Any] = self._reader.readtext(prepared, allowlist="0123456789.-", detail=1)
        return [OcrReading(timestamp, str(item[1]), float(item[2])) for item in results]
