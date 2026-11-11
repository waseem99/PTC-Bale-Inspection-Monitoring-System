# PTC November Detector Annotation Pilot — D08 Approval and First-Pass Triage (2026-11-11)

**Decision:** Project sponsor approved use and retention of the provided PTC data for this project's annotation/model-training work (D08a) on 2026-11-11. **Not a production UAT, independent locked test, model-accuracy approval or blanket publication permission.** Protected storage/GPU/camera access and operational retention schedule (D08b) are separately controlled under #84.

**Controlling issues:** #27 data intake; #28 detector annotation pilot; #29 dataset freeze; #30 training; #34 locked evaluation; #86 master AI acceptance.

## Evidence available before pilot

- Zubair's full paginated intake in **#27** (2026-11-06) reports **4,661 listed Bale Detection JPGs**, **4,649 logically unique** after excluding 12 identical duplicate pairs, and **1,902 Inspection Detection JPGs**. A complete source-MP4 ↔ frame mapping remains only partial, even though 16 MP4s were located separately.
- These figures are **Zubair's recorded reconciliation**, not a repeated independent full corpus checksum in this checkpoint. His referenced `docs/56` and dedupe helper were not present on `main` as of this audit. Locate their exact commit/protected manifest if reproducibility is required.
- The earlier restricted July single-class `PTC-Dataset-v1` was independently file/label-validated and is **development-only**. It is not a November label corpus or acceptance set.

## First-pass November image triage actually executed

A bounded, **private** sample of **20 JPEGs** was downloaded from the November handoff and checked on 2026-11-11.

| Check | Observed |
|---|---:|
| Images selected and successfully decoded | 20/20 |
| Image dimensions | 2880 x 1620 |
| Distinct full-file SHA-256 hashes | 20/20 |
| JPEG filename-derived groups represented | 20 |
| Camera-1 conveyor/bale views | 14 |
| Camera-4 inspection-area views | 6 |
| Independent second-review assignments created | 4 of 20 (20%) |
| Actual independent second reviews completed | **0** |
| Expert-approved YOLO boxes / final labels | **0** |
| Verified independent source clips in this sample | **0** |
| Dataset split frozen for model training/locked evaluation | **NO** |

**These are 20 image *group hints*, not 20 verified source videos or 20 completed annotation clips.** A first-pass visual triage observed bale-handling/conveyor and inspection-workspace scenes. The opened-vs-closed bale state, full hand-inspection duration, grading, accepted/rejected route, OCR and weight **cannot responsibly be ground-truthed from this small static sample**; unresolved values remain explicit.

The private review queue stores filenames, content hashes, camera/sequence hints, annotation review fields, independent review requirements, adjudication status and visual-triage notes. The private queue file SHA-256 is:

```
b9edef1d82b5e4adbcfa3126d3926ead003aada4eda7c07f1c4f5e9676ec059b
```

**No raw images, queue rows, per-file identifiers, annotations or contact sheets were added to GitHub.** The review queue and local reproduction utility are in the conversation's restricted handoff; the authoritative bulk intake and production training commands remain documented in #27 and docs/43/53.

## Required next steps and exit criteria

1. **Arif / PM:** Record project sponsor's D08a approval and confirm the designated independent annotation reviewer. Clarify D08b storage, GPU, site access and retention schedule before live-site/GPU transfer.
2. **Zubair / annotation team:** Open the restricted 20-image review queue, ground-truth only visibly supported classes (e.g., `bale_closed`, `bale_opened`, `inspector` when defensible), complete all assigned independent second reviews and adjudication. Do not turn the presence of a bale/person into a proof of completion or violation.
3. **Zubair:** Extend to a **20-clip** pilot with approved timestamped source recordings and a verified session/group crosswalk. Include obstruction, negative and multi-person/bale conditions, and maintain **>=20% independent double review**. The 20-image first pass here does **not** satisfy this step.
4. **PM/QA:** Approve the annotation definition/version and measured reviewer agreement (target >=0.90 under annotation spec); record protected manifest SHA and sanitized QA counts.
5. **Dataset owner:** Freeze whole video/session/collection-block train, validation and untouched locked-test partitions before detector calibration; maintain logically unique source manifest (12 duplicates excluded). No adjacent-frame leakage.
6. **Model owner:** Only then run existing `services/ai-inference/scripts/train_yolo.py` and recorded-video evaluation with protected PTC-specific weights and an approved runtime. Report precision/recall/mAP only from qualified ground truth; do not claim model acceptance from the July development-validation set.

**Gate status:** D08a CONFIRMED (project instruction); initial visual triage COMPLETE; #28 annotation **IN PROGRESS**; #29 final freeze, #30 PTC-specific training, #34 locked evaluation, #85 integrated UAT and #86 AI acceptance **OPEN**.

## Safety and traceability

- Keep media, queue rows, model checkpoints, PTC-specific camera settings and all ground truth in protected storage outside Git.
- Image observations are not process events; ambiguities are `unresolved`, not `missing inspection` or `rejected`.
- No promise is made that D08a alone confers consent to external publishing, sharing identifiers, training with third-party services or indefinite data retention.
