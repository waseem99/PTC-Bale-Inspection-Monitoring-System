import unittest

from ptc_ai.config import AiConfig
from ptc_ai.geometry import Box
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
    def config(self):
        return AiConfig.from_dict(
            {
                "versions": {"model": "m1", "rules": "r1", "config": "c1"},
                "thresholds": {
                    "handMinContactSeconds": 1.0,
                    "handMinMotion": 0.01,
                    "ocrStableFrames": 2,
                    "sessionTimeoutSeconds": 10,
                },
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
            ]
        )
        ocr = SequenceOcr(
            [
                [OcrReading(5, "52.10", 0.9)],
                [OcrReading(6, "52.10", 0.9)],
            ]
        )
        pipeline = RuntimePipeline(self.config(), "CAM-01", detector, hands, ocr)
        events = []
        for timestamp in range(1, 7):
            events.extend(pipeline.process_frame(FakeFrame(), float(timestamp)))
        self.assertEqual(1, len(events))
        self.assertEqual("completed", events[0].outcome.value)
        self.assertEqual("rejected", events[0].metadata["route"])
        self.assertEqual(52.1, events[0].metadata["weight"])


if __name__ == "__main__":
    unittest.main()
