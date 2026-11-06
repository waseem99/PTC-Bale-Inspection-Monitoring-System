# PTC Dataset Intake — Verified Partial Audit (2026-11-06)

**Status:** PARTIAL INTAKE VERIFIED; final upload inventory / annotation / temporal AI acceptance **NOT PASSED**  
**Owner for full completion:** @zubairahmed02; uploader confirmation and decisions: @arifkhannamal9288  
**Source:** PM-provided restricted Drive handoff, two folders. Source IDs/URLs and all raw images intentionally omitted.

## What was actually executed

- Queried both handoff folders through the connected Drive account.
- Each listing reached the provider's **1,000-item per-call maximum**, so **1,000 is a lower bound per folder, not a final count**.
- Examined MIME/filename/size metadata for 2,000 returned records and calculated sequence-group counts and potential duplicate/zero-byte metadata flags.
- Downloaded and successfully decoded **11 representative JPGs** across different observed sequence groups (5 Camera-1 bale frames, 6 Camera-4 inspection frames).
- Examined the sampled physical scenes for initial suitability only. No PTC ground-truth labeling, video replay, model training or locked accuracy evaluation was performed.

## Observed partial inventory

| Metric | Bale Detection | Inspection Detection |
|---|---:|---:|
| Listed files, at provider limit | **at least 1,000** | **at least 1,000** |
| Returned file type | JPEG only | JPEG only |
| Filename camera indicator | `cam1` | `cam4` |
| Source-group indicators in returned names | **16** | **8** |
| Bytes across first 1,000 entries | **874,817,181** | **744,268,952** |
| Zero-byte entries in first 1,000 | 0 | 0 |
| Duplicate filenames in first 1,000 | 0 | 0 |
| Distinct filename frame keys in first 1,000 | 1,000 | 1,000 |
| Files with nonmatching expected frame-name pattern | 0 | 0 |
| Sampled JPEGs decoded successfully | 5 of 5 | 6 of 6 |
| Sample image dimensions | 2880 × 1620 | 2880 × 1620 |
| Final item count and uploader COMPLETE confirmation | **UNKNOWN** | **UNKNOWN** |
| Supplied labels/original timestamped video | **UNVERIFIED** | **UNVERIFIED** |

The 24 filename-group indicators refer **only to returned file names**, not verified independent recording sessions or discrete bale inspection events. Nonconsecutive frame numbers cannot independently prove missing frames because extraction stride is unknown. All duplicate/corruption checks are **metadata/sample checks**, not exhaustive media hashing/decoding or perceptual deduplication.

## Scene suitability observations from sampled images

- Camera-1 JPG samples show a wide conveyor/bale-entry environment, including a bale-handling area. This can support an initial object-detection labeling feasibility check.
- Camera-4 JPG samples show a wider inspection/workspace view with bales and human activity. Fine hand movements and the distant display/weight panel **require full-resolution ROI assessment and, for actions/OCR, video-sequence plus truth-data validation**.
- No camera-2/3 files were evidenced by the returned first 1,000 items per handoff folder. **This is not proof those cameras are absent from all approved source datasets.**
- The supplied top-level handoff currently lists only the two image-folder categories; full source recordings and annotations **were not confirmed**. Do not infer their absence from other private locations.

## What is passed versus blocked

| Gate | Decision | Reason |
|---|---|---|
| Drive folder access / partial JPEG listing | **PASS (partial)** | 1,000 records per folder accessible |
| Metadata size/naming baseline on returned items | **PASS (sampled listing)** | No zero-byte, repeated names or pattern errors found within first 2,000 records |
| Representative image decoding | **PASS (11 samples)** | All opened as 2880×1620 JPG |
| Upload completeness / full file totals | **BLOCKED** | Per-call cap reached; no uploader final count/complete notice |
| Approved training/evaluation use | **PENDING** | No formal authorization record verified |
| Full duplicate/corruption inspection | **NOT DONE** | Needs full paginated inventory and controlled media sampling |
| Annotation and QA / train-val-locked-test freeze | **BLOCKED** | Labels and independent session boundaries not verified |
| Temporal action, tracking, route and weight OCR evidence | **BLOCKED** | Original recording timing, ROI/ground truth and end-to-end source lineage not verified |
| PTC-specific model accuracy / training | **NOT RUN** | Approved annotated dataset/GPU and thresholds unverified |
| Real-camera/site and integrated AI UAT | **NOT RUN** | Physical mapping, approved ROIs, real model release and site access missing |

## Runner-independent full intake utility

The repo includes `tools/testing/ptc_drive_dataset_intake.py` to page **all** Drive children (and nested folders) with approved Drive read-only access. It writes the complete identifiers/filenames/metadata to a **restricted path outside Git** and a separate sanitized numeric summary with manifest SHA-256. It does **not** retrieve footage or verify annotations/model accuracy.

On Zubair's approved machine, with an appropriately scoped, short-lived access token set securely as `GOOGLE_DRIVE_ACCESS_TOKEN` and both folder IDs supplied via protected variables:

```bash
python3 tools/testing/ptc_drive_dataset_intake.py \
  --bale-folder "$PTC_BALE_FOLDER_ID" \
  --inspection-folder "$PTC_INSPECTION_FOLDER_ID" \
  --output-dir /restricted/ptc-intake
```

After uploader confirms upload complete and expected totals are known:

```bash
python3 tools/testing/ptc_drive_dataset_intake.py \
  --bale-folder "$PTC_BALE_FOLDER_ID" \
  --inspection-folder "$PTC_INSPECTION_FOLDER_ID" \
  --output-dir /restricted/ptc-intake \
  --expected-bale "$EXPECTED_BALE_COUNT" \
  --expected-inspection "$EXPECTED_INSPECTION_COUNT" \
  --upload-complete --require-complete
```

`--require-complete` returns nonzero if declared counts/completeness or basic metadata checks fail. The command's output remains an **intake gate only**, never approval to train or release AI. No token values should be printed, logged or pasted into GitHub. The principal/token must have Google Drive read permission to both shared folders. Never run the script output directory under the repo checkout.

Offline unit checks:

```bash
python3 -m unittest discover -s tools/testing -p 'test_ptc_drive_dataset_intake.py' -v
```

## Owner actions required to proceed

1. **Uploader + Arif (#27):** Confirm COMPLETE, expected file counts/bytes, source date/session/frame-rate metadata, existing labels, availability of original timestamped clips and permitted use/retention.
2. **Zubair (#27):** Run the full paginated intake after confirmation, reconcile counts and missing/corrupt metadata, inspect source-video/action/OCR coverage; record sanitized counts/manifest checksum and missing capture requests.
3. **Arif + PTC (#84):** Approve Camera 01–04 mapping, grading signal, accepted and left-rejected lanes, scale-display ROI/unit and numeric acceptance targets.
4. **Qamar (#84):** Provide restricted GPU storage, camera preflight and protected actual stream runtime.
5. **Zubair (#28–#29):** Complete label pilot, dual-review QA, leakage-safe dataset freeze; only then run existing training/evaluation tools (#30–#34).
6. **Arif + PTC (#85–#86):** Accept or formally qualify locked model metrics and actual recorded/live integrated testing.

Use [the real-data AI execution runbook](53-ptc-real-data-ai-execution-runbook.md) and [PM decision register](54-ptc-real-data-execution-register.md) for acceptance and status. No raw factory frames, contact sheets, media, provider IDs, OCR crops, annotations, trained weights or private URLs have been committed to GitHub.
