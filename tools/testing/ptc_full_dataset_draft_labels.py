#!/usr/bin/env python3
"""PTC full-corpus, multi-instance, YOLO draft proposals (NOT approved labels).

This program processes all deduplicated images using a locally available,
class-compatible PTC detector on an authorized machine. It never uploads media,
and it never promotes AI predictions into approved YOLO ground truth.
"""
from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import uuid

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ROLES = ('bale', 'inspection')
VALID_TARGETS = {'bale_candidate', 'bale_closed', 'bale_opened', 'inspector'}
CAM_RE = re.compile(r'^(cam\d+)_(?:[^_]+)_(?:[^_]+)_frame_\d+', re.I)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def collect_images(root: Path, counts: dict[str, int]) -> list[tuple[str, Path]]:
    if not root.is_dir():
        raise ValueError('Approved full-corpus image root is unavailable')
    result: list[tuple[str, Path]] = []
    for role in ROLES:
        folder = root / role
        if not folder.is_dir():
            raise ValueError('Both bale/ and inspection/ image subfolders are required')
        files = sorted(p for p in folder.rglob('*') if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS)
        if len(files) != counts[role]:
            raise ValueError(f'{role} count mismatch: {len(files)} on disk, {counts[role]} expected')
        result.extend((role, p) for p in files)
    if len(result) != sum(counts.values()):
        raise ValueError('Overall dataset count mismatch')
    paths = [p.relative_to(root).as_posix().casefold() for _, p in result]
    if len(set(paths)) != len(paths):
        raise ValueError('Duplicate relative image paths (case insensitive)')
    for _, p in result:
        resolved = p.resolve()
        if root != resolved and root not in resolved.parents:
            raise ValueError('Source image resolves outside approved image root')
        if p.stat().st_size <= 0:
            raise ValueError('Zero-size source file; corpus not ready')
    return result


def model_mapping(mapping: dict, names: set[str]) -> dict[str, str]:
    if not isinstance(mapping, dict) or not mapping:
        raise ValueError('Explicit non-empty class mapping required')
    for source, target in mapping.items():
        if not isinstance(source, str) or source not in names:
            raise ValueError('Configured source class not found in model')
        if target not in VALID_TARGETS:
            raise ValueError('Unknown PTC class')
        if source.lower() == 'person' and target == 'inspector':
            raise ValueError('Generic person cannot be treated as inspector')
        if source.lower() == 'bale' and target != 'bale_candidate':
            raise ValueError('Generic bale cannot imply opened/closed state')
        if target in {'bale_closed', 'bale_opened', 'inspector'} and source != target:
            raise ValueError('State/role classes require exact trained model class names')
        if target == 'bale_candidate' and source not in {'bale', 'bale_candidate', 'bale_closed', 'bale_opened'}:
            raise ValueError('Generic bale candidate must come from bale-related model class')
    return mapping


def camera_hint(image_path: Path) -> str:
    match = CAM_RE.match(image_path.name)
    return match.group(1).lower() if match else 'unmapped'


def review_set(images: list[tuple[str, Path]], root: Path, proportion: float, seed: str) -> set[str]:
    if not (0.2 <= proportion <= 1):
        raise ValueError('Minimum independent review rate is 20%')
    groups: dict[str, list[str]] = collections.defaultdict(list)
    for role, path in images:
        rel = path.relative_to(root).as_posix()
        groups[f'{role}/{camera_hint(path)}'].append(rel)
    chosen: set[str] = set()
    for group in groups.values():
        rank = sorted(group, key=lambda n: hashlib.sha256((seed + '|' + n).encode()).digest())
        chosen.update(rank[:math.ceil(len(group) * proportion)])
    return chosen


