# PTC Real-Data AI Execution Runbook — November 2026

**Status:** Ready for execution; dataset transfer and ground-truth acceptance pending  
**Execution owner:** @zubairahmed02 (AI)  
**PM and client decisions:** @arifkhannamal9288  
**Camera/GPU/runtime:** @qamarmujtaba  
**Change and release control:** @waseem99  
**Controlling issues:** #86 (parent), #84 (site), #27–#29 (data), #30–#32 + #114–#116 (calibration), #34 (release), #85 (integrated UAT)  
**Authoritative repository status:** [51-current-release-and-control-state](51-current-release-and-control-state.md)  
**Live execution register:** [54-ptc-real-data-execution-register](54-ptc-real-data-execution-register.md)

## 0. Scope and current intake: do not overstate what has arrived

A new PM-shared, access-controlled Drive handoff named **Bale Dataset** contains two subfolders: **Bale Detection** and **Inspection Detection**. The uploader stated that transfers were in progress on 2026-11-06.

The initial Drive listing returned at most the first **100 JPG objects in each subfolder**, including filename prefixes **cam1** (Bale Detection) and **cam4** (Inspection Detection). This is **not** a final inventory or evidence that Cameras 01–04 or full-process scenarios are covered. Source location/access details remain in the PM-controlled handoff, not this repository. No complete source-video/timestamp set, annotations, frozen test set or signed acceptance metrics have been verified from this new handoff.

**Do not start final model evaluation or claim model accuracy from newly uploaded JPG frames alone.** Frame images can support object detection after permission, labeling and split checks. Hand-inspection duration, opening, routing, tracking and weight association require temporal sequences with trustworthy camera/session/timestamp lineage. Without those, continue the detector pilot and list missing inputs as explicit blockers.

## 1. Control principle and desired outcome

Do not rebuild the already-implemented dashboard, API, PostgreSQL, evidence delivery, YOLO/ByteTrack, action, OCR or SOP framework. Use existing [AI runtime](../services/ai-inference/README.md), [annotation workflow](43-annotation-and-dataset-workflow.md), [site preflight](50-site-camera-roi-execution-package.md) and [AI acceptance template](37-ai-acceptance-release-template.md). Open new code work only for a reproducible defect or separately approved change request.

The final required order is:
1. bale enters the inspection area;
2. bale is opened;
3. genuine hand inspection completes;
4. grading completes where physically observable;
5. bale moves through accepted or **left-side rejected** route;
6. the weighing-machine display produces a stable camera/OCR reading associated with the correct bale;
7. only a fully observed valid sequence completes; missing/incomplete steps produce supported reason codes and ambiguous evidence remains **UNRESOLVED**.

Site/stream failures are **operational failures**, never fabricated process violations. No face recognition or named-worker tracking.

## 2. First working day: concrete handover actions

| Task ID | Owner | Action | Evidence for PM | Exit |
|---|---|---|---|---|
| D0-01 | Uploader + Arif | State upload COMPLETE; send expected files and bytes per subfolder, source cameras, recording sessions, export method and any upload failure list | Protected handover acknowledgement | Totals and completeness declared |
| D0-02 | Zubair | Enumerate all folder pages and nested folders; capture file ID, relative path, size, MIME, source filename; verify files actually download/parse; compare totals with D0-01 | Restricted inventory + sanitized summary | No unknown missing/corrupt/zero-byte files |
| D0-03 | Zubair | Group frames by source recording/session/camera, detect exact/near duplicates, identify timestamps/FPS/sequence gaps, request original MP4s/recording metadata | Session lineage and gap report | Each sequence traceable or explicitly blocked |
| D0-04 | Arif + site | Map Camera 01–04 to physical views and process stages; confirm grade signal, left-rejected lane and scale-display visibility | Signed process-to-view coverage matrix | Observable/unobservable per step documented |
| D0-05 | Arif | Confirm training/annotation/evaluation permissions, access, retention, restrictions, and who may use footage | Restricted permission record; sanitized YES/NO in #27 | Permission approved before use |
| D0-06 | Qamar | Confirm restricted data storage, GPU model/VRAM, CUDA/runtime compatibility, disk, access, backups, four-stream/site test slot | Sanitized readiness record | Training and runtime can run safely |
| D0-07 | Arif + PTC | Resolve decision register D01–D08 below; record unresolved answers with owner and deadline | Updated [execution register](54-ptc-real-data-execution-register.md) | No unowned decision |
| D0-08 | Arif | Establish short daily Zubair/Qamar status and a blocking-issue review; link evidence to existing issues | One-line status per gate | PM controls critical path |

