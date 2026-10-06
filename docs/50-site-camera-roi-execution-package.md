# #84 Site Camera and ROI Execution Package

## Purpose

This package converts issue #84 from a checklist into an executable site preflight. It verifies the repository-owned inputs that can be checked safely while keeping camera URLs, credentials, private IPs, raw frames and factory footage outside GitHub.

It **does not** claim that the PTC site has passed. The real streams, physical ROIs, network controls, controlled captures and PM/site approval must still be supplied and executed in the approved environment.

## Repository package

Use the current approved `main` release. The package consists of:

- `tools/testing/ptc_site_preflight.py` — sanitized camera/ROI preflight;
- `tools/testing/site-camera-manifest.template.json` — safe Camera 01–04 manifest;
- `services/ai-inference/config/ptc.camera-roi.template.json` — six-zone ROI template;
- `scripts/testing/run-site-preflight.sh` and `.ps1` — operator wrappers.

The ROI schema records these six physical zones per camera:

1. `entry`;
2. `inspection`;
3. `grading`;
4. `accepted`;
5. `rejected` — left side for the approved PTC process;
6. `scaleDisplay`.

Legacy four-zone AI configs remain readable; missing `entry` or `grading` values fall back to the inspection polygon inside the core configuration object. Final #84/#85 evidence must use explicitly approved six-zone values.

## Before the site session

1. Copy `tools/testing/site-camera-manifest.template.json` to a protected working location if the physical-view descriptions are sensitive.
2. Replace only the sanitized site/capture references and physical-view descriptions.
3. Keep `streamEnvVar` names unchanged unless an approved naming convention requires otherwise.
4. Put the real stream URLs in protected environment variables, never in the manifest or GitHub:
   - `PTC_CAM_01_STREAM_URL`
   - `PTC_CAM_02_STREAM_URL`
   - `PTC_CAM_03_STREAM_URL`
   - `PTC_CAM_04_STREAM_URL`
5. Copy the ROI template to the approved protected configuration location and replace every placeholder polygon from the real PTC views.
6. Record the ROI config version and checksum. Set `approval.approved=true`, `approvedBy`, and `approvedAt` only after PM/site approval.

## Validate before site access

Linux/WSL:

```bash
PTC_SITE_VALIDATE_ONLY=1 bash scripts/testing/run-site-preflight.sh
```

Windows PowerShell:

```powershell
$env:PTC_SITE_VALIDATE_ONLY="1"
.\scripts\testing\run-site-preflight.ps1
```

Validate-only mode checks the safe manifest and all six ROI definitions without requiring real streams or `ffprobe`.

## Execute against the real streams

`ffprobe` must be installed on the execution workstation. The tool reads stream URLs only from environment variables. It probes each camera repeatedly and records only sanitized technical metadata such as transport scheme, codec, width, height and FPS.

Linux/WSL:

```bash
unset PTC_SITE_VALIDATE_ONLY
bash scripts/testing/run-site-preflight.sh
```

Windows PowerShell:

```powershell
Remove-Item Env:PTC_SITE_VALIDATE_ONLY -ErrorAction SilentlyContinue
.\scripts\testing\run-site-preflight.ps1
```

Default output:

`build/site-preflight/site-preflight.json`

The report intentionally contains **no stream URL, username/password, private IP, raw frame or footage**.

## Automated evidence

The runner verifies or records:

- exact Camera 01–04 identity and distinct protected stream-variable mapping;
- six required normalized ROI polygons per camera;
- ROI config version and SHA-256;
- site manifest SHA-256;
- repeated stream reachability;
- video codec, resolution and FPS;
- expected minimum resolution/FPS checks;
- sanitized error output;
- explicit confirmation that stream URLs and credentials are not written to the report.

## Manual/site evidence

The following cannot be truthfully certified by a repository-only runner and remain explicit #84 checks:

- camera clock/time synchronization;
- PTC camera VLAN/firewall isolation and actual firmware/RTSPS capability;
- deliberate disconnect → reconnect/backoff testing;
- one-camera failure isolation while other streams continue;
- protected evidence snapshot/clip capture;
- sustained four-stream CPU/GPU/RAM/network/disk baseline;
- scale-display readability under real glare/lighting/occlusion;
- controlled missing-scenario capture;
- a separate independent locked-test session;
- PM/site representative approval.

Repeated `ffprobe` attempts are a **reachability check only**. They must not be reported as the deliberate reconnect/failure-isolation test.

## Result states

- `prepared` — schema/template validation passed; no live stream claim is made.
- `blocked` — one or more technical stream/ROI checks failed.
- `technical-pass-pending-manual-acceptance` — automated stream/ROI checks passed but one or more site/manual approvals remain.
- `pass` — automated checks pass, the ROI file is formally approved, and every mandatory manual check is recorded true.

## #84 exit and next step

Only sanitized references/checksums/results go to GitHub. Close #84 only after the issue records:

- Camera 01–04 physical/view mapping;
- ROI/config version + checksum;
- time-sync result;
- reconnect/failure-isolation result;
- scale readability decision;
- four-stream stability/resource baseline;
- controlled-capture reference IDs and separate locked-test reference;
- known visibility limitations;
- PM/site approval.

Then use the controlled capture to execute #27 → #29, followed by the PTC-specific model/configuration gates and final #85/#86 acceptance. A real site failure creates new application work only when it demonstrates a concrete reproducible software defect.
