"""Cross-camera stable bale identity (bale-1, bale-2, ...).

Detection cameras allocate and refresh IDs. Inspection cameras attach opening /
inspection signals onto the same global IDs via IoU or FIFO handoff.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass

from .geometry import Box, intersection_over_union


@dataclass(slots=True)
class _GlobalState:
    last_box: Box
    last_camera_id: str
    last_seen: float
    inspected: bool = False


class BaleIdentityRegistry:
    """Assign consistent bale numbers across CAM-01..CAM-04."""

    def __init__(
        self,
        *,
        handoff_ttl_seconds: float = 45.0,
        cross_camera_iou: float = 0.12,
        inspect_iou: float = 0.08,
    ) -> None:
        if handoff_ttl_seconds <= 0:
            raise ValueError("handoff_ttl_seconds must be positive")
        self.handoff_ttl_seconds = handoff_ttl_seconds
        self.cross_camera_iou = cross_camera_iou
        self.inspect_iou = inspect_iou
        self._next_index = 1
        self._bindings: dict[tuple[str, str], str] = {}
        self._globals: dict[str, _GlobalState] = {}
        self._handoff: deque[tuple[str, float]] = deque()

    @property
    def allocated_count(self) -> int:
        return self._next_index - 1

    def _allocate(self) -> str:
        bale_id = f"bale-{self._next_index}"
        self._next_index += 1
        return bale_id

    def _touch(self, bale_id: str, camera_id: str, box: Box, timestamp: float) -> None:
        state = self._globals.get(bale_id)
        if state is None:
            self._globals[bale_id] = _GlobalState(box, camera_id, timestamp)
            return
        state.last_box = box
        state.last_camera_id = camera_id
        state.last_seen = timestamp

    def _purge_handoff(self, timestamp: float) -> None:
        while self._handoff and timestamp - self._handoff[0][1] > self.handoff_ttl_seconds:
            self._handoff.popleft()

    def _match_cross_camera(self, camera_id: str, box: Box, timestamp: float) -> str | None:
        best_id: str | None = None
        best_iou = self.cross_camera_iou
        for bale_id, state in self._globals.items():
            if state.last_camera_id == camera_id:
                continue
            if timestamp - state.last_seen > self.handoff_ttl_seconds:
                continue
            score = intersection_over_union(box, state.last_box)
            if score > best_iou:
                best_iou = score
                best_id = bale_id
        return best_id

    def resolve_detect(
        self,
        camera_id: str,
        local_track_id: str,
        box: Box,
        timestamp: float,
    ) -> str:
        """Map a detection-camera ByteTrack ID onto a stable global bale ID."""
        if not local_track_id.strip():
            raise ValueError("local_track_id is required")
        key = (camera_id, local_track_id)
        existing = self._bindings.get(key)
        if existing is not None:
            self._touch(existing, camera_id, box, timestamp)
            return existing
        matched = self._match_cross_camera(camera_id, box, timestamp)
        bale_id = matched if matched is not None else self._allocate()
        self._bindings[key] = bale_id
        self._touch(bale_id, camera_id, box, timestamp)
        return bale_id

    def offer_handoff(self, bale_id: str, timestamp: float) -> None:
        """Queue a tracked bale for the next inspection-camera association."""
        if bale_id not in self._globals:
            return
        self._purge_handoff(timestamp)
        if any(item[0] == bale_id for item in self._handoff):
            return
        self._handoff.append((bale_id, timestamp))

    def mark_inspected(self, bale_id: str) -> None:
        state = self._globals.get(bale_id)
        if state is not None:
            state.inspected = True

    def resolve_inspect(self, camera_id: str, box: Box, timestamp: float) -> str | None:
        """Attach an inspection-camera detection to an existing global bale ID."""
        self._purge_handoff(timestamp)
        best_id: str | None = None
        best_iou = self.inspect_iou
        for bale_id, state in self._globals.items():
            if timestamp - state.last_seen > self.handoff_ttl_seconds:
                continue
            score = intersection_over_union(box, state.last_box)
            if score > best_iou:
                best_iou = score
                best_id = bale_id
        if best_id is not None:
            self._touch(best_id, camera_id, box, timestamp)
            return best_id
        while self._handoff:
            candidate, _queued_at = self._handoff.popleft()
            state = self._globals.get(candidate)
            if state is None:
                continue
            if timestamp - state.last_seen > self.handoff_ttl_seconds:
                continue
            self._touch(candidate, camera_id, box, timestamp)
            return candidate
        # Fall back to the oldest active, not-yet-inspected bale (conveyor order).
        active = [
            (bale_id, state)
            for bale_id, state in self._globals.items()
            if not state.inspected and timestamp - state.last_seen <= self.handoff_ttl_seconds
        ]
        if not active:
            return None
        active.sort(key=lambda item: item[1].last_seen)
        bale_id = active[0][0]
        self._touch(bale_id, camera_id, box, timestamp)
        return bale_id
