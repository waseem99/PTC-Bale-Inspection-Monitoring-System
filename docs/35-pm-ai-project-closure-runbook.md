# Final Testing, Acceptance and Closure Runbook

**Controlling PM issue:** #75  
**Controlling AI/testing epic:** #86  
**Current repository/release authority:** [`51-current-release-and-control-state.md`](51-current-release-and-control-state.md)

Do not pin this runbook to an embedded historical `main` SHA. The canonical current-state document records the software baseline and remaining gates; this file defines how to execute closure.

## 1. Current closure position

Repository-side platform and AI framework implementation are complete. No additional undefined platform, database-framework, HA, enterprise-security or AI-framework development is required unless testing produces a reproducible defect or an approved change request.

The remaining work is split into two tracks that may proceed in parallel:

### Internal / target-environment closure

- #83 — final target deployment verification/acceptance only;
- #102 — local workstation UAT, handover and local release certification;
- #148 — approved-environment execution of finite database-resilience Option A.

### PTC/site/data/model acceptance

- #84 — actual cameras, physical views and ROIs;
- #27–#29 — approved capture, annotation QA and dataset freeze;
- #30–#32 + #114–#116 — PTC-specific training/calibration/component validation;
- #34 — locked evaluation and packaged model/configuration release;
- #85 — integrated AI UAT;
- #86 — final AI acceptance parent;
- #52/#53 — PM/client UAT, training, handover and sign-off.

## 2. Ownership

| Responsibility | Owner |
|---|---|
| PM coordination, client feedback, UAT and acceptance | `arifkhannamal9288` |
| AI model/data/configuration and technical validation | `zubairahmed02` |
| Deployment, runtime, database, GPU and camera support | `qamarmujtaba` |
| Repository and commercial/change control | `waseem99` |

## 3. Governance/privacy boundary

Issue #14 is **closed/completed**. Do not list governance as a pending development gate.

Current controls:

- repository is private;
- restricted PTC/site/AI material remains outside Git;
- CODEOWNERS and CI exist;
- desired enforced `main` branch protection/rulesets are unavailable on the current private-repository GitHub plan and the limitation is accepted;
- repository-owner change control, review discipline and CI are the compensating controls.

No raw footage/frames, annotations/datasets, model binaries, credentials, private network/RTSP details, evidence binaries, database dumps/backups or runtime secrets may be placed in GitHub.

## 4. Internal closure sequence

### Gate A — #83 deployment acceptance

Do not repeat already accepted software testing without evidence of a new defect. Close only after the remaining target-environment deployment gate is satisfied: either successfully deploy/verify the PM-selected final release after privatization or explicitly accept the already verified staging platform release as the deployment baseline, then record PM/client decision.

### Gate B — #102 local certification

Run the existing local package on the target workstation and record:

- fresh install/bootstrap;
- Viewer/Supervisor/Admin journeys;
- simulator event/evidence/review/report flow;
- API/PostgreSQL restart persistence;
- spool retry/idempotency;
- backup/guarded restore;
- offline operation and workstation reboot recovery;
- release manifest/tag where applicable;
- PM acceptance and limitations.

Actual cameras or final model weights are not required to prove the local software package.

### Gate C — #148 database resilience Option A

Execute the already implemented finite path in the approved real environment:

1. application/API against a separate PostgreSQL endpoint;
2. protected backup outside the primary DB data location where available;
3. SHA-256 checksum verification;
4. disposable/non-production restore;
5. application smoke against restored DB/evidence metadata;
6. documented/manual recovery procedure review or dry-run.

Do not introduce standby clusters, Patroni/repmgr, automatic failover, active-active designs or new DB hardware as closure requirements.

## 5. AI/site execution sequence

```text
#84 camera/site/ROI + required controlled capture
→ #27–#29 data audit / annotation / dataset freeze
→ #30–#32 + #114–#116 train / calibrate / validate components
→ #34 locked release/evaluation
→ #85 integrated recorded + live UAT
→ #86 final AI acceptance
```

### #84 camera/site readiness

Record Camera 01–04 mapping, stream properties/time sync, deliberate disconnect/reconnect behavior, failure isolation, observable process coverage, approved entry/inspection/grading/accepted/rejected/scale-display ROIs, scale readability and representative stability evidence. Do not fabricate site proof from repeated ffprobe or simulator output.

### #27–#29 controlled data

Record approved usage, protected inventory IDs, annotation definitions/QA, scenario coverage, leakage-safe split and dataset version/checksum. Existing partial data may support development but cannot be represented as a complete locked acceptance dataset.

### #30–#34 + #114–#116 model/component release

Train/calibrate the PTC-specific components, validate tracking/hand inspection/grading/routing/OCR, record thresholds/limitations, run locked evaluation and package the selected model/rules/configuration release. Generic pretrained weights are plumbing aids only.

### #85 integrated acceptance

Run at minimum:

- valid complete inspection;
- `BALE_NOT_OPENED`;
- `HAND_INSPECTION_MISSING` / incomplete;
- `GRADING_MISSING`;
- `ROUTING_MISSING` / `ROUTING_MISMATCH`;
- `WEIGHT_MISSING` / unreadable / unstable;
- ambiguous/unresolved association;
- camera/model/service failure as operational failure, not process violation.

Use `docs/37-ai-acceptance-release-template.md` for the sanitized acceptance record.

## 6. Finding classification and scope control

Every finding must be classified before implementation:

1. **Defect** — approved behavior is not working.
2. **In-scope completion gap** — approved acceptance item is incomplete.
3. **Configuration/calibration** — thresholds, ROIs or environment settings require adjustment.
4. **Change request** — new feature, integration, camera, report, workflow or commercial commitment.

Only the first three enter closure work directly. Change requests require approval.

## 7. Project completion definition

Close the project only after the applicable records show:

- #83 deployment decision complete;
- #102 local certification complete where required;
- #148 real-environment Option A execution complete where required;
- controlled PTC data/model/ROI testing complete;
- #85 integrated technical acceptance complete;
- #52 client UAT complete;
- #53 training/handover/final release identity complete;
- any contractual hypercare completed or formally waived;
- every remaining issue is closed, accepted, explicitly deferred or converted into an approved change request.

Until then, use the exact status wording maintained in `docs/51-current-release-and-control-state.md`.
