"""Synthetic, offline tests for the protected PTC Drive duplicate inventory."""
from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
import io
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest

from ptc_drive_dedupe_unique_inventory import main, run, unique_rows


HASH_A = "a" * 32
HASH_B = "b" * 32


def row(name="cam1_101_001_frame_000001.jpg", *, role="bale", folder="",
        identifier="private-1", md5=HASH_A, size=250,
        created="2026-11-06T09:00:00Z"):
    return {
        "role": role,
        "relative_folder": folder,
        "id": identifier,
        "name": name,
        "md5": md5,
        "size_bytes": size,
        "created_time": created,
    }


class UniqueInventoryTests(unittest.TestCase):
    def test_exact_identical_duplicates_keep_oldest(self):
        newer = row(identifier="newer-secret", created="2026-11-06T10:00:00Z")
        older = row(identifier="older-secret", created="2026-11-06T09:00:00Z")
        kept, dropped = unique_rows([newer, older])
        self.assertEqual(kept, [older])
        self.assertEqual(len(dropped), 1)
        self.assertEqual(dropped[0]["kept_id"], "older-secret")
        self.assertTrue(dropped[0]["same_md5"])

    def test_missing_duplicate_md5_fails_closed(self):
        for hashes in ((None, None), ("", ""), (HASH_A, None), (None, HASH_A), ("invalid", "invalid")):
            with self.subTest(hashes=hashes), self.assertRaisesRegex(ValueError, "Unverifiable"):
                unique_rows([row(md5=hashes[0]), row(identifier="private-2", md5=hashes[1])])

    def test_conflicting_duplicate_md5_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "Unverifiable"):
            unique_rows([row(), row(identifier="private-2", md5=HASH_B)])

    def test_conflicting_size_fails_closed(self):
        with self.assertRaisesRegex(ValueError, "equal file sizes"):
            unique_rows([row(), row(identifier="private-2", size=249)])

    def test_zero_negative_missing_size_fail_closed(self):
        for sz in (0, -2, None, "250"):
            with self.subTest(sz=sz), self.assertRaisesRegex(ValueError, "file size"):
                unique_rows([row(size=sz)])

    def test_name_and_folder_casefold_and_role_scoping(self):
        first = row(folder="SECTION/A")
        second = row(identifier="private-2", folder="section/a", name="CAM1_101_001_FRAME_000001.JPG")
        separate_role = row(identifier="private-3", role="inspection", folder="section/a")
        separate_folder = row(identifier="private-4", folder="section/b")
        kept, dropped = unique_rows([first, second, separate_role, separate_folder])
        self.assertEqual(len(kept), 3)
        self.assertEqual(len(dropped), 1)

    def test_empty_and_invalid_rows_rejected(self):
        for rows in ([], [row(identifier="")], [row(name="")], [row(role="random")]):
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                unique_rows(rows)

    def _invoke(self, records):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = root / "private-source.jsonl"
            manifest.write_text("".join(json.dumps(r) + "\n" for r in records), encoding="utf-8")
            out = root / "restricted-output"
            stderr, stdout = io.StringIO(), io.StringIO()
            with redirect_stderr(stderr), redirect_stdout(stdout):
                code = main(["--manifest", str(manifest), "--output-dir", str(out)])
            outputs = list(out.glob("ptc-unique-*"))
            return code, stdout.getvalue(), stderr.getvalue(), [
                (f.name, f.read_text(encoding="utf-8")) for d in outputs for f in d.iterdir()
            ], [stat.S_IMODE(d.stat().st_mode) for d in outputs], [
                stat.S_IMODE(f.stat().st_mode) for d in outputs for f in d.iterdir()
            ]

    def test_success_outputs_private_vs_sanitized_and_file_modes(self):
        first = row(identifier="sensitive-id-one", name="secret-frame.jpg")
        extra = row(identifier="sensitive-id-two", name="secret-frame.jpg")
        code, out, err, files, directory_modes, file_modes = self._invoke([first, extra])
        self.assertEqual(code, 0, err)
        self.assertIn("bale=1", out)
        self.assertNotIn("sensitive-id", out + err)
        by_name = dict(files)
        self.assertEqual(len(files), 4)
        self.assertIn("dropped-identical-duplicates-RESTRICTED.json", by_name)
        restricted = by_name["dropped-identical-duplicates-RESTRICTED.json"]
        self.assertIn("sensitive-id-two", restricted)
        sanitized = by_name["unique-summary-SANITIZED.json"]
        self.assertNotIn("sensitive-id", sanitized)
        self.assertNotIn("secret-frame.jpg", sanitized)
        self.assertNotIn(HASH_A, sanitized)
        report = json.loads(sanitized)
        self.assertEqual(report["dropped_duplicate_count"], 1)
        self.assertTrue(report["annotation_corpus_ready_metadata"])
        self.assertTrue(report["all_dropped_same_md5"])
        self.assertTrue(report["all_dropped_same_md5_and_size"])
        if os.name == "posix":
            self.assertTrue(all(mode == 0o700 for mode in directory_modes))
            self.assertTrue(all(mode == 0o600 for mode in file_modes))

    def test_cli_invalid_duplicate_fails_without_issuing_an_output(self):
        code, out, err, files, _, _ = self._invoke([row(md5=None), row(identifier="private-2", md5=None)])
        self.assertNotEqual(code, 0)
        self.assertEqual(files, [])
        self.assertIn("FAILED", err)
        self.assertNotIn("private-2", err)
        self.assertNotIn("frame_", err)

    def test_cli_missing_size_fails_without_output(self):
        code, _, _, files, _, _ = self._invoke([row(size=0)])
        self.assertNotEqual(code, 0)
        self.assertEqual(files, [])

    def test_output_and_source_path_guards(self):
        repo_root = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory() as td:
            manifest = Path(td) / "private.jsonl"
            manifest.write_text(json.dumps(row()) + "\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "outside the repository"):
                run(manifest, repo_root / "DO_NOT_CREATE")
            with self.assertRaisesRegex(ValueError, "outside the repository"):
                run(manifest, repo_root)

    def test_summary_without_duplicates_is_not_model_acceptance(self):
        code, _, err, files, _, _ = self._invoke([row(), row(role="inspection", identifier="private-2")])
        self.assertEqual(code, 0, err)
        report = json.loads(dict(files)["unique-summary-SANITIZED.json"])
        self.assertEqual(report["dropped_duplicate_count"], 0)
        self.assertEqual(report["training_and_end_to_end_ai_acceptance"], "NOT CERTIFIED")


if __name__ == "__main__":
    unittest.main()
