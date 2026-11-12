# PTC Dataset Intake — Full Paginated Reconciliation (2026-11-06)

**Status:** FULL METADATA INTAKE + UNIQUE CORPUS READY FOR #28 PILOT  
**Owner:** @zubairahmed02  
**PM:** @arifkhannamal9288  
**Evidence (outside Git):**  
- Raw intake `ptc-intake-20261106T111114Z-91969ed3`  
- Unique corpus `ptc-unique-20261106T114359Z-e561f587`

## Verified unique annotation corpus

| Metric | Bale Detection | Inspection Detection |
|---|---:|---:|
| Unique JPG files (authoritative) | **4649** | **1902** |
| Unique corpus bytes | 3,845,943,162 | 1,449,423,067 |
| Zero-byte / missing size | 0 / 0 | 0 / 0 |
| Provider MD5 present | all | all |
| Identical-name duplicates excluded | **12** (all `same_md5=True`) | 0 |
| Filename cameras | cam1 + cam2 | cam4 + cam2 |

**Unique manifest SHA-256:** `c2bcec3e84e192c4c1fdd59a3410ab05698f4852443270f19ff1941d4e417af3`  
**Unique summary SHA-256:** `96e57e1f0d48d6b44558cee522ce113d4d6bf75f713b49b79ade658e832bbdac`  
**Source raw manifest SHA-256:** `7f84d195b15fa0d2d7bebddd415fa4dd2ce842aae076dea5434f25a2710f60d2`

Rebuild unique inventory (restricted output only):

```bash
python tools/testing/ptc_drive_dedupe_unique_inventory.py \
  --manifest /path/to/drive-manifest-RESTRICTED.jsonl \
  --output-dir /restricted/ptc-intake
```

## Blocker resolutions

### Count gap — CLOSED
Uploader approximates (~4800+ / ~1987+) superseded. Official unique counts: **4649 / 1902**.

### Duplicates — CLOSED FOR ANNOTATION CORPUS
12 byte-identical pairs under `cam2_201_008_frame_*.jpg` are **excluded** from the unique corpus (keep earliest `createdTime`). Physical Drive trash still preferred when a write-scoped token/owner is available; it is **not** required to start the #28 detector label pilot on the unique corpus.

### Source videos — CLOSED (PARTIAL LINEAGE ACCEPTED)
16 MP4s under **PTC-Recordings** (`2026-11-01` + `2026-10-28`), including cam3. Not inside JPG folders. Clip indices mostly `000–003` while JPG segments extend further → temporal/OCR full-lineage remains limited; detector JPG pilot may proceed.

### Labels — CLOSED FOR THIS DROP
None in November JPG folders (expected). Create via #28. Do not mix July annotation packages without PM decision.

## Clear to proceed?

| Gate item | Decision |
|---|---|
| Full JPG metadata inventory | **PASS** |
| Count gap | **PASS** (4649 / 1902) |
| Unique annotation corpus (logical dedupe) | **PASS** |
| Physical Drive trash of 12 dups | **OPTIONAL** (owner/write token) |
| Source videos located | **PASS (partial lineage)** |
| Labels for this JPG set | **N/A → start #28** |
| Detector annotation pilot (#28) | **CLEAR** after D08 permitted-use confirmation |
| Temporal / OCR / route acceptance | **BLOCKED** until fuller video↔frame coverage |

Training / end-to-end AI acceptance remains **NOT CERTIFIED**.
