# Local test videos

Drop four camera MP4/AVI/MOV/MKV files here (not committed to git).

## Mapping

Sorted files without an explicit `cam1` / `CAM-01` token are assigned in order:

| Order | Camera | Role |
|-------|--------|------|
| 1st | CAM-01 | detect + track |
| 2nd | CAM-02 | detect + track |
| 3rd | CAM-03 | track + opening/inspection |
| 4th | CAM-04 | track + opening/inspection |

Optional filename hints: `cam1_...`, `CAM-01_...`, `camera2_...`. Bare `D03` / `D04` names do **not** force CAM-03/04.

## Offline render (recommended on CPU laptops)

I (or CI/GPU) run inference once and save annotated clips. You only open the dashboard.

```powershell
cd services\ai-inference
python scripts\play_local_videos.py `
  --videos-dir ..\..\videos `
  --models-dir ..\..\models `
  --max-frames 0
```

Outputs:

- `videos/output/CAM-0N_<stem>.annotated.mp4` — full annotated evidence
- `videos/output/<CAM>_*.events.jsonl` — platform events
- `videos/output/dashboard/camera-01.mp4` … `camera-04.mp4`
- `apps/dashboard-web/public/media/camera-01.mp4` … (for Live page)

Confidence (config): bale detect ≥ **0.85**, inspection ≥ **0.65**.

## Dashboard playback (smooth, no live GPU)

```powershell
# from repo root
copy apps\dashboard-web\.env.example apps\dashboard-web\.env.local
# set VITE_CAMERA_PREVIEW_MODE=local
pnpm dev:dashboard
```

Open Live Monitoring — each tile plays the pre-rendered annotated clip with boxes and bale IDs.
