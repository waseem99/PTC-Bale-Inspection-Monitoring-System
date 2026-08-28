import unittest

from ptc_ai.config import AiConfig
from ptc_ai.geometry import Box
from ptc_ai.models import ObservationKind
from ptc_ai.ocr import OcrReading
from ptc_ai.pipeline import RuntimePipeline
from ptc_ai.runtime_adapters import Detection


class FakeFrame:
    shape = (100, 100, 3)

    def __getitem__(self, _key):
        return self


class SequenceDetector:
    def __init__(self, frames):
        self.frames = iter(frames)

    def infer(self, _frame):
        return next(self.frames)


class SequenceHands:
    def __init__(self, frames):
        self.frames = iter(frames)

    def points(self, _frame):
        return next(self.frames)


class SequenceOcr:
    def __init__(self, frames):
        self.frames = iter(frames)

    def read(self, _frame, _timestamp):
        return next(self.frames)


class PipelineTests(unittest.TestCase):
    def config(self, **thresholds):
        configured = {
            "handMinContactSeconds": 1.0,
            "handMinMotion": 0.01,
            "gradingMinSeconds": 0.5,
            "ocrStableFrames": 2,
            "sessionTimeoutSeconds": 10,
        }
        configured.update(thresholds)
        return AiConfig.from_dict(
            {
                "versions": {"model": "m1", "rules": "r1", "config": "c1"},
                "thresholds": configured,
                "cameras": {
                    "CAM-01": {
                        "inspection": [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]],
                        "accepted": [[0.8, 0.2], [1, 0.2], [1, 0.8], [0.8, 0.8]],
                        "rejected": [[0, 0.2], [0.2, 0.2], [0.2, 0.8], [0, 0.8]],
                        "scaleDisplay": [[0.8, 0], [1, 0], [1, 0.2], [0.8, 0.2]],
                    }
                },
            }
        )

    def test_complete_pipeline(self):
        bale_center = Box(0.4, 0.4, 0.6, 0.6)
        rejected = Box(0.02, 0.4, 0.18, 0.6)
        detector = SequenceDetector(
            [
                [Detection("bale_closed", 0.95, bale_center, "1")],
                [Detection("bale_opened", 0.95, bale_center, "1")],
                [Detection("bale_opened", 0.95, bale_center, "1")],
                [Detection("bale_opened", 0.95, bale_center, "1"), Detection("grade_reject", 0.9, bale_center, None)],
                [Detection("bale_opened", 0.95, bale_center, "1"), Detection("grade_reject", 0.9, bale_center, None)],
                [Detection("bale_opened", 0.95, rejected, "1")],
                [Detection("bale_opened", 0.95, rejected, "1")],
                [Detection("bale_opened", 0.95, rejected, "1")],
            ]
        )
        hands = SequenceHands(
            [
                [],
                [(0.5, 0.5, 0.9)],
                [(0.52, 0.52, 0.9)],
                [(0.54, 0.54, 0.9)],
                [],
                [],
                [],
                [],
            ]
        )
        ocr = SequenceOcr(
            [
                [OcrReading(7, "52.10", 0.9)],
                [OcrReading(8, "52.10", 0.9)],
            ]
        )
        pipeline = RuntimePipeline(self.config(), "CAM-01", detector, hands, ocr)
        events = []
        for timestamp in range(1, 9):
            events.extend(pipeline.process_frame(FakeFrame(), float(timestamp)))
        self.assertEqual(1, len(events))
        self.assertEqual("completed", events[0].outcome.value)
        self.assertEqual("rejected", events[0].metadata["route"])
        self.assertEqual(52.1, events[0].metadata["weight"])

    def test_inspection_model_marks_proper_after_tracking(self):
        box = Box(0.4, 0.4, 0.6, 0.6)
        rejected = Box(0.02, 0.4, 0.18, 0.6)
        detector = SequenceDetector(
            [
                [Detection("bale", 0.95, box, "1")],
                [Detection("bale", 0.95, box, "1"), Detection("inspected", 0.92, box, "1")],
                [Detection("bale", 0.95, box, "1"), Detection("inspected", 0.91, box, "1")],
                [Detection("bale", 0.95, box, "1"), Detection("inspected", 0.9, box, "1"), Detection("grade_reject", 0.9, box, None)],
                [Detection("bale", 0.95, box, "1"), Detection("grade_reject", 0.9, box, None)],
                [Detection("bale", 0.95, rejected, "1")],
                [Detection("bale", 0.95, rejected, "1")],
                [Detection("bale", 0.95, rejected, "1")],
            ]
        )
        hands = SequenceHands([[], [], [], [], [], [], [], []])
        ocr = SequenceOcr(
            [
                [OcrReading(7, "52.10", 0.9)],
                [OcrReading(8, "52.10", 0.9)],
            ]
        )
        pipeline = RuntimePipeline(self.config(), "CAM-01", detector, hands, ocr)
        events = []
        for timestamp in range(1, 9):
            events.extend(pipeline.process_frame(FakeFrame(), float(timestamp)))
        self.assertEqual(1, len(events))
        self.assertEqual("completed", events[0].outcome.value)

    def test_not_inspected_model_does_not_count_as_proper(self):
        box = Box(0.4, 0.4, 0.6, 0.6)
        detector = SequenceDetector(
            [
                [Detection("bale_opened", 0.95, box, "1"), Detection("not_inspected", 0.9, box, "1")],
                [Detection("bale_opened", 0.95, box, "1"), Detection("not_inspected", 0.9, box, "1")],
            ]
        )
        pipeline = RuntimePipeline(
            self.config(sessionTimeoutSeconds=0.5),
            "CAM-01",
            detector,
            SequenceHands([[], []]),
            SequenceOcr([]),
        )
        events = []
        events.extend(pipeline.process_frame(FakeFrame(), 1.0))
        events.extend(pipeline.process_frame(FakeFrame(), 2.0))
        events.extend(pipeline.finish(3.0))
        self.assertEqual("HAND_INSPECTION_MISSING", events[0].reason_code.value)

    def test_grading_requires_configured_duration(self):
        box = Box(0.4, 0.4, 0.6, 0.6)
        detector = SequenceDetector(
            [
                [Detection("bale_opened", 0.95, box, "1")],
                [Detection("bale_opened", 0.95, box, "1")],
                [Detection("bale_opened", 0.95, box, "1"), Detection("grade_accept", 0.9, box)],
                [Detection("bale_opened", 0.95, box, "1"), Detection("grade_accept", 0.9, box)],
            ]
        )
        hands = SequenceHands(
            [
                [(0.5, 0.5, 0.9)],
                [(0.53, 0.53, 0.9)],
                [],
                [],
            ]
        )
        ocr = SequenceOcr([])
        pipeline = RuntimePipeline(self.config(gradingMinSeconds=2.0), "CAM-01", detector, hands, ocr)
        for timestamp in range(1, 5):
            pipeline.process_frame(FakeFrame(), float(timestamp))
        state = pipeline.active["1"]
        self.assertFalse(state.grading_emitted)

    def test_multiple_routed_bales_do_not_share_one_weight(self):
        box = Box(0.4, 0.4, 0.6, 0.6)
        detector = SequenceDetector([[]])
        hands = SequenceHands([[]])
        ocr = SequenceOcr([])
        pipeline = RuntimePipeline(self.config(), "CAM-01", detector, hands, ocr)
        for bale_id in ("1", "2"):
            state = pipeline._new_bale(bale_id, box, 1.0, 0.9)
            state.route_emitted = True
        pipeline.process_frame(FakeFrame(), 2.0)
        for state in pipeline.active.values():
            kinds = [item.kind for item in state.session._data.observations]
            self.assertIn(ObservationKind.TRACK_AMBIGUOUS, kinds)
            self.assertFalse(state.weight_emitted)

    def test_unreadable_ocr_is_not_reported_as_missing(self):
        box = Box(0.4, 0.4, 0.6, 0.6)
        detector = SequenceDetector([[]])
        hands = SequenceHands([[]])
        ocr = SequenceOcr([[]])
        pipeline = RuntimePipeline(self.config(), "CAM-01", detector, hands, ocr)
        state = pipeline._new_bale("1", box, 1.0, 0.9)
        state.route_emitted = True
        pipeline.process_frame(FakeFrame(), 2.0)
        event = pipeline.finish(3.0)[0]
        self.assertEqual("WEIGHT_UNREADABLE", event.reason_code.value)


if __name__ == "__main__":
    unittest.main()
