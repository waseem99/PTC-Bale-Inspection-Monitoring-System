#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from ptc_ai.evaluation import classification_report


def load(path: Path) -> dict[str, dict]:
    rows: dict[str, dict] = {}
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        row = json.loads(line)
        event_id = str(row.get("id") or row.get("eventId") or "")
        if not event_id:
            raise ValueError(f"Missing event ID at {path}:{line_number}")
        rows[event_id] = row
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected", type=Path, required=True)
    parser.add_argument("--predicted", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    expected = load(args.expected)
    predicted = load(args.predicted)
    shared = sorted(set(expected) & set(predicted))
    missing = sorted(set(expected) - set(predicted))
    extra = sorted(set(predicted) - set(expected))
    report = classification_report(
        [str(expected[item]["outcome"]) for item in shared],
        [str(predicted[item]["outcome"]) for item in shared],
    )
    payload = {
        "matchedEvents": len(shared),
        "missingEventIds": missing,
        "extraEventIds": extra,
        "outcomeMetrics": [asdict(item) for item in report],
    }
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
