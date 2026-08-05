from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from tools.testing.ptc_acceptance import (
    REQUIRED_SCENARIO_CODES,
    STRICT_EVENT_KEYS,
    AcceptanceError,
    build_event,
    generate_events,
    load_manifest,
    offline_record,
    read_jsonl,
)

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "tools" / "testing" / "scenarios.json"


class AcceptancePackageTests(unittest.TestCase):
    def test_manifest_covers_every_required_scenario(self):
        manifest = load_manifest(MANIFEST)
        codes = {row["code"] for row in manifest["scenarios"]}
        self.assertTrue(REQUIRED_SCENARIO_CODES.issubset(codes))

    def test_generated_events_match_strict_contract(self):
        events = generate_events(load_manifest(MANIFEST))
        self.assertGreaterEqual(len(events), len(REQUIRED_SCENARIO_CODES))
        self.assertEqual(len(events), len({event["id"] for event in events}))
        for event in events:
            self.assertEqual(STRICT_EVENT_KEYS, set(event))
            self.assertEqual("simulator", event["source"])
            self.assertEqual(6, len(event["steps"]))

    def test_generation_is_deterministic(self):
        manifest = load_manifest(MANIFEST)
        self.assertEqual(generate_events(manifest), generate_events(manifest))

    def test_invalid_manifest_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.json"
            path.write_text(json.dumps({"scenarios": []}), encoding="utf-8")
            with self.assertRaises(AcceptanceError):
                load_manifest(path)

    def test_offline_record_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            record = offline_record(MANIFEST, output)
            self.assertEqual("passed", record["status"])
            rows = read_jsonl(output / "synthetic-events.jsonl")
            expected = json.loads((output / "expected-results.json").read_text(encoding="utf-8"))
            self.assertEqual(len(rows), expected["scenarioCount"])
            self.assertTrue((output / "offline-acceptance-record.json").exists())

    def test_event_id_limit_is_enforced(self):
        scenario = {
            "code": "X" * 60,
            "outcome": "completed",
            "reason": "Inspection completed",
            "confidence": 90,
            "stepStates": ["complete"] * 6,
        }
        with self.assertRaises(AcceptanceError):
            build_event(scenario, 1)


if __name__ == "__main__":
    unittest.main()
