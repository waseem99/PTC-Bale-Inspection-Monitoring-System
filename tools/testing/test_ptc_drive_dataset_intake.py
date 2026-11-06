"""Offline unit tests for the protected, metadata-only PTC Drive intake utility."""
import unittest

from ptc_drive_dataset_intake import iter_folder_tree, summarize


class DriveIntakeTests(unittest.TestCase):
    def test_pagination_and_nested_folders(self):
        calls = []

        def fetch(folder, token, _access):
            calls.append((folder, token))
            if folder == "bale-root" and token is None:
                return {
                    "files": [
                        {"id": "frame-1", "name": "cam1_101_001_frame_000001.jpg",
                         "mimeType": "image/jpeg", "size": "200"},
                        {"id": "nested-folder", "name": "second",
                         "mimeType": "application/vnd.google-apps.folder"},
                    ],
                    "nextPageToken": "page2",
                }
            if folder == "bale-root" and token == "page2":
                return {"files": [{"id": "frame-2", "name": "cam1_101_001_frame_000002.jpg",
                                   "mimeType": "image/jpeg", "size": "210"}]}
            if folder == "nested-folder" and token is None:
                return {"files": [{"id": "frame-3", "name": "cam1_101_002_frame_000003.jpg",
                                   "mimeType": "image/jpeg", "size": "220"}]}
            raise AssertionError("Unexpected Drive page")

        rows = list(iter_folder_tree("bale-root", "bale", "mock-token", fetch))
        self.assertEqual(len(rows), 3)
        self.assertEqual({x["id"] for x in rows}, {"frame-1", "frame-2", "frame-3"})
        self.assertIn(("bale-root", "page2"), calls)
        self.assertIn(("nested-folder", None), calls)
        self.assertEqual(rows[2]["relative_folder"], "second")

    def test_sanitized_summary_and_lack_of_assumptions(self):
        rows = [
            {
                "role": "bale", "relative_folder": "", "id": "secret-id-1",
                "name": "cam1_101_038_frame_002401.jpg", "mime_type": "image/jpeg",
                "size_bytes": 749590, "md5": "secret-md5",
            },
            {
                "role": "bale", "relative_folder": "", "id": "secret-id-2",
                "name": "cam1_101_038_frame_002401.jpg", "mime_type": "image/jpeg",
                "size_bytes": 749590, "md5": None,
            },
            {
                "role": "inspection", "relative_folder": "", "id": "secret-id-3",
                "name": "cam4_401_009_frame_000001.jpg", "mime_type": "image/jpeg",
                "size_bytes": 750000, "md5": None,
            },
        ]
        result = summarize(rows, {"bale": None, "inspection": 1})
        self.assertEqual(result["bale"]["listed_file_count"], 2)
        self.assertEqual(result["bale"]["duplicate_relative_names"], 1)
        self.assertEqual(result["bale"]["duplicate_frame_keys"], 1)
        self.assertEqual(result["bale"]["filename_segment_count"], 1)
        self.assertIsNone(result["bale"]["count_matches_declared"])
        self.assertEqual(result["inspection"]["count_matches_declared"], True)
        self.assertEqual(result["inspection"]["video_count"], 0)
        self.assertNotIn("secret-id", str(result))
        self.assertNotIn("secret-md5", str(result))

    def test_repeated_page_token_rejected(self):
        def fetch(_folder, _page_token, _access):
            return {"files": [], "nextPageToken": "repeat"}
        with self.assertRaisesRegex(RuntimeError, "Repeated Drive pagination token"):
            list(iter_folder_tree("folder", "bale", "fake-token", fetch))

    def test_zero_byte_and_label_count(self):
        rows = [
            {"role": "inspection", "relative_folder": "", "id": "1", "name": "capture.mp4",
             "mime_type": "video/mp4", "size_bytes": 1000},
            {"role": "inspection", "relative_folder": "", "id": "2", "name": "labels.json",
             "mime_type": "application/json", "size_bytes": 0},
        ]
        result = summarize(rows, {"bale": 0, "inspection": 2})
        self.assertEqual(result["inspection"]["video_count"], 1)
        self.assertEqual(result["inspection"]["label_like_file_count"], 1)
        self.assertEqual(result["inspection"]["zero_byte_objects"], 1)


if __name__ == "__main__":
    unittest.main()