Do not manually change or rename original source material. Store immutable originals separately from derived crops, labels and training outputs. Generate SHA-256 checksums for the controlled copy and record an inventory snapshot/version.

## 3. Mandatory decision register (PM obtains the answers)

| ID | Decision needed | Decision owner | Can proceed without answer? |
|---|---|---|---|
| D01 | Did all uploads finish? Expected count/bytes, failed transfers and final handover date? | Uploader/Arif | **Audit only**; cannot freeze inventory |
| D02 | Are labels supplied? If yes, which format/classes and who approved quality? | Zubair/uploader | **Audit and pilot only** |
| D03 | Are original timestamped video clips/session IDs/FPS available in addition to JPG frames? | Uploader/site | **Object-detection pilot only**; temporal acceptance blocked |
| D04 | Which exact camera views cover opening, inspection, grading, accepted/left-rejected lanes and weighing? | PTC/Arif/Zubair | **View audit only**; complete AI acceptance blocked |
| D05 | What objectively visible action/artifact proves grading, and is grade outcome legible? | PTC/Arif | **Grading acceptance blocked** |
| D06 | Is scale display visible and stable? What units, decimal format and ground-truth weight source? | PTC/Arif | **OCR acceptance blocked** |
| D07 | What event-level, class-level, OCR, false-alert/hour, latency and 4-stream thresholds constitute acceptance? | PTC/Arif | **Locked evaluation/sign-off blocked** |
| D08 | Is use/retention approved, and are GPU, private storage and live-camera site access available? | Arif/Qamar/PTC | **Training/live UAT blocked as applicable** |

Mark each decision **PENDING / CONFIRMED / LIMITATION ACCEPTED**, with owner, decision date, and restricted reference. Never assume silence is approval. A client-approved recorded-video-only scope may complete an intermediate demonstration, not automatically the original live-camera acceptance.

## 4. Gate-by-gate executable work packages

### Gate A — Source and process coverage audit | #27 + #84 (in parallel)

**Owner:** Zubair; Arif resolves PTC answers; Qamar helps with camera access.

Actions:
- Inventory every file and source video/session: camera, dimensions, FPS, time zone, duration/ordering, counts, checksum, permission and image-quality flags.
- Flag duplicate or adjacent near-identical frames; source gaps; clipping; glare; blur; occlusion; unusable scale digits.
- Build matrix: entry, closed/open transition, proper/incomplete/missing hand inspection, grading, accepted/rejected lane, scale OCR; include normal, negative, ambiguous and operational-failure cases.
- Validate Camera 01–04 mapping rather than inferring it from filename prefixes; agree extra captures and independent locked-test sessions.
- Run the existing Camera/ROI site package for schema readiness. Actual live camera readiness requires on-site stream probes, synchronization, reconnect/failure isolation and human approval; no simulator-only claim.

Site preflight, run from the repository root on an approved Linux/WSL machine:

~~~bash
PTC_SITE_VALIDATE_ONLY=1 bash scripts/testing/run-site-preflight.sh
~~~

After protected RTSP environment variables, camera manifest, and real six-zone ROI configuration are supplied, run the real check using the instructions in [docs/50](50-site-camera-roi-execution-package.md). Never put stream URLs in PRs or issue comments.

**Exit:** Approved permission and lineage, a gap/recapture list, camera-stage matrix, and a documented decision for each step: observable / needs capture / accepted limitation. Post a sanitized gate summary to #27 and #84.

### Gate B — Annotation definition, pilot and QA | #28

**Owner:** Zubair (AI/annotation lead), reviewers appointed by Arif.

Actions:
- Reuse the machine-readable [annotation specification](../services/ai-inference/config/annotation-specification-v1.json); update it only if verified real PTC labels require a reviewed revision.
- Specify closed/open bale; inspector/person; grading indicator only if visible; scale display; action boundaries and properly completed vs token/incomplete/no hand check.
- Define left rejected lane, accepted lane, OCR exact digits/unit, unreadable/unstable, overlapping bales and insufficient visibility.
- Use at least **20 representative video clips**, if available, across normal, negative and ambiguous cases; independently double-label at least **20%** and adjudicate disagreements (existing docs/43 standard).
- For image-only handoff, pilot **object detection** only. Do not invent temporal labels or treat consecutive filenames as measured action duration without verified frame-rate/session metadata.

