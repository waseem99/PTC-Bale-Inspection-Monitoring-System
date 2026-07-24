# PTC Bale Inspection Dashboard

Initial React/TypeScript dashboard implementation for the PTC Bale Inspection & Monitoring PoC.

## Current version

This branch provides a client-reviewable **development demo** with:

- demo login and protected in-app session;
- PTC-aligned green/grey visual system;
- large supervisor-friendly typography;
- operations overview and KPI cards;
- four synthetic camera scenes with AI overlays;
- inspection-event filters and CSV export;
- event detail, evidence placeholder, review status and remarks;
- local system, AI, GPU, database, storage and Azure-sync health;
- basic report and print/PDF view.

No live PTC cameras, production data, credentials or restricted media are included.

## Run locally

```bash
pnpm install
pnpm --filter @ptc-bale/dashboard-web dev
```

Open `http://localhost:4173`.

The login is explicitly demo-only: enter any non-empty username and password. Server-side fixed-user authentication is tracked separately under GitHub issue #41.

## Important boundaries

- Camera scenes are synthetic CSS visuals, not PTC or Bangladesh footage.
- AI values and events are sample records for workflow validation.
- The frontend does not contain RTSP credentials or SOP logic.
- Entra ID and Azure synchronization remain future adapters.
- Final PTC logo assets should be replaced with the approved source package before production use.

## Brand basis

The visual direction follows the official PTC brand-guide principles:

- green and grey as the dominant identity colors;
- Open Sans as the approved substitute when PTCRaleway is unavailable;
- restrained use of overlays and technical accents;
- sharp, simple operational icon treatment;
- accessible status communication using text and icons in addition to color.
