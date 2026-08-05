from __future__ import annotations

from dataclasses import dataclass

from .config import CameraRois
from .geometry import point_in_polygon


@dataclass(frozen=True, slots=True)
class RouteDecision:
    route: str
    confidence: float
    timestamp: float


class RouteVerifier:
    def __init__(self, rois: CameraRois) -> None:
        self.rois = rois

    def classify(self, center: tuple[float, float], timestamp: float, confidence: float) -> RouteDecision | None:
        if point_in_polygon(center, self.rois.rejected):
            return RouteDecision("rejected", confidence, timestamp)
        if point_in_polygon(center, self.rois.accepted):
            return RouteDecision("accepted", confidence, timestamp)
        return None

    @staticmethod
    def is_consistent(grade_route: str | None, observed_route: str) -> bool | None:
        if grade_route is None:
            return None
        normalized = grade_route.strip().lower()
        if normalized not in {"accepted", "rejected"}:
            return None
        return normalized == observed_route
