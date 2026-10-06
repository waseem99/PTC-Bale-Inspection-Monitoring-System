import unittest

from ptc_ai.models import AnomalyCode, InspectionOutcome, Observation, ObservationKind
from ptc_ai.sop import InspectionSession


class SopTests(unittest.TestCase):
    def session(self):
        return InspectionSession("CAM-01", "B-1", 100.0, "model-v1", "rules-v1", "config-v1")

    def add(self, session, kind, timestamp, confidence=0.9, metadata=None, evidence_ref=None):
        session.add(
            Observation(
                kind,
                "CAM-01",
                "B-1",
                timestamp,
                confidence,
                evidence_ref=evidence_ref,
                metadata=metadata or {},
            )
        )

    def completed(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100, evidence_ref="evidence://entered")
        self.add(session, ObservationKind.BALE_OPENED, 102, evidence_ref="evidence://opened")
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106, evidence_ref="evidence://hand")
        self.add(session, ObservationKind.GRADING_COMPLETED, 109, evidence_ref="evidence://grading")
        self.add(
            session,
            ObservationKind.ROUTING_REJECTED,
            112,
            metadata={"route": "rejected"},
            evidence_ref="evidence://routing",
        )
        self.add(
            session,
            ObservationKind.WEIGHT_READ,
            115,
            metadata={"value": 52.1, "unit": "kg"},
            evidence_ref="evidence://weight",
        )
        return session

    def test_completed_path(self):
        event = self.completed().finalize(116)
        self.assertEqual(InspectionOutcome.COMPLETED, event.outcome)
        self.assertEqual(AnomalyCode.NONE, event.reason_code)
        self.assertEqual("rejected", event.metadata["route"])
        self.assertTrue(all(step.state == "complete" for step in event.steps))
        self.assertTrue(all(step.evidence_ref for step in event.steps))

    def test_bale_not_opened(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        event = session.finalize(120)
        self.assertEqual(InspectionOutcome.MISSED, event.outcome)
        self.assertEqual(AnomalyCode.BALE_NOT_OPENED, event.reason_code)

    def test_hand_missing(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        event = session.finalize(120)
        self.assertEqual(InspectionOutcome.INCOMPLETE, event.outcome)
        self.assertEqual(AnomalyCode.HAND_INSPECTION_MISSING, event.reason_code)

    def test_hand_incomplete(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_INCOMPLETE, 104)
        event = session.finalize(120)
        self.assertEqual(InspectionOutcome.INCOMPLETE, event.outcome)
        self.assertEqual(AnomalyCode.HAND_INSPECTION_INCOMPLETE, event.reason_code)

    def test_missing_grading(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.ROUTING_ACCEPTED, 112)
        self.add(session, ObservationKind.WEIGHT_READ, 115)
        self.assertEqual(AnomalyCode.GRADING_MISSING, session.finalize().reason_code)

    def test_routing_missing(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.GRADING_COMPLETED, 109)
        self.add(session, ObservationKind.ROUTING_MISSING, 112)
        event = session.finalize(120)
        self.assertEqual(InspectionOutcome.INCOMPLETE, event.outcome)
        self.assertEqual(AnomalyCode.ROUTING_MISSING, event.reason_code)

    def test_route_mismatch(self):
        session = self.completed()
        self.add(session, ObservationKind.ROUTING_MISMATCH, 113, evidence_ref="evidence://route-mismatch")
        event = session.finalize()
        self.assertEqual(InspectionOutcome.INCOMPLETE, event.outcome)
        self.assertEqual(AnomalyCode.ROUTING_MISMATCH, event.reason_code)

    def test_weight_missing(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.GRADING_COMPLETED, 109)
        self.add(session, ObservationKind.ROUTING_ACCEPTED, 112, metadata={"route": "accepted"})
        self.add(session, ObservationKind.WEIGHT_MISSING, 115)
        event = session.finalize()
        self.assertEqual(InspectionOutcome.INCOMPLETE, event.outcome)
        self.assertEqual(AnomalyCode.WEIGHT_MISSING, event.reason_code)

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

    def test_unstable_weight_is_unresolved(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.GRADING_COMPLETED, 109)
        self.add(session, ObservationKind.ROUTING_ACCEPTED, 112)
        self.add(session, ObservationKind.WEIGHT_UNSTABLE, 115, 0.4)
        event = session.finalize()
        self.assertEqual(InspectionOutcome.UNRESOLVED, event.outcome)
        self.assertEqual(AnomalyCode.WEIGHT_UNSTABLE, event.reason_code)

    def test_ambiguous_tracking_is_unresolved(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.TRACK_AMBIGUOUS, 101, 0.2)
        event = session.finalize()
        self.assertEqual(InspectionOutcome.UNRESOLVED, event.outcome)
        self.assertEqual(AnomalyCode.TRACK_OR_ASSOCIATION_AMBIGUOUS, event.reason_code)

    def test_insufficient_visibility_is_unresolved(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.INSUFFICIENT_VISIBILITY, 101, 0.1)
        event = session.finalize()
        self.assertEqual(InspectionOutcome.UNRESOLVED, event.outcome)
        self.assertEqual(AnomalyCode.INSUFFICIENT_VISIBILITY, event.reason_code)

    def test_operational_failures_remain_unresolved_not_process_violations(self):
        cases = [
            (ObservationKind.CAMERA_FAILURE, AnomalyCode.CAMERA_FAILURE),
            (ObservationKind.MODEL_FAILURE, AnomalyCode.MODEL_FAILURE),
            (ObservationKind.SERVICE_FAILURE, AnomalyCode.SERVICE_FAILURE),
        ]
        for kind, expected in cases:
            with self.subTest(kind=kind):
                session = self.session()
                self.add(session, ObservationKind.BALE_ENTERED, 100)
                self.add(session, kind, 101, 0.0, evidence_ref=f"evidence://{kind.value}")
                event = session.finalize()
                self.assertEqual(InspectionOutcome.UNRESOLVED, event.outcome)
                self.assertEqual(expected, event.reason_code)

    def test_out_of_order_is_incomplete(self):
        session = self.session()
        self.add(session, ObservationKind.BALE_ENTERED, 100)
        self.add(session, ObservationKind.BALE_OPENED, 102)
        self.add(session, ObservationKind.GRADING_COMPLETED, 103)
        self.add(session, ObservationKind.HAND_INSPECTION_PROPER, 106)
        self.add(session, ObservationKind.ROUTING_ACCEPTED, 112)
        self.add(session, ObservationKind.WEIGHT_READ, 115)
        event = session.finalize()
        self.assertEqual(InspectionOutcome.INCOMPLETE, event.outcome)
        self.assertEqual(AnomalyCode.SEQUENCE_INCOMPLETE, event.reason_code)

    def test_event_id_is_deterministic(self):
        left = self.completed().finalize().event_id
        right = self.completed().finalize().event_id
        self.assertEqual(left, right)

    def test_event_records_core_release_versions(self):
        event = self.completed().finalize()
        self.assertEqual("model-v1", event.model_version)
        self.assertEqual("rules-v1", event.rule_version)
        self.assertEqual("config-v1", event.config_version)
        self.assertEqual("CAM-01", event.camera_id)


if __name__ == "__main__":
    unittest.main()
