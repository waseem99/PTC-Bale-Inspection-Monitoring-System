import tempfile
import unittest
from pathlib import Path

from ptc_edge_spool import SpoolStore, deterministic_event, deterministic_health, flush


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


if __name__ == "__main__":
    unittest.main()
