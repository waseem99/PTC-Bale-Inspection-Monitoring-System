from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Iterable

from .config import AiConfig
from .event_mapper import to_platform_payload
from .models import Observation, ObservationKind
from .sop import InspectionSession


def _observation(data: dict) -> Observation:
    return Observation(
        kind=ObservationKind(str(data["kind"])),
        camera_id=str(data["cameraId"]),
        bale_id=str(data["baleId"]),
        timestamp=float(data["timestamp"]),
        confidence=float(data.get("confidence", 1.0)),
        evidence_ref=str(data["evidenceRef"]) if data.get("evidenceRef") else None,
        metadata=dict(data.get("metadata") or {}),
    )


def replay(input_path: Path, output_path: Path | None, config: AiConfig) -> int:
    sessions: dict[tuple[str, str], InspectionSession] = {}
    with input_path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                observation = _observation(json.loads(line))
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
                raise ValueError(f"Invalid observation on line {line_number}: {exc}") from exc
            key = (observation.camera_id, observation.bale_id)
            session = sessions.setdefault(
                key,
                InspectionSession(
                    observation.camera_id,
                    observation.bale_id,
                    observation.timestamp,
                    config.versions.model,
                    config.versions.rules,
                    config.versions.config,
                ),
            )
            session.add(observation)

    lines = [json.dumps(to_platform_payload(session.finalize()), sort_keys=True) for session in sessions.values()]
    output = "\n".join(lines) + ("\n" if lines else "")
    if output_path:
        output_path.write_text(output, encoding="utf-8")
    else:
        sys.stdout.write(output)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="PTC bale inspection AI utilities")
    sub = parser.add_subparsers(dest="command", required=True)
    replay_parser = sub.add_parser("replay", help="Replay normalized observations through the SOP engine")
    replay_parser.add_argument("--input", type=Path, required=True)
    replay_parser.add_argument("--config", type=Path, required=True)
    replay_parser.add_argument("--output", type=Path)
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "replay":
        return replay(args.input, args.output, AiConfig.load(args.config))
    raise AssertionError("Unhandled command")


if __name__ == "__main__":
    raise SystemExit(main())
