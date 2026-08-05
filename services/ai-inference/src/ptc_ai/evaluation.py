from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True, slots=True)
class ClassificationMetrics:
    label: str
    true_positive: int
    false_positive: int
    false_negative: int
    precision: float
    recall: float
    f1: float


def classification_report(expected: Iterable[str], predicted: Iterable[str]) -> list[ClassificationMetrics]:
    expected_list = list(expected)
    predicted_list = list(predicted)
    if len(expected_list) != len(predicted_list):
        raise ValueError("expected and predicted must have the same length")
    labels = sorted(set(expected_list) | set(predicted_list))
    report: list[ClassificationMetrics] = []
    for label in labels:
        tp = sum(1 for left, right in zip(expected_list, predicted_list) if left == label and right == label)
        fp = sum(1 for left, right in zip(expected_list, predicted_list) if left != label and right == label)
        fn = sum(1 for left, right in zip(expected_list, predicted_list) if left == label and right != label)
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        report.append(ClassificationMetrics(label, tp, fp, fn, precision, recall, f1))
    return report


def ocr_report(expected: Iterable[float], predicted: Iterable[float | None]) -> dict[str, float | int]:
    expected_list = list(expected)
    predicted_list = list(predicted)
    if len(expected_list) != len(predicted_list):
        raise ValueError("expected and predicted must have the same length")
    exact = 0
    absolute_error = 0.0
    unreadable = 0
    for left, right in zip(expected_list, predicted_list):
        if right is None:
            unreadable += 1
            continue
        if left == right:
            exact += 1
        absolute_error += abs(left - right)
    readable = len(expected_list) - unreadable
    return {
        "total": len(expected_list),
        "readable": readable,
        "unreadable": unreadable,
        "exactMatchRate": exact / len(expected_list) if expected_list else 0.0,
        "meanAbsoluteError": absolute_error / readable if readable else 0.0,
    }


def reason_counts(values: Iterable[str]) -> dict[str, int]:
    return dict(Counter(values))
