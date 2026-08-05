import unittest

from ptc_ai.event_mapper import to_platform_payload
from ptc_ai.models import Observation, ObservationKind
from ptc_ai.sop import InspectionSession


class EventMapperTests(unittest.TestCase):
    def test_platform_payload_matches_ingestion_shape(self):
        session = InspectionSession("CAM-01", "B-1", 100, "m1", "r1", "c1")
        for kind, timestamp in [
            (ObservationKind.BALE_ENTERED, 100),
            (ObservationKind.BALE_OPENED, 101),
            (ObservationKind.HAND_INSPECTION_PROPER, 102),
            (ObservationKind.GRADING_COMPLETED, 103),
            (ObservationKind.ROUTING_ACCEPTED, 104),
            (ObservationKind.WEIGHT_READ, 105),
        ]:
            session.add(Observation(kind, "CAM-01", "B-1", timestamp, 0.9))
        payload = to_platform_payload(session.finalize())
        required = {
            "id", "cameraId", "cameraName", "zone", "timestamp", "outcome", "reason",
            "confidence", "summary", "modelVersion", "ruleVersion", "configVersion",
            "edgeVersion", "schemaVersion", "source", "steps", "evidence",
        }
        self.assertTrue(required.issubset(payload))
        self.assertEqual("completed", payload["outcome"])
        self.assertEqual(6, len(payload["steps"]))


if __name__ == "__main__":
    unittest.main()
