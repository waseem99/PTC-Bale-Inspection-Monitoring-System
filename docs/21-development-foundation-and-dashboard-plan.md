# Development Foundation and Dashboard Plan

## Purpose and status

This document defines the repository modules, development environments, dashboard scope, authentication approach, and implementation order. The dashboard and first PostgreSQL-backed API vertical slice are now implemented on the tracked feature branches; camera, AI and real-evidence integrations remain follow-on work.

## Decision summary

- Continue with one monorepo.
- Do not create separate repositories at the PoC stage.
- Use one React dashboard that can run in an isolated development environment, on the PTC local GPU workstation, and later in approved Azure hosting.
- Keep the operational PoC local-first and independent of internet/Azure availability.
- Use Node.js/Express for portal and workflow APIs.
- Use local PostgreSQL with Prisma for users, sessions, cameras, events, reviews, health, evidence metadata and audit records.
- Use Python for camera ingestion, AI inference, tracking, SOP evaluation, evidence generation, and edge health.
- Use a simple fixed-user PoC authentication model first; do not build full user administration or enterprise RBAC.
- Keep an authentication adapter boundary so Microsoft Entra ID can be added later without redesigning the portal.
- Retain mock mode and a real seeded PostgreSQL live mode for demonstrations and testing.
- Do not use Power Apps or Power BI as the primary operational interface.

## Repository strategy

One repository remains sufficient because contracts, dashboard fields, Prisma migrations, AI outcomes, evidence metadata, and deployment packages must evolve together.

A repository split is not required unless PTC later mandates separate ownership or access control for AI, infrastructure, or application code.

## Monorepo modules

```text
apps/
  dashboard-web/          React, TypeScript, Vite operational portal
  platform-api/           Node.js, Express, TypeScript, Prisma portal API
services/
  edge-agent/             Python camera connectivity, health, buffer, evidence and sync
  ai-inference/           Python model runtime, detections and temporary tracking
  compliance-engine/      Python SOP state machine and reason codes
packages/
  contracts/              OpenAPI, JSON Schema and shared event definitions
  ui-components/          Reusable dashboard components and design tokens
infrastructure/
  local/                  PostgreSQL, migration, seed, API and dashboard stack
  edge/                   Local GPU-workstation installation and service packaging
  azure/                  Optional approved Azure hosting and synchronization
tests/
  integration/            Cross-module and PostgreSQL integration tests
  acceptance/             PTC-specific PoC and UAT scenarios
docs/                     Architecture, scope, delivery and operating records
```

## Module boundaries

### `apps/dashboard-web`

Responsible for:

- login and fixed PoC user session UX;
- operations overview;
- four-camera monitoring layout;
- inspection-event and violation list;
- event detail and evidence review;
- review status and operator remarks;
- camera, service, GPU, PostgreSQL, storage and synchronization health;
- filtered exports;
- mock/live API switching by environment.

It must not contain SOP rules, direct RTSP credentials, AI inference logic, PostgreSQL credentials, or direct database access.

### `apps/platform-api`

Responsible for:

- fixed-user PoC authentication and session validation;
- event, evidence, review, health and export endpoints;
- PostgreSQL persistence through Prisma;
- authorization of protected dashboard operations;
- transactional review/audit records;
- pagination, filters, sorting and bounded exports;
- database readiness and versioned migration integration;
- optional Azure synchronization and future Entra token validation.

It must not perform camera decoding or model inference.

### `apps/platform-api/prisma`

Responsible for:

- relational schema source;
- enum, table, foreign-key, check-constraint and index definitions;
- committed SQL migration history;
- controlled migration deployment.

It must not contain database credentials, dumps or environment-specific secrets.

### `services/edge-agent`

Responsible for:

- RTSP/ONVIF configuration and connectivity;
- camera and service health;
- rolling frame/video buffer;
- evidence snapshot and short-clip generation;
- durable local event spool;
- local API delivery and optional Azure synchronization;
- Windows service/watchdog integration.

The edge agent does not connect directly to PostgreSQL. It submits versioned idempotent events to the authenticated Node.js API.

### `services/ai-inference`

Responsible for:

- model loading and runtime checks;
- bale and anonymous-person detections;
- temporary camera/zone tracking;
- inference metadata and model-version reporting;
- GPU/runtime benchmarking.

### `services/compliance-engine`

Responsible for:

- PTC-approved SOP states and transitions;
- completed, missed, incomplete and unresolved outcomes;
- reason-code generation;
- configuration and rule versioning;
- deterministic test scenarios.

### `packages/contracts`

This is the source of truth for shared payload definitions, including:

- camera health;
- service/GPU/storage/PostgreSQL health;
- inspection event;
- evidence metadata;
- review status and remarks;
- authentication/session response;
- synchronization status;
- API error shape.

### `packages/ui-components`

This module contains only justified reusable visual primitives. It must not become a large generic design-system project during the PoC.

## Deployment modes

### Development/demo mode

- separately hosted development URL or local development environment;
- synthetic events, health records and fixed demo users;
- approved sample/reference media only;
- clear `Demo Mode` or `Local Seeded PostgreSQL API` indicator;
- no production credentials or PTC operational data;
- same frontend components used in mock and live API modes.

### Local seeded integration mode

The current integration stack runs on a developer/approved local machine:

- PostgreSQL;
- Prisma migration job;
- deterministic seed job;
- Node.js API;
- React dashboard through a same-origin Nginx proxy.

This mode validates the real portal/API/database workflow before cameras and AI are connected.

### Local PoC mode

