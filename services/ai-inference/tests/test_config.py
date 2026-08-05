import unittest

from ptc_ai.config import AiConfig


class ConfigTests(unittest.TestCase):
    def test_requires_normalized_polygons(self):
        data = {
            "versions": {},
            "cameras": {
                "CAM-01": {
                    "inspection": [[0, 0], [1, 0], [1, 1]],
                    "accepted": [[0, 0], [1, 0], [1, 1]],
                    "rejected": [[0, 0], [1, 0], [1, 1]],
                    "scaleDisplay": [[0, 0], [1, 0], [1, 1]],
                }
            },
        }
        config = AiConfig.from_dict(data)
        self.assertIn("CAM-01", config.cameras)

    def test_rejects_invalid_roi(self):
        with self.assertRaises(ValueError):
            AiConfig.from_dict({"cameras": {"CAM-01": {"inspection": [[2, 0]]}}})


if __name__ == "__main__":
    unittest.main()