**Exit:** Annotation guide/version, 20-clip pilot review where feasible, QA disagreements closed, label schema and gaps approved. Post only sanitized pilot summary to #28.

### Gate C — Freeze controlled dataset v1 | #29

**Owner:** Zubair.

Actions:
- Keep original sources immutable; stage controlled derived data in restricted storage.
- Assign train / validation-calibration / **locked acceptance** by entire source recording, camera session, bale/group and capture block. No neighboring frames or same physical session across splits, including synchronized multi-camera recording.
- Check duplicate/near-duplicate and lineage leakage across splits.
- Require positive, missing, incomplete, wrong-route, missing-grade, missing-weight, unreadable/unstable, occluded and operational-failure coverage, or state missing categories as blockers/approved limits.
- Freeze manifest, labels, counts, checksums and exact code/config revisions. Only approved AI custodian can access locked-test labels until final evaluation.

**Exit:** Restricted train/val/locked manifests and hashes; sanitized class/camera/scenario counts + gap record in #29. If only detection JPGs exist, freeze a clearly named **detector-only dataset**, not a completed process dataset.

### Gate D — Train and validate existing PTC components | #30–#32 + #114–#116

**Owner:** Zubair; Qamar provides available GPU/runtime.

Use the existing scripts and versioned runs. Example commands from [docs/43](43-annotation-and-dataset-workflow.md), executed only within protected storage:

~~~bash
cd services/ai-inference
python -m pip install -e '.[train]'
python scripts/train_yolo.py \
  --data /restricted/ptc-dataset-v1/data.yaml \
  --project /restricted/runs \
  --name ptc-yolo-v1
~~~

Next run the existing detector/tracker/action/grading/routing/OCR chain against full approved recording(s), with configured six-zone ROIs. After appropriate trained weights exist:

~~~bash
cd services/ai-inference
python -m pip install -e '.[runtime]'
python scripts/run_video.py \
  --video /restricted/locked-test/sample.mp4 \
  --config /restricted/config/ptc-camera-roi-v1.json \
  --camera CAM-01 \
  --weights /restricted/models/ptc-yolo-v1.pt \
  --output /restricted/results/events.jsonl \
  --audit-output /restricted/results/events.audit.jsonl
~~~

**Important:** Use training/validation recordings for model/threshold selection. The recorded-video command above demonstrates the interface; run the actual locked-test only after models/configs have been frozen, with no further tuning against its labels.

Component acceptance evidence:
- #30: precision, recall, mAP and critical misses by class/camera; trained-model version, checksum, license and inference latency.
- #31: Bale ID continuity, ID switches, inspector association, multiple-bale/occlusion handling.
- #32: opening transition and proper/incomplete/no hand-inspection confusion matrix; threshold and visibility calibration.
- #114: grading-completed vs missing/unresolved only with observable physical signal.
- #115: actual accepted and **left-side rejected** routing transitions and association; versioned ROIs.
- #116: OCR exact numerical match, units, unstable/unreadable rate and correct Bale ID association.

**Exit:** One selected candidate per relevant component, validated thresholds, bounded runtime/resource evidence and reproducible model/config references. Do not reimplement frameworks unless a specific failed case proves a defect. Store binary weights and audit JSONL outside GitHub.

### Gate E — Locked model evaluation and packaged release | #34

**Owner:** Zubair; Qamar benchmarks target GPU.

- Freeze model, detector/tracker/action/OCR/ROI/rules configs, evaluation script revision and locked-test input checksum **before first locked test**.
- Report class and event metrics by camera and scenario, including false violation alerts/hour, missed violations, unresolved percentage and OCR exact match.
- Compare metrics with **PTC-approved D07 thresholds**. If unmet, classify issue and train a **new candidate using train/val only**, preserving original locked-test result; commission a new independent locked set for any post-test revision requiring unbiased final assessment.
- Verify inference export parity, licensing, restart recovery and four simultaneous stream throughput/latency/GPU/CPU/RAM/queue/drops.
- Create restricted package with model weights plus sanitized release manifest referencing checksums, dataset, configs, git SHA and known limitations.

**Exit:** Locked results and model package accepted for UAT, or explicit failed criteria + corrective owner. Never declare one detector mAP figure to be end-to-end inspection accuracy.

### Gate F — Actual deployed integration, recorded + live UAT | #85 and #86

**Owners:** Zubair (technical), Qamar (runtime), Arif (PM/client acceptance).

