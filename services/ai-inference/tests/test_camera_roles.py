import unittest

from ptc_ai.config import AiConfig
from ptc_ai.geometry import Box
from ptc_ai.identity import BaleIdentityRegistry
from ptc_ai.pipeline import RuntimePipeline
from ptc_ai.runtime_adapters import (
    Detection,
    is_inspected_class,
    is_opened_class,
    normalize_class_name,
)


class FakeFrame:
    shape = (100, 100, 3)

    def __getitem__(self, _key):
        return self


class FixedDetector:
    def __init__(self, detections):
        self.detections = detections

    def infer(self, _frame):
        return self.detections


class EmptyHands:
    def points(self, _frame):
        return []


class EmptyOcr:
    def read(self, _frame, _timestamp):
        return []


def camera(role: str) -> dict:
    return {
        "role": role,
        "inspection": [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
        "accepted": [[0.7, 0.1], [1, 0.1], [1, 0.9], [0.7, 0.9]],
        "rejected": [[0, 0.1], [0.2, 0.1], [0.2, 0.9], [0, 0.9]],
        "scaleDisplay": [[0.8, 0], [1, 0], [1, 0.2], [0.8, 0.2]],
    }


class CameraRoleTests(unittest.TestCase):
    def test_model_class_aliases(self):
        self.assertEqual("bale_opening", normalize_class_name("Bale Opening"))
        self.assertEqual("bale_inspection", normalize_class_name("Bale Inspection"))
        self.assertTrue(is_opened_class("Bale Opening"))
        self.assertTrue(is_inspected_class("Bale Inspection"))

    def test_config_roles(self):
        config = AiConfig.from_dict(
            {
                "versions": {"model": "m", "rules": "r", "config": "c"},
                "cameras": {
                    "CAM-01": camera("detect"),
                    "CAM-02": camera("detect"),
                    "CAM-03": camera("inspect"),
                    "CAM-04": camera("inspect"),
                },
            }
        )
        self.assertEqual("detect", config.cameras["CAM-01"].role)
        self.assertEqual("inspect", config.cameras["CAM-04"].role)

    def test_shared_identity_across_detect_and_inspect(self):
        config = AiConfig.from_dict(
            {
                "versions": {"model": "m", "rules": "r", "config": "c"},
                "thresholds": {"inspectionMinSeconds": 0.4, "sessionTimeoutSeconds": 30},
                "cameras": {
                    "CAM-01": camera("detect"),
                    "CAM-03": camera("inspect"),
                },
            }
        )
        identity = BaleIdentityRegistry()
        detect = RuntimePipeline(
            config,
            "CAM-01",
            FixedDetector([Detection("bale", 0.95, Box(0.3, 0.3, 0.5, 0.5), "11")]),
            EmptyHands(),
            EmptyOcr(),
            identity=identity,
        )
        # CAM-03 keeps tracking (local track "42") plus opening/inspection classes.
        inspect = RuntimePipeline(
            config,
            "CAM-03",
            FixedDetector(
                [
                    Detection("bale", 0.95, Box(0.32, 0.32, 0.48, 0.48), "42"),
                    Detection("Bale Opening", 0.9, Box(0.32, 0.32, 0.48, 0.48)),
                    Detection("Bale Inspection", 0.92, Box(0.32, 0.32, 0.48, 0.48)),
                ]
            ),
            EmptyHands(),
            EmptyOcr(),
            identity=identity,
        )
        detect.process_frame(FakeFrame(), 1.0)
        inspect.process_frame(FakeFrame(), 1.2)
        inspect.process_frame(FakeFrame(), 1.8)
        self.assertIn("bale-1", detect.active)
        self.assertIn("bale-1", inspect.active)
        self.assertEqual({"bale-1"}, set(inspect.active))
        self.assertTrue(inspect.active["bale-1"].opened_emitted)
        self.assertTrue(inspect.active["bale-1"].hand_emitted)


if __name__ == "__main__":
    unittest.main()
