import unittest

from ptc_ai.models import AnomalyCode, InspectionOutcome, Observation, ObservationKind
from ptc_ai.sop import InspectionSession


class SopTests(unittest.TestCase):
    def session(self):
        return InspectionSession("CAM-01", "B-1", 100.0, "model-v1", "rules-v1", "config-v1")

    def add(self, session, kind, timestamp, confidence=0.9, metadata=None):
        session.add(Observation(kind, "CAM-01", "B-1", timestamp, confidence, metadata=metadata or {}))

    def completed(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.GRADING_COMPLETED, 109)
        self.add(session, ObservationKind.ROUTING_REJECTED, 112, metadata={"route": "rejected"})
        self.add(session, ObservationKind.WEIGHT_READ, 115, metadata={"value": 52.1, "unit": "kg"})
        return session

    def test_completed_path(self):
        event = self.completed().finalize(116)
        self.assertEqual(InspectionOutcome.COMPLETED, event.outcome)
        self.assertEqual(AnomalyCode.NONE, event.reason_code)
        self.assertEqual("rejected", event.metadata["route"])

    def test_bale_not_opened(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        event = session.finalize(120)
        self.assertEqual(InspectionOutcome.MISSED, event.outcome)
        self.assertEqual(AnomalyCode.BALE_NOT_OPENED, event.reason_code)

    def test_hand_incomplete(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_INCOMPLETE, 104)
        event = session.finalize(120)
        self.assertEqual(AnomalyCode.HAND_INSPECTION_INCOMPLETE, event.reason_code)

    def test_missing_grading(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.ROUTING_ACCEPTED, 112)
        self.add(session, ObservationKind.WEIGHT_READ, 115)
        self.assertEqual(AnomalyCode.GRADING_MISSING, session.finalize().reason_code)

    def test_route_mismatch(self):
        session = self.completed()
        self.add(session, ObservationKind.ROUTING_MISMATCH, 113)
        self.assertEqual(AnomalyCode.ROUTING_MISMATCH, session.finalize().reason_code)

    def test_unreadable_weight_is_unresolved(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.GRADING_COMPLETED, 109)
        self.add(session, ObservationKind.ROUTING_ACCEPTED, 112)
        self.add(session, ObservationKind.WEIGHT_UNREADABLE, 115, 0.3)
        event = session.finalize()
        self.assertEqual(InspectionOutcome.UNRESOLVED, event.outcome)
        self.assertEqual(AnomalyCode.WEIGHT_UNREADABLE, event.reason_code)

    def test_out_of_order_is_incomplete(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.GRADING_COMPLETED, 103)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.ROUTING_ACCEPTED, 112)
        self.add(session, ObservationKind.WEIGHT_READ, 115)
        event = session.finalize()
        self.assertEqual(AnomalyCode.SEQUENCE_INCOMPLETE, event.reason_code)

    def test_event_id_is_deterministic(self):
        left = self.completed().finalize().event_id
        right = self.completed().finalize().event_id
        self.assertEqual(left, right)


if __name__ == "__main__":
    unittest.main()
