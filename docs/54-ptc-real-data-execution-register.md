# PTC Real-Data AI — Live Execution Register

**Reference runbook:** [53-ptc-real-data-ai-execution-runbook.md](53-ptc-real-data-ai-execution-runbook.md)  
**Created:** 2026-11-06  
**Operational PM owner:** @arifkhannamal9288  
**Status:** Partial metadata/sample QA executed on 2026-11-06: at least 1,000 JPGs per folder (both listing caps), 11/11 sample JPEGs decode, source totals/labels/videos unverified. **No dataset/model/AI-site acceptance claimed.**

**Verified evidence:** [dated partial-intake audit](55-ptc-data-intake-partial-audit-2026-11-06.md). Full pagination is now scripted in `tools/testing/ptc_drive_dataset_intake.py`, requiring an authorized Drive read-only token on Zubair's execution machine.

Use this document for **sanitized** status and decisions. Detailed inventories, PTC imagery, labels, per-file hashes, model weights and raw reports stay in the approved restricted work area. Update the table during PM's daily checkpoint. Do not mark a gate passed merely because a folder exists.

## A. Source handover snapshot

| Intake ID | Source description | Observed so far | Final count / completeness | Owner | Status |
|---|---|---|---|---|---|
| PTC-2026-11-06-BALE | PM-controlled Drive > Bale Dataset > Bale Detection | At least 1,000 JPGs enumerated (listing cap), 16 name-based groups, 5/5 representative JPEGs decoded, cam1 | **UNKNOWN**; uploader has not confirmed completion | Uploader + Zubair | UPLOADING / VERIFY |
| PTC-2026-11-06-INSPECT | PM-controlled Drive > Bale Dataset > Inspection Detection | At least 1,000 JPGs enumerated (listing cap), 8 name-based groups, 6/6 representative JPEGs decoded, cam4 | **UNKNOWN**; uploader has not confirmed completion | Uploader + Zubair | UPLOADING / VERIFY |
| PTC-2026-11-06-VIDEO | Original timestamped video/session recordings + frame-sequence metadata | **NOT CONFIRMED** | Needed for temporal actions and full workflow evaluation | Uploader + Arif | PENDING |
| PTC-2026-11-06-LABELS | Existing annotations and grading/routing/weight ground truth | **NOT CONFIRMED** | Must be checked by Zubair | Uploader + Zubair | PENDING |
| PTC-2026-11-06-SITE | Physical Camera 01–04 views and six ROI mappings | **NOT APPROVED** | Required for live acceptance | PTC + Arif + Qamar | PENDING |

Do not insert the actual shared folder URL, private per-file ID list, raw camera frames, physical addresses or credential-bearing endpoints into GitHub.

## B. Owner decision register

Set each status to **PENDING, CONFIRMED or ACCEPTED LIMITATION** and add the date and a sanitized decision reference (not secret-bearing links).

| ID | Exact question | Accountable | Status | Decision date | Sanitized reference |
|---|---|---|---|---|---|
| D01 | Upload complete, expected file count/bytes per folder, any failed transfers? | Arif / uploader | PENDING | — | — |
| D02 | Existing annotated labels? If yes, format, labels, QA and rights? | Zubair / uploader | PENDING | — | — |
| D03 | Original videos / session and frame timestamps / FPS available? | Arif / uploader | PENDING | — | — |
| D04 | Which physical cameras observe each mandated process step? | Arif / PTC | PENDING | — | — |
| D05 | What observable signal proves grading and grade value? | Arif / PTC | PENDING | — | — |
| D06 | Scale camera/display legibility, numeric format, unit and weight truth? | Arif / PTC | PENDING | — | — |
| D07 | Approved minimum accuracy, OCR, false-alert, latency and 4-stream requirements? | Arif / PTC | PENDING | — | — |
| D08 | Permitted training/retention, storage, GPU and site/camera access approved? | Arif / Qamar / PTC | PENDING | — | — |

**Decision rule:** If D03 is unanswered, a labeled-image detection pilot can continue after D08 permission, but a full temporal/process model cannot pass Gates B–F. If D07 is unanswered, do not declare a final model acceptance PASS.

