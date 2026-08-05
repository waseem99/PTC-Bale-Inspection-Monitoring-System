import unittest

from ptc_ai.config import CameraRois
from ptc_ai.routing import RouteVerifier


class RoutingTests(unittest.TestCase):
    def setUp(self):
        square = ((0.2, 0.2), (0.8, 0.2), (0.8, 0.8), (0.2, 0.8))
        self.verifier = RouteVerifier(
            CameraRois(
                inspection=square,
                accepted=((0.8, 0.2), (1.0, 0.2), (1.0, 0.8), (0.8, 0.8)),
                rejected=((0.0, 0.2), (0.2, 0.2), (0.2, 0.8), (0.0, 0.8)),
                scale_display=((0.8, 0.0), (1.0, 0.0), (1.0, 0.2), (0.8, 0.2)),
            )
        )

    def test_left_is_rejected(self):
        result = self.verifier.classify((0.1, 0.5), 10.0, 0.9)
        self.assertEqual("rejected", result.route)

    def test_right_is_accepted(self):
        result = self.verifier.classify((0.9, 0.5), 10.0, 0.9)
        self.assertEqual("accepted", result.route)

    def test_grade_route_consistency(self):
        self.assertTrue(RouteVerifier.is_consistent("rejected", "rejected"))
        self.assertFalse(RouteVerifier.is_consistent("accepted", "rejected"))
        self.assertIsNone(RouteVerifier.is_consistent(None, "rejected"))


if __name__ == "__main__":
    unittest.main()