1. Use the agreed deployed release (#83 is a separate infrastructure gate). Feed true PTC video/camera observations through the existing edge ingestion path.
2. For each controlled test event, correlate anonymous Bale ID, timestamp, ordered steps, outcome/reason, evidence and event ID through API/PostgreSQL/dashboard.
3. Confirm supervisor review, audit, CSV/PDF, authorized evidence access, retries/idempotency, reconnect and restart persistence.
4. Exercise at least completed, not opened, missing/incomplete hand inspection, missing grading, missing/mismatched route, missing/unreadable/unstable weight, ambiguous association, and camera/model/service failure.
5. Run actual approved four-camera stability and live ROI validation where contracted; record accepted limitations explicitly.
6. Complete [AI release acceptance template](37-ai-acceptance-release-template.md), obtain Zubair/Qamar technical evidence and Arif/PTC approval.

**Exit:** Locked event-level metrics + reproducible evidence; actual site acceptance or explicit formally accepted scope limitation; final signed decision on #85 and #86. Do not close #86 from synthetic platform tests alone.

## 5. Delivery cadence, dependencies and target timing

Work in **business days relative to D0**, where D0 begins only after the uploader confirms the handover and permissions. These are planning windows, not an unconditional delivery promise.

| Window | AI lead (Zubair) | DevOps (Qamar) | PM (Arif) | Gate |
|---|---|---|---|---|
| D0–D2 | Full source inventory, sequence audit and data gap matrix | Protected storage and GPU readiness | Confirm upload, permissions, eight decisions | A audit initiated |
| D2–D5 | Coverage sign-off; label pilot, ambiguity adjudication | Site preflight, ROI/camera mapping in parallel | Obtain extra recordings/site access | A/B |
| D5–D10+ | Bulk annotation, QA, source-based splits and dataset freeze | Validate target runtime and capacity | Approve data gaps | C |
| D9–D15+ | Train/calibrate detector, tracking, action, grading, lane and OCR | GPU/stream support | Triage blocker decisions | D |
| D14–D18+ | Locked test, package and model report | 4-stream benchmark | Compare approved thresholds | E |
| D18–D23+ | Recorded and approved live UAT | Restart/recovery/rollback | PM/client sign-off | F |

For complete, labelable videos and available hardware, a **rough 3–5-week envelope** is plausible, with overlap. If only JPG frames exist, the full inspection workflow does **not** have a credible completion date until original recordings/ground truth and site views are provided.

## 6. Daily status and evidence protocol

Arif posts one concise update per business day in #86, using the live register, with:
- gate, task owner, status **NOT STARTED / IN PROGRESS / BLOCKED / READY FOR REVIEW / PASS / ACCEPTED WITH LIMITATION**;
- yesterday's completed evidence reference, today's next deliverable, and any decision with accountable owner;
- expected completion or reason timeline cannot yet be committed;
- updated issue link. Do not equate an assigned issue or uploaded file with a passed gate.

Each phase owner posts a sanitized exit comment **on the existing controlling GitHub issue**; include manifest or release version, counts, date, checksums, approval reference, actual pass/fail metric and limitations. Keep all private footage/frames/labels/OCR crops/weights/credentials/URLs/test evidence in approved restricted storage; never attach them to GitHub. Generic filenames and safe reference codes are permitted.

Defect classification: **reproducible software defect**, **in-scope data/calibration gap**, **site/integration blocker**, or **new change request**. Fix first three within approved scope; new capabilities/commercial scope require approval.

## 7. First execution-ready work order

**Arif:** Obtain the uploader's COMPLETE confirmation and decisions D01–D08; assign reviewer(s), label capacity and client site slot. Confirm exact source videos; do not accept image-only evidence for temporal UAT.

**Zubair:** Begin #27 inventory and camera-stage coverage using whatever has fully uploaded; provide restricted inventory, sanitized summary, session lineage and missing-data list. After the D01/D03/D08 gates, lead #28 pilot and #29 freeze. Execute existing AI scripts thereafter.

**Qamar:** Ready approved GPU/private storage and run #84 preflight; coordinate protected real streams, snapshots and runtime benchmarking. Do not expose RTSP credentials or media links in repo/CI logs.

**Waseem:** Review gate failures and approve only targeted defects or new scope; no unconditional full-stack redesign.

**Next decision checkpoint:** Arif accepts Gate A audit/coverage and the training entry conditions; only then authorize full annotation and training. Final completion remains dependent on #34 locked results and #85/#86 actual acceptance.
