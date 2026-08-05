from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Protocol

from .config import AiConfig, CameraRois
from .event_mapper import to_platform_payload
from .geometry import Box, intersection_over_union, point_in_polygon
from .interaction import HandInspectionClassifier, HandSample
from .models import InspectionEvent, Observation, ObservationKind
from .ocr import OcrReading, WeightStabilizer
from .routing import RouteVerifier
from .runtime_adapters import Detection
from .sop import InspectionSession


class Detector(Protocol):
    def infer(self, frame: Any) -> list[Detection]: ...


class HandReader(Protocol):
    def points(self, frame: Any) -> list[tuple[float, float, float]]: ...


class DisplayReader(Protocol):
    def read(self, image: Any, timestamp: float) -> list[OcrReading]: ...


@dataclass(slots=True)
class ActiveBale:
    session: InspectionSession
    box: Box
    last_seen: float
    hand_samples: list[HandSample] = field(default_factory=list)
    last_hand_center: tuple[float, float] | None = None
    opened_emitted: bool = False
    hand_emitted: bool = False
    grading_emitted: bool = False
    grading_candidate: str | None = None
    grading_started_at: float | None = None
    grading_confidence: float = 0.0
    expected_route: str | None = None
    route_emitted: bool = False
    observed_route: str | None = None
    weight_emitted: bool = False
    ocr_attempts: int = 0
    ocr_numeric_seen: bool = False
    weight_ambiguity_emitted: bool = False


