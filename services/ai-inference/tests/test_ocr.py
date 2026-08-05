import unittest

from ptc_ai.ocr import OcrReading, WeightStabilizer


class OcrTests(unittest.TestCase):
    def test_stabilizes_weight(self):
        stabilizer = WeightStabilizer(r"\d+(?:\.\d+)?", "kg", 0.7, 3, 0.05)
        self.assertIsNone(stabilizer.add(OcrReading(1.0, "52.10 kg", 0.9)))
        self.assertIsNone(stabilizer.add(OcrReading(1.1, "52.11", 0.91)))
        result = stabilizer.add(OcrReading(1.2, "52.10", 0.92))
        self.assertIsNotNone(result)
        self.assertAlmostEqual(52.10, result.value, places=2)

    def test_unstable_values_do_not_pass(self):
        stabilizer = WeightStabilizer(r"\d+(?:\.\d+)?", "kg", 0.7, 3, 0.05)
        stabilizer.add(OcrReading(1.0, "52.10", 0.9))
        stabilizer.add(OcrReading(1.1, "58.10", 0.9))
        self.assertIsNone(stabilizer.add(OcrReading(1.2, "52.10", 0.9)))

    def test_low_confidence_clears_window(self):
        stabilizer = WeightStabilizer(r"\d+(?:\.\d+)?", "kg", 0.7, 2, 0.05)
        stabilizer.add(OcrReading(1.0, "52.10", 0.9))
        self.assertIsNone(stabilizer.add(OcrReading(1.1, "52.10", 0.4)))
        self.assertIsNone(stabilizer.add(OcrReading(1.2, "52.10", 0.9)))


if __name__ == "__main__":
    unittest.main()