def proposals(result, mapping: dict[str, str], width: int, height: int, min_conf: float) -> list[dict]:
    """Maintain every separate bale instance; never collapse a line into one ROI."""
    candidate: list[dict] = []
    names = result.names
    for b in result.boxes:
        idx = int(b.cls.item())
        name = names[idx]
        if name not in mapping:
            continue
        c = float(b.conf.item())
        if not math.isfinite(c) or c < min_conf or c > 1:
            continue
        coords = [float(v) for v in b.xyxy[0].tolist()]
        if len(coords) != 4 or not all(map(math.isfinite, coords)):
            continue
        x1, y1, x2, y2 = coords
        x1, y1 = max(0.0, x1), max(0.0, y1)
        x2, y2 = min(float(width), x2), min(float(height), y2)
        if x2 <= x1 or y2 <= y1:
            continue
        candidate.append({
            'class_proposed': mapping[name],
            'source_model_class': name,
            'confidence': round(c, 5),
            'xyxy_pixels': [round(x1, 2), round(y1, 2), round(x2, 2), round(y2, 2)],
            'human_approved': False,
        })
    # Deterministic ordering along the conveyor when objects are separate.
    candidate.sort(key=lambda b: (b['xyxy_pixels'][0], b['xyxy_pixels'][1]))
    return candidate


def verified_image_size(path: Path) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError('Install Pillow on the approved GPU machine') from exc
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        return im.size


