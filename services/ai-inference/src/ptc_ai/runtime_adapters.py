from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .geometry import Box
from .ocr import OcrReading


class MissingRuntimeDependency(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class Detection:
    class_name: str
    confidence: float
    box: Box
    track_id: str | None = None


class UltralyticsByteTrackAdapter:
    """YOLO detector plus ByteTrack using Ultralytics' tracked-result API.

    A PTC-trained weights file is mandatory for bale/grade classes. Pretrained
    COCO weights are not accepted as PTC validation evidence.
    """

    def __init__(self, weights: str | Path, tracker: str = "bytetrack.yaml") -> None:
        try:
            from ultralytics import YOLO  # type: ignore
        except ImportError as exc:
            raise MissingRuntimeDependency("Install ptc-bale-ai[runtime] for Ultralytics runtime support") from exc
        weights_path = Path(weights)
        if not weights_path.is_file():
            raise FileNotFoundError(f"PTC model weights do not exist: {weights_path}")
        self._model = YOLO(str(weights_path))
        self._tracker = tracker

    def infer(self, frame: Any) -> list[Detection]:
        height, width = frame.shape[:2]
        results = self._model.track(frame, persist=True, tracker=self._tracker, verbose=False)
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
                if boxes.id is not None:
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


class MediaPipeHandAdapter:
    def __init__(self) -> None:
        try:
            import mediapipe as mp  # type: ignore
        except ImportError as exc:
            raise MissingRuntimeDependency("Install ptc-bale-ai[runtime] for MediaPipe support") from exc
        self._hands = mp.solutions.hands.Hands(static_image_mode=False, max_num_hands=4)

    def points(self, frame: Any) -> list[tuple[float, float, float]]:
        try:
            import cv2  # type: ignore
        except ImportError as exc:
            raise MissingRuntimeDependency("OpenCV is required for MediaPipe frame conversion") from exc
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
        except ImportError as exc:
            raise MissingRuntimeDependency("Install ptc-bale-ai[runtime] for EasyOCR support") from exc
        if upscale < 1:
            raise ValueError("upscale must be at least 1")
        self._reader = easyocr.Reader(languages or ["en"], gpu=gpu)
        self._upscale = upscale

    def _preprocess(self, image: Any) -> Any:
        try:
            import cv2  # type: ignore
        except ImportError as exc:
            raise MissingRuntimeDependency("OpenCV is required for OCR preprocessing") from exc
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
