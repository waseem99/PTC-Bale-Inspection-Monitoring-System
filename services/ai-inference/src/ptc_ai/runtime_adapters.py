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
        self._model = YOLO(str(weights))
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
                points.append((float(landmark.x), float(landmark.y), float(landmark.visibility if hasattr(landmark, "visibility") else 1.0)))
        return points


class EasyOcrDisplayAdapter:
    def __init__(self, languages: list[str] | None = None, gpu: bool = True) -> None:
        try:
            import easyocr  # type: ignore
        except ImportError as exc:
            raise MissingRuntimeDependency("Install ptc-bale-ai[runtime] for EasyOCR support") from exc
        self._reader = easyocr.Reader(languages or ["en"], gpu=gpu)

    def read(self, image: Any, timestamp: float) -> list[OcrReading]:
        results: Iterable[Any] = self._reader.readtext(image, allowlist="0123456789.-", detail=1)
        return [OcrReading(timestamp, str(item[1]), float(item[2])) for item in results]
