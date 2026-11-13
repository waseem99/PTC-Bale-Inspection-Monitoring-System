# November full-dataset AI candidate annotation runner — 2026-11-13

**Project approval:** PM accepted revised *individual-bale* 20-image draft overlay approach, and confirmed team approval to proceed with authorized bulk processing. This is **not** human acceptance of all object classes, individual boxes or independent reviewer sign-off.

**Full target:** 4,649 unique bale + 1,902 unique inspection JPGs = 6,551, from Zubair's reconciled November inventory in [doc 56](56-ptc-data-intake-full-reconciliation-2026-11-06.md). Only 20 sample images and 156 **draft** bale-instance boxes have been directly prepared and reviewed for visual approach in this ChatGPT session; 6,531 other images have not yet been inferred or annotated here.

**Code:** `tools/testing/ptc_full_dataset_draft_labels.py` with 14 offline synthetic tests. Separate boxes for multiple bales per image; exact image-count gates; protected file-level proposals; camera-stratified independent QA queue >=20%, plus all generic state-ambiguous proposals; no generic `person`->`inspector` or `bale`->opened/closed guesses. Code produces **DRAFT ONLY** and exactly zero certified labels. No media or model weights committed.

**Restricted execution on authorized GPU workstation** (after complete image corpus and trained, class-compatible YOLO `.pt` checkpoint are made accessible):

```bash
python tools/testing/ptc_full_dataset_draft_labels.py \
  --images /restricted/PTC-November-2026 \
  --model /restricted/PTC-models/ptc-bale.pt \
  --mapping /restricted/PTC-models/class_mapping.json \
  --output /restricted/PTC-draft-output \
  --expected-bale 4649 --expected-inspection 1902 \
  --device 0 --imgsz 960 --min-conf 0.15 --independent-rate 0.20
```

Required input tree: `/restricted/PTC-November-2026/bale/` (4,649) and `/restricted/PTC-November-2026/inspection/` (1,902), with source recording/session provenance kept in restricted metadata. Class map example for a model trained with generic `bale` class: `{"bale":"bale_candidate"}`; the generic candidate cannot certify opened or closed.

**Current blockers despite approval:** connected Desktop Commander workstation still OFFLINE; this runtime CPU-only, Ultralytics unavailable, no trained PTC detector checkpoint, and full 6,551-image files not locally mounted. CI tests mock predictions and do not constitute true PTC accuracy. A reviewer other than primary annotator must independently inspect at least 20% and resolve disagreements before #28 can close or training data can be frozen in #29. Video-based temporal grades/routes/OCR cannot be inferred from still images. Keep all per-file manifest, images, predictions and final labels in approved restricted storage; publish only sanitized counts and checksums.

**Follow-up:** #28 annotation QA, #29 dataset freeze, #30 detector calibration, #34 locked real evaluation, #84 camera access, #86 master.