## C. Deliverable-based sprint board

| Task | Related issue | Owner | Evidence / definition of done | Status |
|---|---|---|---|---|
| T00 Confirm all uploads and source manifest | #27 | Arif / uploader | Expected/actual totals and transfer failures reconciled | NOT STARTED |
| T01 Full controlled inventory and source session grouping | #27 | Zubair | Partial Drive sample/metadata audit completed; full paginated count, complete transfer, exact lineage/duplicates and checksum still pending | IN PROGRESS (partial) |
| T02 Permissions, process coverage and missing capture | #27 / #84 | Arif + Zubair | All process steps observable or explicitly limited; permission confirmed | NOT STARTED |
| T03 Camera 01–04 + real ROI site preflight | #84 | Qamar + Zubair | Site preflight, time sync, six ROIs, reconnect/scale checks, site review | NOT STARTED |
| T04 Label schema + representative pilot + QA | #28 | Zubair | Reviewed label guide and adjudicated pilot; 20-clip/20% standard if full videos available | NOT STARTED |
| T05 Freeze train, validation and locked dataset v1 | #29 | Zubair | Leakage-safe manifest, counts, checksums and protected test lock | NOT STARTED |
| T06 Train / select PTC detector | #30 | Zubair | Class/camera metrics, versioned weights and inference/VRAM profile | NOT STARTED |
| T07 Tracker and hand inspection PTC calibration | #31 / #32 | Zubair | Bale ID continuity, hand inspection confusion/errors and thresholds | NOT STARTED |
| T08 Grading / routing / OCR PTC validation | #114 / #115 / #116 | Zubair | Observable grading, left rejection, OCR/weight metrics and Bale ID linkage | NOT STARTED |
| T09 Frozen locked evaluation and AI release | #34 | Zubair + Qamar | Frozen manifests/models, event metrics, four-stream benchmark and license | NOT STARTED |
| T10 Recorded + site end-to-end acceptance | #85 | Zubair + Qamar | Real AI events verified through edge/API/DB/dashboard/evidence/reports | NOT STARTED |
| T11 Technical and client acceptance | #85 / #86 | Arif + PTC | Signed final release record or explicit accepted limitations | NOT STARTED |

## D. Gate checkboxes (PM signs off, not AI self-certification)

- [ ] Gate A: #27 permissions, source lineage and coverage audited; #84 camera/site limitations documented.
- [ ] Gate B: #28 annotation guide/pilot QA approved.
- [ ] Gate C: #29 dataset manifests and independent locked-test freeze approved.
- [ ] Gate D: #30–#32 and #114–#116 trained/calibrated on real approved data.
- [ ] Gate E: #34 frozen locked metrics and model/config release accepted.
- [ ] Gate F: #85 real recorded/live integration passed; #86 PM/client acceptance recorded.

## E. Daily checkpoint template (copy to #86 issue comments)

~~~text
Date / time zone:
Gate / task IDs:
Yesterday completed:
Evidence reference (sanitized):
Today / next deliverable:
Blockers / unanswered decisions:
Owner of each blocker:
Target date (or reason currently unknown):
New confirmed defect or approved limitation:
PM decision / next gate:
~~~

## F. Handover and escalation policy

- **Arif**: obtain final completion notice, permissions, D01–D08 answers and PTC sign-off; track all work by task ID.
- **Zubair**: publish sanitized audit/annotation/training/evaluation outcomes in the corresponding GitHub issues.
- **Qamar**: validate GPU and camera/ROI/runtime readiness; benchmark 4 streams and assist live UAT.
- **Waseem**: approve real defects and contract changes only; do not restart completed platform work.

Escalate only **reproducible defects**, **missing physical inputs / ground truth**, **site technical blockers** or **new requested scope**. Categorize before action. Unapproved, unobservable actions must be marked unresolved; no fabricated accuracy claims.

**Final gate:** The project cannot be called AI-accepted without an agreed locked dataset, trained PTC-specific release, real PTC scenario outcomes and PM/client acceptance. Synthetic E2E platform success alone is insufficient.
