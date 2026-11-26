import unittest

from ptc_ai.geometry import Box
from ptc_ai.identity import BaleIdentityRegistry


class IdentityTests(unittest.TestCase):
    def test_detect_assigns_stable_bale_numbers(self):
        registry = BaleIdentityRegistry()
        box = Box(0.2, 0.2, 0.4, 0.4)
        first = registry.resolve_detect("CAM-01", "7", box, 1.0)
        again = registry.resolve_detect("CAM-01", "7", box, 1.1)
        second = registry.resolve_detect("CAM-01", "8", Box(0.6, 0.2, 0.8, 0.4), 1.2)
        self.assertEqual("bale-1", first)
        self.assertEqual("bale-1", again)
        self.assertEqual("bale-2", second)
        self.assertEqual(2, registry.allocated_count)

    def test_cross_camera_detect_reuses_id_by_iou(self):
        registry = BaleIdentityRegistry(cross_camera_iou=0.1)
        box = Box(0.2, 0.2, 0.5, 0.5)
        first = registry.resolve_detect("CAM-01", "1", box, 1.0)
        second = registry.resolve_detect("CAM-02", "99", Box(0.22, 0.22, 0.48, 0.48), 1.05)
        self.assertEqual(first, second)

    def test_inspect_uses_handoff_fifo(self):
        registry = BaleIdentityRegistry()
        box = Box(0.2, 0.2, 0.4, 0.4)
        bale_id = registry.resolve_detect("CAM-01", "1", box, 1.0)
        registry.offer_handoff(bale_id, 2.0)
        linked = registry.resolve_inspect("CAM-03", Box(0.7, 0.7, 0.9, 0.9), 2.5)
        self.assertEqual(bale_id, linked)


if __name__ == "__main__":
    unittest.main()
