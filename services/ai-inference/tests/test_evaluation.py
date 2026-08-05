import unittest

from ptc_ai.evaluation import classification_report, ocr_report


class EvaluationTests(unittest.TestCase):
    def test_classification_metrics(self):
        report = {item.label: item for item in classification_report(["ok", "bad", "bad"], ["ok", "ok", "bad"])}
        self.assertAlmostEqual(0.5, report["ok"].precision)
        self.assertAlmostEqual(0.5, report["bad"].recall)

    def test_ocr_metrics(self):
        report = ocr_report([10.0, 20.0, 30.0], [10.0, None, 31.0])
        self.assertEqual(1, report["unreadable"])
        self.assertAlmostEqual(1 / 3, report["exactMatchRate"])
        self.assertAlmostEqual(0.5, report["meanAbsoluteError"])


if __name__ == "__main__":
    unittest.main()