def process(args: argparse.Namespace, model_factory=None, image_size_fn=None) -> tuple[Path, dict]:
    root = args.images.expanduser().resolve()
    out_root = args.output.expanduser().resolve()
    model_path = args.model.expanduser().resolve()
    mapping_path = args.mapping.expanduser().resolve()
    if not model_path.is_file():
        raise ValueError('Approved PTC detector weights are unavailable')
    if out_root == root or root in out_root.parents:
        raise ValueError('Output must not be inside source image root')
    # Do not store per-image filenames/boxes in the Git checkout.
    repo = next((p for p in (Path(__file__).resolve().parent, *Path(__file__).resolve().parents)
                 if (p / '.git').exists()), None)
    if repo is not None and (out_root == repo or repo in out_root.parents):
        raise ValueError('Restricted output must be outside the Git repository')
    if not 0 < args.min_conf <= 1:
        raise ValueError('Invalid model confidence threshold')
    for n in (args.expected_bale, args.expected_inspection):
        if n < 0:
            raise ValueError('Expected counts must be non-negative')
    items = collect_images(root, {'bale': args.expected_bale, 'inspection': args.expected_inspection})
    mapping_raw = json.loads(mapping_path.read_text(encoding='utf-8'))
    if model_factory is None:
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise RuntimeError('Ultralytics is not installed on the approved GPU machine') from exc
        model_factory = YOLO
    model = model_factory(str(model_path))
    mapping = model_mapping(mapping_raw, set(model.names.values() if isinstance(model.names, dict) else model.names))
    second = review_set(items, root, args.independent_rate, args.seed)
    size_fn = image_size_fn or verified_image_size
    old_umask = os.umask(0o077)
    try:
        out = out_root / ('ptc-draft-' + dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8])
        out.mkdir(parents=True, mode=0o700, exist_ok=False)
        out.chmod(0o700)
        incomplete = out / 'INCOMPLETE-DO-NOT-TRAIN'
        incomplete.write_text('Candidate generation not finalized; do not use for training.\n', encoding='utf-8')
        drafts = out / 'candidate-bales-RESTRICTED.jsonl'
        queue = out / 'human-review-queue-RESTRICTED.csv'
        counts = collections.Counter()
        try:
            with drafts.open('x', encoding='utf-8') as d, queue.open('x', encoding='utf-8', newline='') as q:
                writer = csv.writer(q)
                writer.writerow(['image_relative_path', 'camera_hint', 'candidate_count', 'primary_review',
                                 'independent_review', 'adjudication', 'ambiguous_state'])
                for role, image in items:
                    rel = image.relative_to(root).as_posix()
                    width, height = size_fn(image)
                    if width <= 0 or height <= 0:
                        raise RuntimeError('Invalid image dimensions')
                    result = model.predict(source=str(image), device=args.device,
                                           imgsz=args.imgsz, conf=args.min_conf, verbose=False)
                    if len(result) != 1:
                        raise RuntimeError('Expected exactly one detector output per image')
                    candidate = proposals(result[0], mapping, width, height, args.min_conf)
                    unknown = any(b['class_proposed'] == 'bale_candidate' for b in candidate)
                    is_second = rel in second or unknown
                    d.write(json.dumps({
                        'relative_image_path': rel,
                        'image_sha256': sha256(image),
                        'dimensions': [width, height],
                        'candidates': candidate,
                        'human_approved': False,
                        'phase': 'DRAFT_ONLY',
                    }, sort_keys=True) + '\n')
                    writer.writerow([rel, camera_hint(image), len(candidate), 'PENDING',
                                     'PENDING' if is_second else 'NOT_REQUIRED',
                                     'PENDING' if is_second else 'NOT_REQUIRED',
                                     'YES' if unknown else 'NO'])
                    counts[f'images_{role}'] += 1
                    counts['images_total'] += 1
                    counts['individual_boxes'] += len(candidate)
                    counts['empty_images'] += int(not candidate)
                    counts['second_review_required'] += int(is_second)
                    counts['ambiguous_images'] += int(unknown)
            report = {
                'status': 'DRAFT ONLY — NO EXPERT GROUND TRUTH',
                'images_bale': counts['images_bale'],
                'images_inspection': counts['images_inspection'],
                'images_total': counts['images_total'],
                'separate_box_proposals': counts['individual_boxes'],
                'images_without_proposals': counts['empty_images'],
                'images_with_ambiguous_class': counts['ambiguous_images'],
                'images_requiring_independent_review': counts['second_review_required'],
                'review_selection_minimum_fraction': args.independent_rate,
                'primary_human_reviews_complete': 0,
                'independent_human_reviews_complete': 0,
                'certified_training_labels': 0,
                'model_sha256': sha256(model_path),
                'candidate_manifest_sha256': sha256(drafts),
                'review_queue_sha256': sha256(queue),
                'note': 'Each proposed bale is its own box; all require correction/review. '
                        'Generic bale_candidate never proves opened/closed state. '
                        'No grade, route, hand-inspection duration, or scale truth is inferred from still images.',
            }
            summary = out / 'aggregate-SANITIZED.json'
            summary.write_text(json.dumps(report, sort_keys=True, indent=2) + '\n', encoding='utf-8')
            for file in (drafts, queue, summary, incomplete):
                file.chmod(0o600)
            incomplete.unlink()
            return out, report
        except Exception:
            # Output remains explicitly incomplete rather than appearing valid.
            raise
    finally:
        os.umask(old_umask)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--images', type=Path, required=True, help='Root containing bale/ and inspection/')
    parser.add_argument('--model', type=Path, required=True, help='Local class-compatible YOLO .pt checkpoint')
    parser.add_argument('--mapping', type=Path, required=True, help='Exact source-to-project-class mapping JSON')
    parser.add_argument('--output', type=Path, required=True, help='Approved restricted output outside Git')
    parser.add_argument('--expected-bale', type=int, default=4649)
    parser.add_argument('--expected-inspection', type=int, default=1902)
    parser.add_argument('--device', default='0')
    parser.add_argument('--imgsz', type=int, default=960)
    parser.add_argument('--min-conf', type=float, default=0.15)
    parser.add_argument('--independent-rate', type=float, default=0.20)
    parser.add_argument('--seed', default='ptc-november-v1')
    args = parser.parse_args(argv)
    try:
        folder, report = process(args)
    except (ValueError, RuntimeError, OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print('PTC candidate generation FAILED: ' + str(exc), file=sys.stderr)
        return 2
    print('Restricted draft directory: ' + str(folder))
    print(json.dumps({k: report[k] for k in ('images_total', 'separate_box_proposals', 'certified_training_labels')}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())