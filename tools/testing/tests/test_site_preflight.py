import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.testing import ptc_site_preflight as preflight


def manifest():
    return {
        "schemaVersion": "ptc-site-camera-manifest-v1",
        "siteReference": "SITE-REF",
        "captureSessionReference": "CAPTURE-REF",
        "cameras": [
            {
                "cameraId": f"CAM-0{i}",
                "streamEnvVar": f"PTC_CAM_0{i}_STREAM_URL",
                "physicalView": f"view-{i}",
                "expected": {"minWidth": 1280, "minHeight": 720, "minFps": 10},
            }
            for i in range(1, 5)
        ],
        "manualChecks": {key: None for key in preflight.REQUIRED_MANUAL_CHECKS},
    }


def roi_config():
    polygon = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]
    return {
        "approval": {"approved": False, "approvedBy": "PENDING", "approvedAt": None},
        "versions": {"config": "ptc-camera-roi-template-v2"},
        "cameras": {
            camera_id: {name: polygon for name in preflight.REQUIRED_ROIS}
            for camera_id in preflight.REQUIRED_CAMERA_IDS
        },
    }


class SitePreflightTests(unittest.TestCase):
    def test_manifest_requires_exact_camera_set(self):
        data = manifest()
        data["cameras"][3]["cameraId"] = "CAM-05"
        with self.assertRaises(preflight.ValidationError):
            preflight.validate_manifest(data)

    def test_roi_requires_entry_and_grading(self):
        data = roi_config()
        del data["cameras"]["CAM-01"]["entry"]
        with self.assertRaises(preflight.ValidationError):
            preflight.validate_roi_config(data)

    def test_sanitizer_removes_stream_secret_and_private_host(self):
        url = "rtsp://viewer:super-secret@192.168.20.41:554/live"
        raw = f"failed to open {url}; host 192.168.20.41 refused"
        safe = preflight.sanitize_text(raw, url)
        self.assertNotIn("super-secret", safe)
        self.assertNotIn("192.168.20.41", safe)
        self.assertNotIn(url, safe)

    def test_parse_rate(self):
        self.assertEqual(25.0, preflight._parse_rate("25/1"))
        self.assertAlmostEqual(29.97, preflight._parse_rate("30000/1001"), places=2)
        self.assertIsNone(preflight._parse_rate("0/0"))

    def test_probe_report_does_not_write_stream_url(self):
        spec = preflight.CameraSpec("CAM-01", "PTC_CAM_01_STREAM_URL", "entry-view", 1280, 720, 10.0)
        secret_url = "rtsp://user:password@10.20.30.40:554/stream"
        probe = ({"codec": "h264", "width": 1920, "height": 1080, "fps": 25.0}, None)
        with patch.dict(os.environ, {"PTC_CAM_01_STREAM_URL": secret_url}, clear=False), patch.object(
            preflight, "_probe_once", side_effect=[probe, probe]
        ):
            result = preflight.probe_camera(spec, "ffprobe", 2, 3)
        serialized = json.dumps(result)
        self.assertNotIn(secret_url, serialized)
        self.assertNotIn("password", serialized)
        self.assertTrue(result["repeatProbePassed"])
        self.assertTrue(result["meetsExpectedMinimums"])

    def test_validate_only_requires_no_stream_or_ffprobe(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest_path = root / "manifest.json"
            roi_path = root / "roi.json"
            output_path = root / "report.json"
            manifest_path.write_text(json.dumps(manifest()), encoding="utf-8")
            roi_path.write_text(json.dumps(roi_config()), encoding="utf-8")
            exit_code = preflight.main(
                [
                    "--manifest",
                    str(manifest_path),
                    "--roi-config",
                    str(roi_path),
                    "--output",
                    str(output_path),
                    "--validate-only",
                    "--ffprobe",
                    "definitely-not-installed",
                ]
            )
            self.assertEqual(0, exit_code)
            report = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual("prepared", report["status"])
            self.assertEqual([], report["cameras"])


if __name__ == "__main__":
    unittest.main()
