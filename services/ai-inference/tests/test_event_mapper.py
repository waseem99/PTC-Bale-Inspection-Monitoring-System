import unittest

from ptc_ai.event_mapper import PLATFORM_EVENT_KEYS, to_audit_payload, to_platform_payload
from ptc_ai.models import Observation, ObservationKind
from ptc_ai.sop import InspectionSession


class EventMapperTests(unittest.TestCase):
    def event(self):
        session = InspectionSession("CAM-01", "B-1", 1_800_000_000, "m1", "r1", "c1")
        for kind, timestamp, metadata in [
            (ObservationKind.BALE_ENTERED, 1_800_000_000, {}),
            (ObservationKind.BALE_OPENED, 1_800_000_001, {}),
            (ObservationKind.HAND_INSPECTION_PROPER, 1_800_000_002, {}),
            (ObservationKind.GRADING_COMPLETED, 1_800_000_003, {}),
            (ObservationKind.ROUTING_ACCEPTED, 1_800_000_004, {"route": "accepted"}),
            (ObservationKind.WEIGHT_READ, 1_800_000_005, {"value": 52.1, "unit": "kg"}),
        ]:
            session.add(Observation(kind, "CAM-01", "B-1", timestamp, 0.9, metadata=metadata))
        return session.finalize()

    def test_platform_payload_matches_strict_ingestion_shape(self):
        payload = to_platform_payload(self.event())
        self.assertEqual(PLATFORM_EVENT_KEYS, set(payload))
        self.assertEqual("completed", payload["outcome"])
        self.assertEqual("edge", payload["source"])
        self.assertNotIn("aiMetadata", payload)
        self.assertEqual(6, len(payload["steps"]))
        self.assertIn("Bale B-1", payload["summary"])
        self.assertTrue(payload["timestamp"].endswith("Z"))

    def test_audit_payload_preserves_ai_metadata(self):
        payload = to_audit_payload(self.event())
        self.assertEqual("B-1", payload["baleId"])
        self.assertEqual("NONE", payload["reasonCode"])
        self.assertEqual("accepted", payload["metadata"]["route"])
        self.assertEqual(52.1, payload["metadata"]["weight"])


if __name__ == "__main__":
    unittest.main()
