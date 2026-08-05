import unittest

from ptc_ai.interaction import HandInspectionClassifier, HandSample


class InteractionTests(unittest.TestCase):
    def setUp(self):
        self.classifier = HandInspectionClassifier(2.0, 0.04, 0.6)

    def test_proper_hand_inspection(self):
        samples = [
            HandSample(0.0, True, 0.0, 0.8),
            HandSample(1.0, True, 0.02, 0.8),
            HandSample(2.2, True, 0.03, 0.9),
        ]
        result = self.classifier.classify(samples)
        self.assertEqual("proper", result.classification)

    def test_brief_touch_is_incomplete(self):
        samples = [HandSample(0.0, True, 0.0, 0.9), HandSample(0.3, True, 0.01, 0.9)]
        self.assertEqual("incomplete", self.classifier.classify(samples).classification)

    def test_occlusion_is_unresolved(self):
        samples = [HandSample(0.0, False, 0.0, 0.0, False), HandSample(1.0, False, 0.0, 0.0, False)]
        self.assertEqual("unresolved", self.classifier.classify(samples).classification)


if __name__ == "__main__":
    unittest.main()
