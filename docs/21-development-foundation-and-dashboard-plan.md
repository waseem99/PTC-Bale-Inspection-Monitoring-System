# Development Foundation and Dashboard Plan

## Purpose

This document defines the repository modules, development environments, dashboard scope, authentication approach, and implementation order for the next delivery phase. It intentionally plans the work without implementing application features.

## Decision summary

- Continue with one monorepo.
- Do not create separate repositories at the PoC stage.
- Build one React dashboard that can run in an isolated development environment, on the PTC local GPU workstation, and later in approved Azure hosting.
- Keep the operational PoC local-first and independent of internet/Azure availability.
- Use Node.js/Express for portal and workflow APIs.
- Use Python for camera ingestion, AI inference, tracking, SOP evaluation, evidence generation, and edge health.
- Use a simple fixed-user PoC authentication model first; do not build full user administration or enterprise RBAC.
- Keep an authentication adapter boundary so Microsoft Entra ID can be added later without redesigning the portal.
- Use mock data and approved sample media for the initial dashboard demonstration.
- Do not use Power Apps or Power BI as the primary operational interface.

## Repository strategy

One repository remains sufficient because contracts, dashboard fields, AI outcomes, evidence metadata, and deployment packages must evolve together.

A repository split is not required unless PTC later mandates separate ownership or access control for AI, infrastructure, or application code.

## Planned monorepo modules

```text
apps/
  dashboard-web/          React, TypeScript, Vite operational portal
  platform-api/           Node.js, Express, TypeScript portal API
services/
  edge-agent/             Python camera connectivity, health, buffer, evidence and sync
  ai-inference/           Python model runtime, detections and temporary tracking
  compliance-engine/      Python SOP state machine and reason codes
packages/
  contracts/              OpenAPI, JSON Schema and shared event definitions
  ui-components/          Reusable dashboard components and design tokens
infrastructure/
  edge/                   Local GPU-workstation installation and service packaging
  azure/                  Optional approved Azure hosting and synchronization
 tests/
  integration/            Cross-module integration tests
  acceptance/             PTC-specific PoC and UAT scenarios
 docs/                    Architecture, scope, delivery and operating records
```

## Module boundaries

### `apps/dashboard-web`

Responsible for:

- login screen and fixed PoC user session;
- operations overview;
- four-camera monitoring layout;
- inspection-event and violation list;
- event detail and evidence review;
- review status and operator remarks;
- camera, service, GPU, storage and synchronization health;
- basic filtered exports;
- mock/live API switching by environment.

It must not contain SOP rules, direct RTSP credentials, AI inference logic, or database access.

### `apps/platform-api`

Responsible for:

- fixed-user PoC authentication and session validation;
- event, evidence, review, health and export endpoints;
- local MongoDB persistence;
- authorization of protected dashboard operations;
- audit records for review actions;
- optional Azure synchronization and future Entra token validation.

It must not perform camera decoding or model inference.

### `services/edge-agent`

Responsible for:

- RTSP/ONVIF configuration and connectivity;
- camera and service health;
- rolling frame/video buffer;
- evidence snapshot and short-clip generation;
- durable local event spool;
- local API delivery and optional Azure synchronization;
- Windows service/watchdog integration.

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

This is the only source of truth for shared payload definitions, including:

- camera health;
- service/GPU/storage health;
- inspection event;
- evidence metadata;
- review status and remarks;
- authentication/session response;
- synchronization status;
- API error shape.

### `packages/ui-components`

This module will contain shared visual primitives only after the dashboard foundation starts. It should not become a large generic design-system project during the PoC.

## Deployment modes

### Development/demo mode

Purpose:

- present dashboard flows before the Tuesday visit;
- collect client feedback;
- avoid dependency on live PTC cameras or final SOP decisions.

Characteristics:

- separately hosted development URL;
- mock events, health records and fixed demo users;
- approved sample/reference media only;
- clear `Demo Mode` indicator;
- no production credentials or PTC operational data;
- replaceable API adapter so mock data can be switched to the real API later.

The development portal may be hosted in a Codistan-controlled dev environment or approved Azure dev resource. It must remain separated from the final PTC environment.

### Local PoC mode

The full operational system runs on the supplied GPU workstation or approved local server:

- Python edge and AI services;
- Node.js API;
- local MongoDB-compatible database;
- protected local evidence storage;
- React dashboard;
- browser-compatible live-view gateway.

The portal must remain usable on the PTC network during internet or Azure outages.

### Optional Azure-connected mode

Azure may later provide:

