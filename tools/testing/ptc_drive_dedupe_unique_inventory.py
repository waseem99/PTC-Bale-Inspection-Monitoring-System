#!/usr/bin/env python3
"""Deduplicate a restricted PTC Drive manifest without altering source objects.

Only duplicate names with matching, nonempty provider MD5 and positive, equal
sizes may be excluded. All detailed inventories remain restricted and outside
Git; the sanitized summary contains aggregate counts and artifact hashes only.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import os
import re
from pathlib import Path
import sys
import uuid


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()



ROLES = ("bale", "inspection")


def _valid_size(row: dict) -> bool:
    size = row.get("size_bytes")
    return type(size) is int and size > 0


def unique_rows(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """Return a safe unique manifest, or fail without dropping uncertain data.

    Source IDs, names and hashes must never be placed in error messages, logs or
    a sanitized report. Duplicate keys are case-insensitive within each role
    and relative folder.
    """
    if not rows:
        raise ValueError("Empty intake manifest; no annotation corpus is ready")
    by_key: dict[tuple[str, str, str], list[dict]] = collections.defaultdict(list)
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid intake manifest row type")
        role = row.get("role")
        name = row.get("name")
        folder = row.get("relative_folder") or ""
        if role not in ROLES or not isinstance(name, str) or not name.strip():
            raise ValueError("Invalid manifest role/name fields")
        if not isinstance(folder, str) or not row.get("id"):
            raise ValueError("Invalid manifest folder/id fields")
        if not _valid_size(row):
            raise ValueError("Zero, negative or missing file size: corpus not ready")
        key = (role, folder.casefold(), name.casefold())
        by_key[key].append(row)

    kept: list[dict] = []
    dropped: list[dict] = []
    for (role, _folder, _name), items in by_key.items():
        ordered = sorted(items, key=lambda r: (r.get("created_time") or "", str(r["id"])))
        original = ordered[0]
        kept.append(original)
        for extra in ordered[1:]:
            base_md5 = original.get("md5")
            extra_md5 = extra.get("md5")
            same_md5 = (
                isinstance(base_md5, str)
                and isinstance(extra_md5, str)
                and bool(re.fullmatch(r"[0-9a-fA-F]{32}", base_md5.strip()))
                and bool(re.fullmatch(r"[0-9a-fA-F]{32}", extra_md5.strip()))
                and base_md5.strip().casefold() == extra_md5.strip().casefold()
            )
            if not same_md5 or original["size_bytes"] != extra["size_bytes"]:
                raise ValueError(
                    f"Unverifiable {role} name collision: matching nonempty MD5 "
                    "and positive equal file sizes required; no rows dropped"
                )
            dropped.append({
                "role": role,
                "name": extra["name"],
                "kept_id": original["id"],
                "dropped_id": extra["id"],
                "same_md5": True,
                "size_bytes": extra["size_bytes"],
                "md5": extra_md5,
            })
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


def run(manifest: Path, output_dir: Path) -> tuple[Path, dict]:
    repo_root = Path(__file__).resolve().parents[2]
    destination = output_dir.expanduser().resolve()
    if destination == repo_root or repo_root in destination.parents:
        raise ValueError("Output must be outside the repository")
    # Source manifests contain restricted Drive object IDs and file names.
    source = manifest.expanduser().resolve()
    if source == repo_root or repo_root in source.parents:
        raise ValueError("Restricted source manifest must be outside the repository")
    rows = [
        json.loads(line)
        for line in source.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    # Validate the entire corpus before creating a report or dropping rows.
    kept, dropped = unique_rows(rows)
    folder_stats = summarize(kept)
    old_umask = os.umask(0o077)
    try:
        run_dir = destination / (
            "ptc-unique-"
            + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            + "-"
            + uuid.uuid4().hex[:8]
        )
        run_dir.mkdir(parents=True, exist_ok=False, mode=0o700)
        run_dir.chmod(0o700)
        unique_manifest = run_dir / "unique-manifest-RESTRICTED.jsonl"
        with unique_manifest.open("x", encoding="utf-8") as handle:
            for row in kept:
                handle.write(json.dumps(row, sort_keys=True) + "\n")
        private_dropped = run_dir / "dropped-identical-duplicates-RESTRICTED.json"
        private_dropped.write_text(
            json.dumps(dropped, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        report = {
            "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "type": "logical unique inventory; Drive objects are not deleted",
            "source_manifest_sha256": _sha256(source),
            "unique_manifest_sha256": _sha256(unique_manifest),
            "folders": folder_stats,
            "dropped_duplicate_count": len(dropped),
            "all_dropped_same_md5": True,
            "all_dropped_same_md5_and_size": True,
            "expected_unique_counts": {
                role: folder_stats[role]["unique_file_count"] for role in ROLES
            },
            "annotation_corpus_ready_metadata": all(
                folder_stats[role]["zero_byte_objects"] == 0
                and folder_stats[role]["missing_size_metadata"] == 0
                for role in ROLES
            ),
            "training_and_end_to_end_ai_acceptance": "NOT CERTIFIED",
        }
        summary = run_dir / "unique-summary-SANITIZED.json"
        summary.write_text(
            json.dumps(report, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        checksums = run_dir / "checksums.sha256"
        checksums.write_text(
            f"{_sha256(unique_manifest)}  {unique_manifest.name}\n"
            f"{_sha256(summary)}  {summary.name}\n"
            f"{_sha256(private_dropped)}  {private_dropped.name}\n",
            encoding="utf-8",
        )
        for path in (unique_manifest, private_dropped, summary, checksums):
            path.chmod(0o600)
    finally:
        os.umask(old_umask)
    return run_dir, report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        _run_dir, report = run(args.manifest, args.output_dir)
    except (ValueError, OSError, TypeError, KeyError, json.JSONDecodeError) as exc:
        print(f"Dataset unique inventory FAILED: {exc}", file=sys.stderr)
        return 2
    print("Restricted unique output created (identifiers omitted from console)")
    print(
        "Unique totals: "
        + ", ".join(
            f"{role}={report['folders'][role]['unique_file_count']}" for role in ROLES
        )
    )
    print(f"Dropped identical duplicates: {report['dropped_duplicate_count']}")
    print(f"Annotation corpus metadata ready: {report['annotation_corpus_ready_metadata']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
