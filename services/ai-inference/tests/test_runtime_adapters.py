import tempfile
import unittest
from pathlib import Path

from ptc_ai.geometry import Box
from ptc_ai.runtime_adapters import Detection, SequentialBaleInspectionAdapter, associate_inspection_to_tracks
from ptc_ai.weights import resolve_model_weights


class AdapterTests(unittest.TestCase):
    def test_associates_inspection_to_tracked_bale(self):
        tracked = [Detection("object", 0.9, Box(0.2, 0.2, 0.6, 0.6), "7")]
        inspected = [Detection("Inspected", 0.8, Box(0.25, 0.25, 0.55, 0.55))]
        merged = associate_inspection_to_tracks(tracked, inspected)
        self.assertEqual("bale", merged[0].class_name)
        self.assertEqual("inspected", merged[1].class_name)
        self.assertEqual("7", merged[1].track_id)

    def test_sequential_runs_tracker_before_inspector(self):
        order = []

        class Tracker:
            def infer(self, _frame):
                order.append("track")
                return [Detection("bale", 0.9, Box(0.2, 0.2, 0.5, 0.5), "1")]

        class Inspector:
            def infer(self, _frame):
                order.append("inspect")
                return [Detection("not_inspected", 0.8, Box(0.21, 0.21, 0.49, 0.49))]

        detections = SequentialBaleInspectionAdapter(Tracker(), Inspector()).infer(object())
        self.assertEqual(["track", "inspect"], order)
        self.assertEqual(["bale", "not_inspected"], [item.class_name for item in detections])
        self.assertEqual("1", detections[1].track_id)

    def test_resolves_named_weight_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            track = root / "ptc-bale-track.pt"
            inspect = root / "ptc-bale-inspect.pt"
            track.write_bytes(b"track")
            inspect.write_bytes(b"inspect")
            resolved_track, resolved_inspect = resolve_model_weights(models_dir=root)
            self.assertEqual(track, resolved_track)
            self.assertEqual(inspect, resolved_inspect)


if __name__ == "__main__":
    unittest.main()