The full operational system runs on the supplied GPU workstation or approved local server:

- Python edge and AI services;
- Node.js API;
- local PostgreSQL database;
- protected local evidence storage;
- React dashboard;
- browser-compatible live-view gateway.

The portal and database-backed review workflow must remain usable on the PTC network during internet or Azure outages.

### Optional Azure-connected mode

Azure may later provide:

- remotely hosted portal/API;
- Microsoft Entra ID;
- Azure Database for PostgreSQL;
- synchronized event metadata and evidence;
- Blob Storage;
- central monitoring and audit;
- client-approved backup or management access.

Azure is not required for the local PoC and must not become a dependency for core operation.

## PoC authentication approach

### Initial implementation

Use a small fixed-user model with no user-management module.

Roles:

- `viewer`: view dashboard, cameras and events;
- `supervisor`: viewer permissions plus review status and remarks;
- `admin`: limited configuration/health access required for the PoC.

The users are seeded into PostgreSQL from protected environment passwords. Passwords are hashed with scrypt. Random opaque session tokens are stored only as hashes in PostgreSQL and delivered through an HttpOnly cookie.

### Future adapter

The authentication boundary allows replacement or extension with Microsoft Entra ID later. The portal depends on an internal session/user interface rather than Entra-specific UI logic throughout every page.

Not included in the first implementation:

- self-registration;
- password reset email workflows;
- user invitation screens;
- organization/tenant management;
- granular enterprise RBAC;
- full account-administration portal.

## Dashboard information architecture

### 1. Login

- project/client identity;
- username/password PoC login;
- clear environment label;
- future Entra sign-in placement reserved but not active by default.

### 2. Operations overview

- large KPI cards;
- inspections completed;
- missed and incomplete events;
- unreviewed items;
- cameras online/offline;
- AI engine, PostgreSQL and storage status;
- latest events.

### 3. Live monitoring

- four large camera cards;
- camera ID and location;
- online/offline state;
- last-frame timestamp;
- AI processing state;
- expand/focus view;
- demo/live-video fallback state.

### 4. Events and violations

- timestamp;
- camera/zone;
- outcome;
- reason;
- confidence;
- review status;
- server-compatible filters, sorting, search and pagination.

### 5. Event detail

- snapshot and short clip or clear unavailable/pending state;
- ordered observed workflow steps;
- original AI result and reason code;
- model/rule/configuration version;
- record version;
- confirm/dismiss/review status;
- operator remarks;
- optimistic-concurrency feedback.

### 6. System health

- camera connectivity;
- edge services;
- GPU availability/load summary;
- disk/storage status;
- local API/PostgreSQL status;
- optional Azure synchronization state.

### 7. Reports

- basic filtered summary;
- bounded CSV/PDF export;
- no scheduled email reports;
- no advanced Power BI dependency in the PoC.

## UX and visual direction

The portal is operational rather than decorative.

- use large readable headings, cards, status labels and table text;
- prioritize a desktop control-room/supervisor layout;
- use high contrast and generous spacing;
- avoid dense menus and unnecessary settings;
- keep navigation to Overview, Live Monitoring, Events, System Health and Reports;
- use restrained animation;
- make health, warning and violation states immediately distinguishable;
- keep the original AI outcome visually separate from human review status;
- show `Local System`, `AI Engine`, `PostgreSQL`, and `Azure Sync` as separate states.

### PTC branding

Use the client-approved PTC visual assets and design tokens. Keep branding restrained and professional, and do not copy marketing-site layouts into the operational dashboard.

## Seeded-data strategy

The backend seed creates deterministic records matching the production API contracts:

- 3 fixed users;
- 4 cameras;
- 6 health records;
- 257 events;
- completed, missed, incomplete and unresolved outcomes;
- reviewed and unreviewed states;
- evidence pending and unavailable states;
- stable IDs for automated testing.

Normal seeding preserves human review fields and version. Full reset removes only the marked synthetic dataset and is blocked in production mode. Synthetic records are not client acceptance evidence.

## Current implementation order

1. production frontend implementation — completed, validation gate pending;
2. PostgreSQL/Prisma API and deterministic seeded data — implemented, validation gate pending;
3. generated/reviewed `pnpm-lock.yaml` and successful CI/self-hosted validation;
4. protected development deployment and PM/client UI review;
5. Python edge event/health ingestion;
6. real evidence storage and authorized retrieval;
7. live camera gateway and AI-generated events;
8. Socket.IO updates;
9. optional approved Azure Database for PostgreSQL/Blob/Entra integration;
10. site UAT and release.

## Decisions to obtain during the visit

- dashboard users and simple PoC roles;
- whether the final local dashboard needs login during network isolation;
- approved PTC logo/assets and preferred visual treatment;
- exact KPI labels;
- event review statuses;
- terminology for scan/open/check/frisk;
- whether live monitoring needs four simultaneous streams or one focused view plus thumbnails;
- evidence clip duration and retention;
- PostgreSQL backup location, frequency and recovery ownership;
- dev/UAT access expectations;
- future Entra ID and Azure hosting preference.

## Definition of application foundation complete

- monorepo module boundaries are documented;
- dashboard and API contracts are implemented;
- PostgreSQL schema and committed migration exist;
- deterministic seed/reset/status tooling exists;
- PoC auth is intentionally simplified and server-side;
- dev, local and optional Azure modes are separated;
- mock/live provider parity is preserved;
- objective CI, container, Playwright, migration and backup/restore evidence is attached;
- no application feature is falsely presented as complete before its validation gate passes.
