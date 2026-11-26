# Local YOLO weights

Put trained `.pt` / `.onnx` / `.engine` files here. They are gitignored.

Current integrated pair:

```text
models/bale_detect_yolo26m_best.pt      # CAM-01 + CAM-02 (tracking / bale IDs)
models/bale_inspect_yolo26m_best_FT.pt  # CAM-03 + CAM-04 (opening + inspection)
```

## Camera roles

| Cameras | Role | Models | Behavior |
|---|---|---|---|
| CAM-01, CAM-02 | `detect` | detect `.pt` | Track bales and assign stable IDs (`bale-1`, `bale-2`, …) |
| CAM-03, CAM-04 | `inspect` | detect `.pt` **+** inspect `.pt` | Keep tracking the same bale IDs from this angle, and detect `Bale Opening` / `Bale Inspection` |

CAM-03/04 must keep tracking. Otherwise opening/inspection boxes cannot stay tied to `bale-1` / `bale-2` / `bale-3`.

Configure roles in `services/ai-inference/config/poc.example.json`.

## Run

Single camera:

```bash
cd services/ai-inference
python scripts/run_video.py \
  --video /path/to/cam1.mp4 \
  --config config/poc.example.json \
  --camera CAM-01 \
  --models-dir ../../models \
  --output /tmp/events.jsonl
```

All four cameras with shared bale IDs:

```bash
cd services/ai-inference
python scripts/run_multi_camera.py \
  --config config/poc.example.json \
  --models-dir ../../models \
  --camera CAM-01=/path/cam1.mp4 \
  --camera CAM-02=/path/cam2.mp4 \
  --camera CAM-03=/path/cam3.mp4 \
  --camera CAM-04=/path/cam4.mp4 \
  --output /tmp/events.jsonl
```
