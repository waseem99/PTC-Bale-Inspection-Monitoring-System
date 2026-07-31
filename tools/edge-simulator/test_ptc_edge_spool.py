import sqlite3
import tempfile
import unittest
from pathlib import Path

from ptc_edge_spool import (
    SpoolStore,
    deterministic_camera_status,
    deterministic_event,
    deterministic_health,
    flush,
)


class EdgeSpoolTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.database = Path(self.directory.name) / "spool.sqlite3"
        self.store = SpoolStore(self.database)

    def tearDown(self):
        self.store.close()
        self.directory.cleanup()

    def test_restart_safe_exact_replay(self):
        payload = deterministic_event("CAM-01", "completed", 1)
        item_id = self.store.enqueue("event", payload)
        self.assertEqual(item_id, self.store.enqueue("event", payload))
        self.assertEqual("pending", payload["evidence"]["state"])
        self.store.close()
        self.store = SpoolStore(self.database)
        self.assertEqual([item_id], [item.item_id for item in self.store.pending()])

    def test_conflicting_spool_id_is_rejected(self):
        payload = deterministic_event("CAM-02", "missed", 2)
        self.store.enqueue("event", payload)
        changed = {**payload, "confidence": 1}
        with self.assertRaises(ValueError):
            self.store.enqueue("event", changed)

    def test_acknowledge_duplicate_and_terminal_reject(self):
        self.store.enqueue("event", deterministic_event("CAM-03", "incomplete", 3))
        self.store.enqueue("health", deterministic_health("camera-ingest", 4))
        statuses = iter([(200, '{"status":"duplicate"}'), (422, '{"code":"INVALID"}')])
        result = flush(self.store, lambda _kind, _payload: next(statuses))
        self.assertEqual({"acknowledged": 1, "rejected": 1, "retry": 0}, result)
        self.assertEqual({"acknowledged": 1, "rejected": 1}, self.store.counts())

    def test_transient_failure_remains_pending(self):
        self.store.enqueue("event", deterministic_event("CAM-04", "unresolved", 5))
        result = flush(self.store, lambda _kind, _payload: (503, "unavailable"))
        self.assertEqual(1, result["retry"])
        self.assertEqual({"pending": 1}, self.store.counts())

    def test_camera_status_is_restart_safe_and_has_stable_spool_identity(self):
        payload = deterministic_camera_status("CAM-01", 7, "reconnecting")
        item_id = self.store.enqueue("camera", payload, "SIM-CAMERA-CAM-01-0000000007")
        self.assertEqual("SIM-CAMERA-CAM-01-0000000007", item_id)
        self.store.close()
        self.store = SpoolStore(self.database)
        pending = self.store.pending()
        self.assertEqual("camera", pending[0].kind)
        self.assertEqual("CAM-01", pending[0].payload["_cameraId"])
        self.assertEqual("reconnecting", pending[0].payload["status"])

    def test_legacy_two_kind_database_is_migrated(self):
        legacy_path = Path(self.directory.name) / "legacy.sqlite3"
        connection = sqlite3.connect(legacy_path)
        connection.executescript(
            """
            CREATE TABLE spool (
              item_id TEXT PRIMARY KEY,
              kind TEXT NOT NULL CHECK(kind IN ('event','health')),
              payload TEXT NOT NULL,
              state TEXT NOT NULL CHECK(state IN ('pending','acknowledged','rejected')) DEFAULT 'pending',
              attempts INTEGER NOT NULL DEFAULT 0,
              next_attempt REAL NOT NULL DEFAULT 0,
              last_error TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            """
        )
        connection.commit()
        connection.close()
        migrated = SpoolStore(legacy_path)
        try:
            migrated.enqueue(
                "camera",
                deterministic_camera_status("CAM-02", 8, "online"),
                "SIM-CAMERA-CAM-02-0000000008",
            )
            self.assertEqual({"pending": 1}, migrated.counts())
        finally:
            migrated.close()


if __name__ == "__main__":
    unittest.main()
