# PTC Edge Simulator and Durable Spool

This standard-library Python service proves the edge-to-platform delivery contract before actual cameras and model inference are connected.

It stores event, health, and camera-status payloads in a local SQLite WAL database before delivery. Restarting the process preserves pending work. Exact payload replays reuse the same spool item; conflicting reuse of an ID is rejected locally.

Evidence binaries are never stored in SQLite. Simulator evidence is uploaded separately through the machine-authenticated evidence endpoint after the event is accepted.

## States

- `pending` — stored durably and eligible for delivery/retry;
- `acknowledged` — API returned 200/201/202, including exact duplicate acknowledgements;
- `rejected` — terminal validation, authorization, or conflict response;
- transient network, 429, and 5xx responses remain `pending` with bounded exponential backoff.

## Local container service

The local Compose runtime starts `local_service.py` automatically.

### Simulator mode

- creates four logical camera states;
- creates completed, missed, incomplete, and unresolved events;
- sends local-service health records;
- uploads deterministic PNG evidence fixtures;
- identifies all output as synthetic;
- retries safely after API/database outage.

### Hardware-ready mode

- generates no simulator records;
- retains the durable spool and machine delivery contracts;
- waits for actual camera/AI adapters to enqueue safe payloads.

Switch modes through the local operator tooling:

```bash
bash scripts/local/ptc-local.sh mode simulator
bash scripts/local/ptc-local.sh mode hardware-ready
```

or on Windows:

```powershell
.\scripts\local\ptc-local.ps1 mode simulator
.\scripts\local\ptc-local.ps1 mode hardware-ready
```

## Manual deterministic fixtures

```bash
python tools/edge-simulator/ptc_edge_spool.py \
  --database /var/lib/ptc-bale/spool.sqlite3 \
  enqueue-event --camera CAM-01 --scenario completed --sequence 1

python tools/edge-simulator/ptc_edge_spool.py \
  --database /var/lib/ptc-bale/spool.sqlite3 \
  enqueue-health --source camera-ingest --state healthy --sequence 1

python tools/edge-simulator/ptc_edge_spool.py \
  --database /var/lib/ptc-bale/spool.sqlite3 \
  enqueue-camera-status --camera CAM-01 --status online --sequence 1
```

## Flush

Read the token from a protected runtime environment rather than placing it on a shared command line:

```bash
export INGESTION_SERVICE_TOKEN='read-from-protected-local-configuration'
python tools/edge-simulator/ptc_edge_spool.py \
  --database /var/lib/ptc-bale/spool.sqlite3 \
  flush --api-origin http://api:4000
```

## Delivery endpoints

| Kind | Endpoint |
|---|---|
| Event | `POST /api/ingest/events` |
| Health | `POST /api/ingest/health` |
| Camera status | `POST /api/ingest/cameras/{cameraId}/status` |
| Evidence binary | `POST /api/ingest/evidence/{eventId}` |

All require the machine ingestion bearer token. Event and camera sequencing must remain stable across adapter restart.

## Operational rules

- Use durable local storage, not a temporary container layer.
- Keep the SQLite database outside the Git working tree.
- Accepted platform events are the system of record.
- Keep rejected rows until reviewed or explicitly purged by an approved procedure.
- Never store evidence binaries, camera passwords, RTSP URLs, or model files in SQLite.
- Simulator records identify `source=simulator` and must never be presented as actual AI results.
- Actual edge services may replace the generator but must preserve acknowledgement, sequence, and replay semantics.
- In hardware-ready mode, simulator generation must remain disabled.

## Test

```bash
cd tools/edge-simulator
python -m unittest -v
```

The dedicated `Edge Simulator CI` workflow also verifies restart-safe replay, conflicts, transient retry, camera-status delivery, and migration from the older two-kind SQLite schema.
