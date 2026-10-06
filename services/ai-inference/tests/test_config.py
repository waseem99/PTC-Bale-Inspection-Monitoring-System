import unittest

from ptc_ai.config import AiConfig


class ConfigTests(unittest.TestCase):
    def legacy_camera(self):
        return {
            "inspection": [[0, 0], [1, 0], [1, 1]],
            "accepted": [[0, 0], [1, 0], [1, 1]],
            "rejected": [[0, 0], [1, 0], [1, 1]],
            "scaleDisplay": [[0, 0], [1, 0], [1, 1]],
        }

    def test_requires_normalized_polygons(self):
        config = AiConfig.from_dict({"versions": {}, "cameras": {"CAM-01": self.legacy_camera()}})
        self.assertIn("CAM-01", config.cameras)

    def test_legacy_config_falls_back_for_new_site_zones(self):
        config = AiConfig.from_dict({"cameras": {"CAM-01": self.legacy_camera()}})
        rois = config.cameras["CAM-01"]
        self.assertEqual(rois.inspection, rois.entry_zone)
        self.assertEqual(rois.inspection, rois.grading_zone)

    def test_explicit_entry_and_grading_rois_are_preserved(self):
        camera = self.legacy_camera()
        camera["entry"] = [[0, 0], [0.2, 0], [0.2, 1]]
        camera["grading"] = [[0.4, 0], [0.6, 0], [0.6, 1]]
        config = AiConfig.from_dict({"cameras": {"CAM-01": camera}})
        rois = config.cameras["CAM-01"]
        self.assertNotEqual(rois.inspection, rois.entry_zone)
        self.assertNotEqual(rois.inspection, rois.grading_zone)

    def test_rejects_invalid_roi(self):
        with self.assertRaises(ValueError):
            AiConfig.from_dict({"cameras": {"CAM-01": {"inspection": [[2, 0]]}}})


if __name__ == "__main__":
    unittest.main()
