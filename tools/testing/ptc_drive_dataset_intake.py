#!/usr/bin/env python3
"""Page through approved PTC Drive folders and create a restricted metadata intake.

Metadata-only: never downloads media, labels, or footage and never claims AI accuracy.
Google Drive read-only bearer access must be supplied via the environment.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

DRIVE_LIST_URL = "https://www.googleapis.com/drive/v3/files"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".mts", ".m4v"}
LABEL_EXTS = {".txt", ".csv", ".json", ".jsonl", ".xml", ".yaml", ".yml"}
FRAME_RE = re.compile(
    r"^(?P<camera>cam\d+)_(?P<source>[^_]+)_(?P<segment>[^_]+)"
    r"_frame_(?P<index>\d+)\.(?:jpg|jpeg|png)$",
    re.IGNORECASE,
)


def _drive_page(folder_id: str, page_token: str | None, access_token: str) -> dict:
    fields = "nextPageToken,files(id,name,mimeType,size,md5Checksum,createdTime,modifiedTime,parents)"
    params = {
        "q": f"'{folder_id}' in parents and trashed = false",
        "fields": fields,
        "pageSize": "1000",
        "supportsAllDrives": "true",
        "includeItemsFromAllDrives": "true",
    }
    if page_token:
        params["pageToken"] = page_token
    url = f"{DRIVE_LIST_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 4:
                raise RuntimeError(
                    f"Drive listing failed (HTTP {exc.code}); verify folder access/scopes"
                ) from None
            time.sleep(min(2 ** attempt, 8))
    raise RuntimeError("Drive listing attempts exhausted")


def iter_folder_tree(root_id: str, role: str, access_token: str, fetch_page=_drive_page):
    queue = collections.deque([(root_id, "")])
    visited_folders = set()
    while queue:
        folder_id, relative = queue.popleft()
        if folder_id in visited_folders:
            continue
        visited_folders.add(folder_id)
        page_token = None
        visited_tokens = set()
        while True:
            page = fetch_page(folder_id, page_token, access_token)
            if not isinstance(page, dict) or not isinstance(page.get("files", []), list):
                raise RuntimeError("Invalid Drive listing response")
            for f in page.get("files", []):
                name = str(f.get("name", ""))
                mime = f.get("mimeType", "")
                if mime == "application/vnd.google-apps.folder":
                    child_id = f.get("id")
                    if not child_id:
                        raise RuntimeError("Drive child folder has no ID")
                    queue.append((child_id, f"{relative}/{name}".strip("/")))
                    continue
                yield {
                    "role": role,
                    "relative_folder": relative,
                    "id": f.get("id"),
                    "name": name,
                    "mime_type": mime,
                    "size_bytes": int(f["size"]) if f.get("size") is not None else None,
                    "md5": f.get("md5Checksum"),
                    "created_time": f.get("createdTime"),
                    "modified_time": f.get("modifiedTime"),
                }
            next_token = page.get("nextPageToken")
            if not next_token:
                break
            if next_token in visited_tokens:
                raise RuntimeError("Repeated Drive pagination token")
            visited_tokens.add(next_token)
            page_token = next_token


def summarize(rows: list[dict], expected: dict[str, int | None]) -> dict:
    output = {}
    for role in ("bale", "inspection"):
        subset = [r for r in rows if r["role"] == role]
        extension_counts = collections.Counter()
        cameras = collections.Counter()
        segments = set()
        seen_names = set()
        seen_frames = set()
        duplicates = 0
        repeated_frames = 0
        images = videos = labels = zero_bytes = missing_sizes = 0
        provider_md5_present = 0
        for f in subset:
            name = f["name"]
            ext = Path(name).suffix.lower()
            extension_counts[ext or "(none)"] += 1
            key = (f["relative_folder"].lower(), name.lower())
            if key in seen_names:
                duplicates += 1
            seen_names.add(key)
            if ext in IMAGE_EXTS:
                images += 1
            if ext in VIDEO_EXTS:
                videos += 1
            if ext in LABEL_EXTS:
                labels += 1
            if f["size_bytes"] == 0:
                zero_bytes += 1
            if f["size_bytes"] is None:
                missing_sizes += 1
            if f.get("md5"):
                provider_md5_present += 1
            m = FRAME_RE.fullmatch(name)
            if m:
                camera = m["camera"].lower()
                camera_source_segment = (camera, m["source"], m["segment"])
                cameras[camera] += 1
                segments.add(camera_source_segment)
                frame_key = (f["relative_folder"].lower(), *camera_source_segment, m["index"])
                if frame_key in seen_frames:
                    repeated_frames += 1
                seen_frames.add(frame_key)
        expected_count = expected.get(role)
        output[role] = {
            "listed_file_count": len(subset),
            "expected_file_count": expected_count,
            "count_matches_declared": len(subset) == expected_count if expected_count is not None else None,
            "image_count": images,
            "video_count": videos,
            "label_like_file_count": labels,
            "extension_counts": dict(sorted(extension_counts.items())),
            "filename_camera_counts": dict(sorted(cameras.items())),
            "filename_segment_count": len(segments),
            "duplicate_relative_names": duplicates,
            "duplicate_frame_keys": repeated_frames,
            "zero_byte_objects": zero_bytes,
            "missing_size_metadata": missing_sizes,
            "provider_md5_available_count": provider_md5_present,
            "total_listed_bytes": sum(f["size_bytes"] or 0 for f in subset),
        }
    return output


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run(args: argparse.Namespace) -> tuple[Path, dict]:
    access_token = os.environ.get("GOOGLE_DRIVE_ACCESS_TOKEN", "").strip()
    if not access_token:
        raise ValueError("Set GOOGLE_DRIVE_ACCESS_TOKEN with approved Drive read-only access")
    if args.bale_folder == args.inspection_folder:
        raise ValueError("Bale and inspection folder IDs must be different")
    repo_root = Path(__file__).resolve().parents[2]
    destination = Path(args.output_dir).expanduser().resolve()
    if destination == repo_root or repo_root in destination.parents:
        raise ValueError("Restricted manifests must be saved outside the repository")
    os.umask(0o077)
    run_dir = destination / (
        "ptc-intake-" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        + "-" + uuid.uuid4().hex[:8]
    )
    run_dir.mkdir(parents=True, exist_ok=False, mode=0o700)
    manifest = run_dir / "drive-manifest-RESTRICTED.jsonl"
    rows = []
    with manifest.open("x", encoding="utf-8") as outfile:
        for role, folder in (("bale", args.bale_folder), ("inspection", args.inspection_folder)):
            for row in iter_folder_tree(folder, role, access_token):
                if not row.get("id"):
                    raise RuntimeError("Drive returned a file with no ID")
                rows.append(row)
                outfile.write(json.dumps(row, sort_keys=True) + "\n")
    stats = summarize(rows, {"bale": args.expected_bale, "inspection": args.expected_inspection})
    issues = []
    for role, result in stats.items():
        if result["count_matches_declared"] is False:
            issues.append(f"{role}: listed count differs from uploader's declared count")
        if result["expected_file_count"] is None:
            issues.append(f"{role}: uploader's final expected count not provided")
        if result["zero_byte_objects"] or result["missing_size_metadata"]:
            issues.append(f"{role}: zero-byte object(s) or missing size metadata")
        if result["duplicate_relative_names"] or result["duplicate_frame_keys"]:
            issues.append(f"{role}: duplicate names/frame keys need review")
        if result["video_count"] == 0:
            issues.append(f"{role}: no source video found inside this folder; check separate recordings")
        if result["label_like_file_count"] == 0:
            issues.append(f"{role}: no label-like files found inside this folder; check separate annotations")
    report = {
        "generated_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "type": "metadata-only Drive intake; not model or site acceptance",
        "source": "two approved PTC Drive subfolders (private source references excluded)",
        "upload_confirmed_complete": bool(args.upload_complete),
        "expected_counts_confirmed": all(x is not None for x in
                                          (args.expected_bale, args.expected_inspection)),
        "permission_and_annotations_approved": False,
        "temporal_ground_truth_approved": False,
        "locked_test_frozen": False,
        "folders": stats,
        "findings": issues,
        "training_and_end_to_end_ai_acceptance": "NOT CERTIFIED",
        "restricted_manifest_sha256": _sha256(manifest),
    }
    report_path = run_dir / "intake-summary-SANITIZED.json"
    with report_path.open("x", encoding="utf-8") as outfile:
        json.dump(report, outfile, indent=2, sort_keys=True)
        outfile.write("\n")
    (run_dir / "checksums.sha256").write_text(
        f"{_sha256(manifest)}  {manifest.name}\n{_sha256(report_path)}  {report_path.name}\n",
        encoding="utf-8",
    )
    return run_dir, report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bale-folder", required=True, help="Drive ID; never logged")
    parser.add_argument("--inspection-folder", required=True, help="Drive ID; never logged")
    parser.add_argument("--output-dir", required=True, help="Approved restricted filesystem path outside Git")
    parser.add_argument("--expected-bale", type=int, default=None)
    parser.add_argument("--expected-inspection", type=int, default=None)
    parser.add_argument("--upload-complete", action="store_true",
                        help="Only after explicit uploader confirmation")
    parser.add_argument("--require-complete", action="store_true",
                        help="Return nonzero unless declared counts, upload and metadata pass")
    args = parser.parse_args()
    for n in (args.expected_bale, args.expected_inspection):
        if n is not None and n < 0:
            parser.error("Expected counts must be non-negative")
    try:
        output, report = run(args)
    except (ValueError, RuntimeError, OSError, urllib.error.URLError) as exc:
        print(f"Dataset metadata audit failed: {exc}", file=sys.stderr)
        return 1
    print(f"Restricted output: {output}")
    print("Sanitized folder totals: " + ", ".join(
        f"{role}={r['listed_file_count']} files" for role, r in report["folders"].items()
    ))
    print("AI release / training approval: NOT CERTIFIED")
    if args.require_complete:
        good = (report["upload_confirmed_complete"]
                and report["expected_counts_confirmed"]
                and all(x["count_matches_declared"] for x in report["folders"].values())
                and all(not x["zero_byte_objects"] and not x["missing_size_metadata"]
                        and not x["duplicate_relative_names"] and not x["duplicate_frame_keys"]
                        for x in report["folders"].values()))
        return 0 if good else 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