class RuntimePipeline:
    """Frame-by-frame baseline pipeline for recorded-video and live-camera testing.

    The implementation intentionally requires custom PTC detector weights. It uses
    explainable hand-contact features as the baseline; an evaluated temporal model
    may replace or supplement those observations without changing the SOP contract.
    """

    BALE_CLASSES = {"bale", "bale_closed", "bale_opened"}
    OPENED_CLASSES = {"bale_opened", "opened_bale"}
    GRADING_CLASSES = {"grade_indicator", "grading_action", "grade_accept", "grade_reject"}

    def __init__(
        self,
        config: AiConfig,
        camera_id: str,
        detector: Detector,
        hand_reader: HandReader,
        display_reader: DisplayReader,
    ) -> None:
        if camera_id not in config.cameras:
            raise ValueError(f"Camera {camera_id} is not configured")
        self.config = config
        self.camera_id = camera_id
        self.rois: CameraRois = config.cameras[camera_id]
        self.detector = detector
        self.hand_reader = hand_reader
        self.display_reader = display_reader
        self.route_verifier = RouteVerifier(self.rois)
        thresholds = config.thresholds
        self.hand_classifier = HandInspectionClassifier(
            thresholds.hand_min_contact_seconds,
            thresholds.hand_min_motion,
            thresholds.min_observation_confidence,
        )
        self.active: dict[str, ActiveBale] = {}
        self.weight_stabilizers: dict[str, WeightStabilizer] = {}

    def _observation(
        self,
        bale_id: str,
        kind: ObservationKind,
        timestamp: float,
        confidence: float,
        **metadata: Any,
    ) -> Observation:
        return Observation(
            kind=kind,
            camera_id=self.camera_id,
            bale_id=bale_id,
            timestamp=timestamp,
            confidence=max(0.0, min(1.0, confidence)),
            metadata=metadata,
        )

    def _new_bale(self, bale_id: str, box: Box, timestamp: float, confidence: float) -> ActiveBale:
        session = InspectionSession(
            self.camera_id,
            bale_id,
            timestamp,
            self.config.versions.model,
            self.config.versions.rules,
            self.config.versions.config,
        )
        session.add(self._observation(bale_id, ObservationKind.BALE_ENTERED, timestamp, confidence))
        state = ActiveBale(session=session, box=box, last_seen=timestamp)
        self.active[bale_id] = state
        self.weight_stabilizers[bale_id] = WeightStabilizer(
            self.config.weight_pattern,
            self.config.weight_unit,
            self.config.thresholds.ocr_min_confidence,
            self.config.thresholds.ocr_stable_frames,
            self.config.thresholds.ocr_tolerance,
        )
        return state

    @staticmethod
    def _track_id(detection: Detection) -> str | None:
        return f"{detection.track_id}" if detection.track_id is not None else None

    @staticmethod
    def _hand_center(points: list[tuple[float, float, float]], box: Box) -> tuple[float, float] | None:
        relevant = [(x, y) for x, y, confidence in points if confidence >= 0.4 and box.contains((x, y))]
        if not relevant:
            return None
        return (
            sum(item[0] for item in relevant) / len(relevant),
            sum(item[1] for item in relevant) / len(relevant),
        )

    @staticmethod
    def _distance(left: tuple[float, float] | None, right: tuple[float, float] | None) -> float:
        if left is None or right is None:
            return 0.0
        return math.dist(left, right)

    @staticmethod
    def _polygon_crop(frame: Any, polygon: tuple[tuple[float, float], ...]) -> Any:
        height, width = frame.shape[:2]
        if len(polygon) == 4:
            try:
                import cv2  # type: ignore
                import numpy as np  # type: ignore

                source = np.float32([[x * width, y * height] for x, y in polygon])
                top = math.dist(source[0], source[1])
                bottom = math.dist(source[3], source[2])
                left = math.dist(source[0], source[3])
                right = math.dist(source[1], source[2])
                target_width = max(2, int(round(max(top, bottom))))
                target_height = max(2, int(round(max(left, right))))
                destination = np.float32(
                    [[0, 0], [target_width - 1, 0], [target_width - 1, target_height - 1], [0, target_height - 1]]
                )
                matrix = cv2.getPerspectiveTransform(source, destination)
                return cv2.warpPerspective(frame, matrix, (target_width, target_height))
            except Exception:
                pass
        xs = [point[0] for point in polygon]
        ys = [point[1] for point in polygon]
        x1 = max(0, min(width - 1, int(min(xs) * width)))
        x2 = max(x1 + 1, min(width, int(max(xs) * width)))
        y1 = max(0, min(height - 1, int(min(ys) * height)))
        y2 = max(y1 + 1, min(height, int(max(ys) * height)))
        return frame[y1:y2, x1:x2]

    def _update_hand_observation(self, state: ActiveBale, points: list[tuple[float, float, float]], timestamp: float) -> None:
        expanded = state.box.expanded(0.15)
        center = self._hand_center(points, expanded)
        motion = self._distance(state.last_hand_center, center)
        confidence = max((point[2] for point in points), default=0.0)
        state.hand_samples.append(HandSample(timestamp, center is not None, motion, confidence, visible=True))
        state.last_hand_center = center
        if state.hand_emitted or not state.opened_emitted:
            return
        decision = self.hand_classifier.classify(state.hand_samples)
        if decision.classification == "proper":
            state.session.add(
                self._observation(
                    state.session.bale_id,
                    ObservationKind.HAND_INSPECTION_PROPER,
                    timestamp,
                    decision.confidence,
                    contactSeconds=decision.contact_seconds,
                    accumulatedMotion=decision.accumulated_motion,
                )
            )
            state.hand_emitted = True

    def _update_grading(self, state: ActiveBale, detections: list[Detection], timestamp: float) -> None:
        if state.grading_emitted or not state.hand_emitted:
            return
        candidates = [
            item
            for item in detections
            if item.class_name in self.GRADING_CLASSES
            and (intersection_over_union(state.box.expanded(0.3), item.box) > 0.0 or state.box.expanded(0.5).contains(item.box.center))
            and item.confidence >= self.config.thresholds.min_observation_confidence
        ]
        if not candidates:
            state.grading_candidate = None
            state.grading_started_at = None
            state.grading_confidence = 0.0
            return
        selected = max(candidates, key=lambda item: item.confidence)
        if state.grading_candidate != selected.class_name:
            state.grading_candidate = selected.class_name
            state.grading_started_at = timestamp
            state.grading_confidence = selected.confidence
            return
        state.grading_confidence = min(state.grading_confidence, selected.confidence)
        started_at = state.grading_started_at if state.grading_started_at is not None else timestamp
        if timestamp - started_at < self.config.thresholds.grading_min_seconds:
            return
        if selected.class_name == "grade_accept":
            state.expected_route = "accepted"
        elif selected.class_name == "grade_reject":
            state.expected_route = "rejected"
        state.session.add(
            self._observation(
                state.session.bale_id,
                ObservationKind.GRADING_COMPLETED,
                timestamp,
                state.grading_confidence,
                gradeSignal=selected.class_name,
                expectedRoute=state.expected_route,
                observedSeconds=max(0.0, timestamp - started_at),
            )
        )
        state.grading_emitted = True

    def _update_route(self, state: ActiveBale, timestamp: float, confidence: float) -> None:
        if state.route_emitted or not state.grading_emitted:
            return
        decision = self.route_verifier.classify(state.box.center, timestamp, confidence)
        if decision is None:
            return
        kind = ObservationKind.ROUTING_REJECTED if decision.route == "rejected" else ObservationKind.ROUTING_ACCEPTED
        state.session.add(self._observation(state.session.bale_id, kind, timestamp, decision.confidence, route=decision.route))
        state.route_emitted = True
        state.observed_route = decision.route
        consistency = self.route_verifier.is_consistent(state.expected_route, decision.route)
        if consistency is False:
            state.session.add(
                self._observation(
                    state.session.bale_id,
                    ObservationKind.ROUTING_MISMATCH,
                    timestamp,
                    decision.confidence,
                    expectedRoute=state.expected_route,
                    observedRoute=decision.route,
                )
            )

    def _weight_candidates(self) -> list[ActiveBale]:
        return [state for state in self.active.values() if state.route_emitted and not state.weight_emitted]

    def _update_weight(self, frame: Any, timestamp: float) -> None:
        candidates = self._weight_candidates()
        if not candidates:
            return
        if len(candidates) > 1:
            for state in candidates:
                if not state.weight_ambiguity_emitted:
                    state.session.add(
                        self._observation(
                            state.session.bale_id,
                            ObservationKind.TRACK_AMBIGUOUS,
                            timestamp,
                            0.0,
                            context="multiple routed bales awaiting one scale reading",
                        )
                    )
                    state.weight_ambiguity_emitted = True
            return
        state = candidates[0]
        crop = self._polygon_crop(frame, self.rois.scale_display)
        readings = self.display_reader.read(crop, timestamp)
        state.ocr_attempts += 1
        stabilizer = self.weight_stabilizers[state.session.bale_id]
        for reading in readings:
            if stabilizer.parse(reading) is not None:
                state.ocr_numeric_seen = True
            stable = stabilizer.add(reading)
            if stable is None:
                continue
            state.session.add(
                self._observation(
                    state.session.bale_id,
                    ObservationKind.WEIGHT_READ,
                    timestamp,
                    stable.confidence,
                    value=stable.value,
                    unit=stable.unit,
                    stableFrames=stable.samples,
                    stableFrom=stable.first_timestamp,
                    stableTo=stable.last_timestamp,
                )
            )
            state.weight_emitted = True
            break

    def _finalize_state(self, bale_id: str, timestamp: float) -> InspectionEvent:
        state = self.active.pop(bale_id)
        self.weight_stabilizers.pop(bale_id, None)
        if not state.hand_emitted and state.opened_emitted:
            decision = self.hand_classifier.classify(state.hand_samples)
            if decision.classification == "incomplete":
                state.session.add(
                    self._observation(
                        bale_id,
                        ObservationKind.HAND_INSPECTION_INCOMPLETE,
                        timestamp,
                        decision.confidence,
                        contactSeconds=decision.contact_seconds,
                        accumulatedMotion=decision.accumulated_motion,
                    )
                )
            elif decision.classification == "unresolved":
                state.session.add(self._observation(bale_id, ObservationKind.INSUFFICIENT_VISIBILITY, timestamp, 0.0))
        if state.grading_emitted and not state.route_emitted:
            state.session.add(self._observation(bale_id, ObservationKind.ROUTING_MISSING, timestamp, 1.0))
        if state.route_emitted and not state.weight_emitted:
            if state.weight_ambiguity_emitted:
                pass
            elif state.ocr_numeric_seen:
                state.session.add(self._observation(bale_id, ObservationKind.WEIGHT_UNSTABLE, timestamp, 0.0))
            elif state.ocr_attempts > 0:
                state.session.add(self._observation(bale_id, ObservationKind.WEIGHT_UNREADABLE, timestamp, 0.0))
            else:
                state.session.add(self._observation(bale_id, ObservationKind.WEIGHT_MISSING, timestamp, 1.0))
        state.session.add(self._observation(bale_id, ObservationKind.BALE_EXITED, timestamp, 1.0))
        return state.session.finalize(timestamp)

    def process_frame(self, frame: Any, timestamp: float) -> list[InspectionEvent]:
        detections = self.detector.infer(frame)
        bale_detections = [item for item in detections if item.class_name in self.BALE_CLASSES and self._track_id(item)]
        hand_points = self.hand_reader.points(frame)
        for detection in bale_detections:
            bale_id = self._track_id(detection)
            assert bale_id is not None
            state = self.active.get(bale_id)
            if state is None:
                if not point_in_polygon(detection.box.center, self.rois.inspection):
                    continue
                state = self._new_bale(bale_id, detection.box, timestamp, detection.confidence)
            state.box = detection.box
            state.last_seen = timestamp
            if detection.class_name in self.OPENED_CLASSES and not state.opened_emitted:
                state.session.add(self._observation(bale_id, ObservationKind.BALE_OPENED, timestamp, detection.confidence))
                state.opened_emitted = True
            self._update_hand_observation(state, hand_points, timestamp)
            self._update_grading(state, detections, timestamp)
            self._update_route(state, timestamp, detection.confidence)

        self._update_weight(frame, timestamp)
        events: list[InspectionEvent] = []
        timeout = self.config.thresholds.session_timeout_seconds
        for bale_id, state in list(self.active.items()):
            complete = state.opened_emitted and state.hand_emitted and state.grading_emitted and state.route_emitted and state.weight_emitted
            stale = timestamp - state.last_seen >= timeout or timestamp - state.session.started_at >= timeout
            if complete or stale:
                events.append(self._finalize_state(bale_id, timestamp))
        return events

    def fail_active(self, kind: ObservationKind, timestamp: float, confidence: float = 1.0) -> list[InspectionEvent]:
        if kind not in {ObservationKind.CAMERA_FAILURE, ObservationKind.MODEL_FAILURE, ObservationKind.SERVICE_FAILURE}:
            raise ValueError("kind must be an operational failure observation")
        events: list[InspectionEvent] = []
        for bale_id, state in list(self.active.items()):
            state.session.add(self._observation(bale_id, kind, timestamp, confidence))
            events.append(self._finalize_state(bale_id, timestamp))
        return events

    def finish(self, timestamp: float) -> list[InspectionEvent]:
        return [self._finalize_state(bale_id, timestamp) for bale_id in list(self.active)]

    def process_frame_payloads(self, frame: Any, timestamp: float) -> list[dict]:
        return [to_platform_payload(event) for event in self.process_frame(frame, timestamp)]
