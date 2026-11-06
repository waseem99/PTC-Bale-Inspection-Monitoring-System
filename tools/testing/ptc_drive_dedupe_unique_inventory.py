#!/usr/bin/env python3
"""Build a unique-name inventory from a restricted Drive intake manifest.

Keeps the earliest createdTime (then id) for identical-name duplicates.
Writes sanitized unique totals outside Git. Does not call Drive write APIs.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path
import uuid


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def unique_rows(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    by_key: dict[tuple[str, str, str], list[dict]] = collections.defaultdict(list)
    for row in rows:
        key = (row["role"], (row.get("relative_folder") or "").lower(), row["name"].lower())
        by_key[key].append(row)
    kept: list[dict] = []
    dropped: list[dict] = []
    for items in by_key.values():
        ordered = sorted(
            items,
            key=lambda r: (r.get("created_time") or "", r.get("id") or ""),
        )
        kept.append(ordered[0])
        for extra in ordered[1:]:
            dropped.append(
                {
                    "role": extra["role"],
                    "name": extra["name"],
                    "kept_id": ordered[0].get("id"),
                    "dropped_id": extra.get("id"),
                    "same_md5": ordered[0].get("md5") == extra.get("md5"),
                    "md5": extra.get("md5"),
                }
            )
    kept.sort(key=lambda r: (r["role"], r.get("relative_folder") or "", r["name"]))
    return kept, dropped


def summarize(rows: list[dict]) -> dict:
    out = {}
    for role in ("bale", "inspection"):
        subset = [r for r in rows if r["role"] == role]
        out[role] = {
            "unique_file_count": len(subset),
            "total_listed_bytes": sum(r.get("size_bytes") or 0 for r in subset),
            "zero_byte_objects": sum(1 for r in subset if r.get("size_bytes") == 0),
            "missing_size_metadata": sum(1 for r in subset if r.get("size_bytes") is None),
            "provider_md5_available_count": sum(1 for r in subset if r.get("md5")),
        }
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parents[2]
    destination = args.output_dir.expanduser().resolve()
    if destination == repo_root or repo_root in destination.parents:
        raise SystemExit("Output must be outside the repository")
    rows = [
        json.loads(line)
        for line in args.manifest.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    kept, dropped = unique_rows(rows)
    run_dir = destination / (
        "ptc-unique-"
        + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        + "-"
        + uuid.uuid4().hex[:8]
    )
    run_dir.mkdir(parents=True, exist_ok=False)
    unique_manifest = run_dir / "unique-manifest-RESTRICTED.jsonl"
    with unique_manifest.open("x", encoding="utf-8") as handle:
        for row in kept:
            handle.write(json.dumps(row, sort_keys=True) + "\n")
    dropped_path = run_dir / "dropped-identical-duplicates-SANITIZED.json"
    dropped_path.write_text(json.dumps(dropped, indent=2) + "\n", encoding="utf-8")
    report = {
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "type": "logical unique inventory; Drive objects may still contain duplicates until owner trash",
        "source_manifest_sha256": _sha256(args.manifest.resolve()),
        "unique_manifest_sha256": None,
        "folders": summarize(kept),
        "dropped_duplicate_count": len(dropped),
        "all_dropped_same_md5": all(d.get("same_md5") for d in dropped) if dropped else True,
        "expected_unique_counts": {
            "bale": summarize(kept)["bale"]["unique_file_count"],
            "inspection": summarize(kept)["inspection"]["unique_file_count"],
        },
        "annotation_corpus_ready_metadata": (
            len(dropped) == 0 or all(d.get("same_md5") for d in dropped)
        )
        and all(
            summarize(kept)[role]["zero_byte_objects"] == 0
            and summarize(kept)[role]["missing_size_metadata"] == 0
            for role in ("bale", "inspection")
        ),
        "training_and_end_to_end_ai_acceptance": "NOT CERTIFIED",
    }
    report["unique_manifest_sha256"] = _sha256(unique_manifest)
    summary = run_dir / "unique-summary-SANITIZED.json"
    summary.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (run_dir / "checksums.sha256").write_text(
        f"{_sha256(unique_manifest)}  {unique_manifest.name}\n"
        f"{_sha256(summary)}  {summary.name}\n"
        f"{_sha256(dropped_path)}  {dropped_path.name}\n",
        encoding="utf-8",
    )
    print(f"Restricted unique output: {run_dir}")
    print(
        "Unique totals: "
        + ", ".join(f"{role}={report['folders'][role]['unique_file_count']}" for role in report["folders"])
    )
    print(f"Dropped identical duplicates: {len(dropped)}")
    print(f"Annotation corpus metadata ready: {report['annotation_corpus_ready_metadata']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