- remotely hosted portal/API;
- Microsoft Entra ID;
- synchronized event metadata and evidence;
- Blob Storage;
- central monitoring and audit;
- client-approved backup or management access.

Azure is not required for the first dashboard demo and must not become a dependency for core PoC operation.

## PoC authentication approach

### Initial implementation

Use a small fixed-user model with no user-management module.

Recommended PoC roles:

- `viewer`: view dashboard, cameras and events;
- `supervisor`: viewer permissions plus review status and remarks;
- `admin`: limited configuration/health access required for the PoC.

The initial user records may be seeded through protected environment configuration or the local database. Passwords must be hashed; no credentials may be committed.

### Future adapter

The authentication boundary must allow replacement or extension with Microsoft Entra ID later. The portal should depend on an internal session/user interface rather than Entra-specific UI logic throughout every page.

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
- AI engine, local database and storage status;
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
- simple filters and search.

### 5. Event detail

- snapshot and short clip;
- observed workflow steps;
- original AI result and reason code;
- model/rule/configuration version;
- confirm/dismiss/review status;
- operator remarks;
- evidence-unavailable state.

### 6. System health

- camera connectivity;
- edge services;
- GPU availability/load summary;
- disk/storage status;
- local API/database status;
- optional Azure synchronization state.

### 7. Reports

- basic filtered summary;
- CSV/PDF export;
- no scheduled email reports;
- no advanced Power BI dependency in the PoC.

## UX and visual direction

The portal should be operational rather than decorative.

- use large readable headings, cards, status labels and table text;
- prioritize a desktop control-room/supervisor layout;
- use high contrast and generous spacing;
- avoid dense menus and unnecessary settings;
- keep navigation to Overview, Live Monitoring, Events, System Health and Reports;
- use restrained animation;
- make health, warning and violation states immediately distinguishable;
- keep the original AI outcome visually separate from human review status;
- show `Local System`, `AI Engine`, and `Azure Sync` as separate states.

### PTC branding

Use the current official PTC/BAT corporate presentation as a reference, but obtain or confirm client-approved logo and brand assets before finalizing design tokens.

For the first demo:

- use a clean modern corporate treatment;
- keep branding restrained and professional;
- use the approved logo only when supplied/confirmed;
- do not copy marketing-site layouts into the operational dashboard;
- keep colors configurable as design tokens so client feedback can be applied quickly.

## Demo data strategy

Create a typed mock-data layer matching the future contracts.

Initial demo records should cover:

- completed inspection;
- missed inspection;
- incomplete inspection;
- unresolved/insufficient visibility;
- camera offline/recovered;
- AI service healthy/degraded;
- local system online;
- Azure sync not configured or temporarily unavailable;
- reviewed and unreviewed events.

Mock records must be clearly synthetic or approved reference material. Do not place restricted Bangladesh or PTC footage in GitHub.

## Implementation order

### Foundation push — current step

- create module directories and ownership READMEs;
- add workspace metadata without application feature code;
- document deployment modes and module boundaries;
- update GitHub issues for the simplified PoC auth and dashboard sequence.

### Next development step

1. approve dashboard flow, branding direction and demo data fields;
2. initialize React/Vite/TypeScript portal;
3. implement fixed-user authentication and protected routes;
4. implement navigation, layout and design tokens;
5. connect typed mock API adapter;
6. build overview and live-monitoring screens;
7. build events list and event detail;
8. build health and report screens;
9. deploy the isolated dev portal;
10. obtain client feedback at the visit;
11. clean up flows and connect real APIs incrementally.

## Pre-visit objective

The pre-visit demo should communicate the intended workflow, not claim that the AI or camera integration is complete.

Minimum target:

- working login;
- complete navigable portal shell;
- overview screen;
- four-camera demo layout;
- event list;
- event detail and review interaction;
- health screen;
- visible demo/local/Azure status indicators.

## Decisions to obtain during the visit

- dashboard users and simple PoC roles;
- whether the final local dashboard needs login during network isolation;
- approved PTC logo/assets and preferred visual treatment;
- exact KPI labels;
- event review statuses;
- terminology for scan/open/check/frisk;
- whether live monitoring needs four simultaneous streams or one focused view plus thumbnails;
- evidence clip duration and retention;
- dev/UAT access expectations;
- future Entra ID and Azure hosting preference.

## Definition of foundation complete

This planning phase is complete when:

- the monorepo module structure exists;
- each module has a documented responsibility and exclusion boundary;
- dashboard screens and data states are planned;
- PoC auth is intentionally simplified;
- dev, local and optional Azure modes are separated;
- implementation issues are ordered and assigned when team members are available;
- no application feature is falsely presented as completed.