# PTC Edge Simulator and Durable Spool

This standard-library Python tool proves the edge-to-platform delivery contract before actual cameras and model inference are connected.

It stores every event/health payload in a local SQLite WAL database before attempting delivery. Restarting the process preserves pending work. Exact payload replays reuse the same spool item; conflicting reuse of an ID is rejected locally.

## States

- `pending` — stored durably and eligible for delivery/retry;
- `acknowledged` — API returned 200/201/202, including duplicate acknowledgements;
- `rejected` — terminal validation/auth/conflict response;
- transient network, 429 and 5xx responses remain `pending` with bounded exponential backoff.

## Generate deterministic fixtures

```bash
python tools/edge-simulator/ptc_edge_spool.py \
  --database /var/lib/ptc-bale/spool.sqlite3 \
  enqueue-event --camera CAM-01 --scenario completed --sequence 1

python tools/edge-simulator/ptc_edge_spool.py \
  --database /var/lib/ptc-bale/spool.sqlite3 \
  enqueue-health --source camera-ingest --state healthy --sequence 1
```

## Flush

```bash
python tools/edge-simulator/ptc_edge_spool.py \
  --database /var/lib/ptc-bale/spool.sqlite3 \
  flush \
  --api-origin https://api.ptc-aibale.codistan.org \
  --token "$INGESTION_SERVICE_TOKEN"
```

Do not place the token on a shared command line in a production service. The final systemd/container wrapper should read it from a protected runtime environment and invoke the module directly.

## Operational rules

- Use a filesystem with durable local storage, not a temporary container layer.
- Back up configuration, not accepted spool rows; accepted platform events are the system of record.
- Keep rejected rows until reviewed or explicitly purged by an approved operational procedure.
- Never store evidence binaries in this SQLite database.
- Simulator records identify `source=simulator` and must never be presented as actual AI results.
- Actual edge services may replace this generator but must preserve its acknowledgement and replay semantics.

## Test

```bash
cd tools/edge-simulator
python -m unittest -v
```
