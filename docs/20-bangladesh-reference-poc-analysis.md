# Bangladesh Reference PoC Analysis and PTC Translation

## Purpose

This document records what can and cannot be concluded from the reference material shared by the client/project owner, and translates that material into the fixed-scope PTC Proof of Concept.

The reference implementation is a **benchmark and feasibility reference**. It is not a complete requirements specification, source-code handover, architecture definition, or instruction to reproduce every visible feature.

## Source set reviewed

The restricted Google Drive folder contains:

- four still images from an existing bale-inspection environment;
- one approximately 47-second bale-monitoring output video;
- one approximately 56-second generic computer-vision demonstration;
- a meeting recording and machine-generated meeting transcript;
- the awarded BOQ;
- bid-scenario files.

The project owner has identified the bale-related material as coming from a similar Bangladesh implementation and has stated that PTC wants to replicate the concept through the current PoC.

Raw media remains in the restricted Drive folder and must not be copied into GitHub.

## Evidence classification

### Directly observed in the bale-reference media

- a fixed industrial inspection area with roller/conveyor surfaces;
- large tobacco bales being moved and handled manually;
- multiple workers and multiple bales present in the same camera view;
- ceiling/overhead fixed-camera installation;
- camera coverage positioned above the inspection line rather than at worker eye level;
- a local wall-mounted display near the operating area;
- AI overlay identifying at least one bale with a bounding box and confidence value;
- camera-level overlay text identifying `Camera 02`;
- an apparent bale status overlay containing the words `Not Scanned` in one sequence;
- substantial occlusion caused by people, bales, loose leaves, and simultaneous movement;
- a slide titled `Solution's PoC Journey in 2024` showing the following stages:
  1. infrastructure, network, and camera setup;
  2. model training and development;
  3. AI model implementation;
  4. dashboard development;
  5. completion of the PoC scope.

### Directly supported by the awarded BOQ and proposal

The PTC PoC is required to provide:

- four 5 MP industrial colour cameras;
- camera mounts, CAT6 cabling, network switch, GPU-enabled processing server, storage, and UPS;
- offline/local AI inference;
- site-specific AI model development and tuning;
- a local intranet browser dashboard;
- bale opening and frisking detection;
- skipped or incomplete frisk detection;
- timestamped image/video evidence;
- installation, survey, testing, calibration, training, and warranty support.

### Supported by the meeting transcript only with caution

The automatic transcript is materially inaccurate in several places. The reliable intent visible in the clearer section is that the client wants the system to differentiate **which specific bale/box was not opened**, while the immediate/basic requirement is to confirm whether the bale was opened. Unclear transcript wording must not be converted into requirements without written client confirmation.

### Generic demonstration, not bale-project evidence

The second shared video displays generic person tracking, named tracks, dwell-time labels, movement trails, and item/cup counts in a café-like environment. It demonstrates that computer vision can combine detection, tracking, duration, and counting, but it does **not** establish that the Bangladesh bale solution included:

- worker identification;
- named employees;
- dwell-time KPIs;
- item counting;
- employee productivity scoring;
- the same model, code, architecture, or dashboard.

These generic features remain outside the PTC scope.

## What the reference PoC appears to prove

The Bangladesh reference demonstrates the feasibility of a process-focused camera system where:

1. fixed cameras observe an existing manual bale-handling process;
2. an AI model identifies bales within a cluttered inspection area;
3. camera-specific processing produces a status or exception overlay;
4. the solution is built iteratively, beginning with physical infrastructure and site data;
5. a dashboard or local display is introduced after model implementation;
6. the PoC validates one bounded workflow before wider rollout.

This supports the overall PTC approach, but it does not prove that the reference system can be copied without PTC-specific data collection, camera planning, training, calibration, or acceptance testing.

## Physical workflow characteristics relevant to PTC

The reference environment creates the following engineering conditions:

- **large deformable objects:** a bale changes appearance as covering and leaves are moved;
- **dense worker interaction:** workers frequently overlap the bale and each other;
- **multiple bales in view:** the system must maintain separate short-lived inspection sessions;
- **loose material:** tobacco leaves and wrapping can generate visual clutter;
- **manual movement:** entry, stop, inspection, rehandling, and exit timing may be irregular;
- **high mounting position:** the top-down view helps observe bale surfaces and worker hands but may hide actions on the far side;
- **lighting variation:** windows, roof lighting, and shadows can affect appearance;
- **process variation:** different workers may perform the same inspection with different body motions.

The PTC site survey must validate whether the same camera geometry is suitable. The reference overhead placement is a starting hypothesis, not an approved PTC design.

## PTC PoC problem definition

The PoC is not a full production rollout. Its primary technical question is:

> Can a four-camera, locally processed computer-vision system reliably create a camera/zone-specific bale inspection session, observe the required opening and frisking actions defined by PTC, distinguish completed, missed, incomplete, and unresolved cases, and provide timestamped evidence through the agreed dashboard?

The PoC should validate this question in the approved inspection zone under representative operating conditions.

## Required PoC processing model

### 1. Camera-local bale session

A session begins when a bale meets the approved entry condition for a configured camera/zone. The session uses an anonymous, temporary ID. It ends at the approved exit or timeout condition.

A temporary camera track is not a permanent business identity. The reference media does not prove cross-camera identity, and the PTC scope does not include barcode, QR, RFID, or ERP integration.

### 2. Bale and person detection

The AI must detect the bale and anonymous persons needed to evaluate interaction. Worker identity, face recognition, named tracks, and employee scoring are prohibited by scope.

### 3. Zone and interaction signals

The system should use observable signals appropriate to the approved PTC SOP, such as:

- bale presence in entry, inspection, and exit zones;
- worker proximity and interaction with the tracked bale;
- opening/exposure of the bale or approved visible proxy;
- frisking/checking interaction for an approved minimum condition;
- session duration and sequence timing;
- visibility and occlusion quality.

The exact visual proxies must be approved after PTC footage is reviewed. The word `Scanned` seen in the reference output must not be adopted as a PTC requirement unless the client confirms that scanning is part of the local SOP.

### 4. Deterministic SOP state machine

AI detections and interaction signals feed a versioned state machine that produces one of:

- completed inspection;
- missed inspection;
- incomplete inspection;
- unresolved/insufficient visibility;
- operationally unavailable due to camera/system outage.

An outage or unusable view must not be reported as a process violation.

### 5. Evidence and review

For each approved event, store:

- camera and configured zone;
- temporary session/track ID;
- event and reason code;
- UTC and local-site timestamps;
- model, rule, and camera-configuration versions;
- snapshot and short evidence clip;
- human review status and remarks.

## Architecture implications

### Local-first core

The BOQ and technical proposal require offline/local inference and a local intranet dashboard. Therefore:

- camera decoding, AI inference, SOP evaluation, event creation, and evidence generation run on the site workstation;
- core event review must remain available on the approved local network;
- internet or Azure interruption must not stop the inspection pipeline;
- the local spool/database must preserve pending events.

### Microsoft/Azure alignment

The application may also use PTC-approved Azure services for deployment, identity, monitoring, or centralized management. This remains a hybrid design decision under issue #11. Azure must not replace the local operating capability committed in the BOQ unless the client formally changes that requirement.

### No unnecessary IoT platform

The reference material shows conventional camera/network infrastructure, not a requirement for custom IoT hardware or firmware. Azure IoT Hub, IoT Edge, custom sensors, PLC integration, RFID, or scanner integration must not be introduced into the PoC without an approved change request.

## Data and model implications

### Bangladesh footage is reference data, not acceptance data

The shared footage may be used to understand:

- camera geometry;
- bale appearance;
- potential occlusion patterns;
- possible UI/status conventions;
- broad feasibility.

It must not replace PTC site footage for final training, calibration, or acceptance because the sites may differ in:

- bale types and wrapping;
- conveyor geometry;
- camera height and lens;
- lighting and background;
- worker count and motion;
- exact inspection/frisking SOP;
- uniforms, tools, and operating pace.

Use of any Bangladesh frames for training also requires explicit confirmation of data-use rights and an approved dataset record. Until then, treat the media as visual reference only.

### Required PTC dataset coverage

The PTC collection plan must include:

- all four approved camera perspectives;
- unopened and opened bale states;
- valid completed frisking/checking;
- no opening/no frisking;
- partially completed action;
- rework and repeated interaction;
- multiple workers and multiple bales;
- occlusion, glare, shadows, dust, and loose leaves;
- stopped conveyor and abnormal dwell;
- camera disconnect or unusable footage;
- safe staged violations approved by the client.

Training, calibration, and locked acceptance sequences must be separated.

## Dashboard implications

The reference assets support a simple operational dashboard/display, not a large analytics platform. The PTC PoC dashboard remains limited to:

- four live camera views where network/browser delivery is approved;
- camera and service health;
- completed, missed, incomplete, and unresolved events;
- event list and detail;
- snapshot and short clip evidence;
- camera, date/time, event type, and review-status filters;
- reviewed/unreviewed status and remarks;
- basic on-demand CSV/PDF export.

The following are not imported from the reference or generic demo:

- mobile application;
- named workers;
- dwell-time employee metrics;
- production ranking;
- cup/item counting;
- scanning-device workflow;
- multi-site management;
- predictive analytics;
- automatic scheduled reports unless separately confirmed.

## PoC stage gates

### Gate 0 — Reference-to-PTC scope mapping

- reference observations documented;
- PTC process owner confirms what is relevant;
- `scan` versus `open/frisk` terminology resolved;
- no visible reference feature silently enters scope.

### Gate 1 — SOP and camera feasibility

- exact opening/frisking sequence approved;
- four proposed camera views demonstrate visibility of required actions;
- unresolved/occluded behavior approved;
- PTC site footage collection authorized.

### Gate 2 — Baseline AI feasibility

- bale and person detector evaluated by camera;
- temporary tracks and sessions work on representative sequences;
- opening/frisking signal produces measurable results;
- workstation benchmark supports four configured streams.

### Gate 3 — Integrated PoC

- state machine produces approved outcomes and reason codes;
- timestamped evidence is generated;
- events survive connectivity interruption;
- local dashboard supports the approved review workflow.

### Gate 4 — UAT and decision

- locked completed, missed, incomplete, unresolved, and outage scenarios executed;
- results and known limitations documented;
- PTC records PoC acceptance and any conditions for production-scale rollout;
- production rollout features remain a separate phase/change request.

## Differences between the reference and the PTC PoC

| Area | Reference evidence | PTC PoC commitment |
|---|---|---|
| Geography/site | Bangladesh reference according to project owner | PTC-approved Pakistan inspection site |
| Purpose | Existing process-monitoring PoC | Validate opening and frisking compliance |
| Camera arrangement | Overhead fixed cameras visible | Four BOQ cameras; final placement after survey |
| AI status | Bale detection and apparent `Not Scanned` state | Completed, missed, incomplete, unresolved, and health states based on PTC SOP |
| Identity | No permanent bale identity proven | Temporary camera/zone session only |
| Worker processing | Workers visible | Anonymous person tracks only |
| Dashboard | Local display/phone view appears in assets | Local browser dashboard and approved Azure alignment |
| Data | Reference-site footage | PTC-specific training, calibration, and locked UAT footage |
| Scale | Bounded PoC journey | Fixed PTC PoC; wider rollout excluded |

## Decisions and clarifications required

1. Does `scan` in the reference correspond to opening/frisking, a barcode/device scan, or another action?
2. What exact physical actions constitute valid bale opening and valid frisking at PTC?
3. How many opening/checking points must be observed for one bale?
4. Can multiple bales be inspected simultaneously in the same camera zone?
5. Is one camera authoritative per zone, or must events combine multiple views?
6. What is the rule when the required action is hidden by workers or another bale?
7. Which reference dashboard elements does PTC actually expect in the PoC?
8. Is the dashboard required locally only, Azure-hosted, or both?
9. May the Bangladesh media be used for model training, or only as reference?
10. What numerical and scenario-based criteria determine PoC success?

These decisions are tracked through issues #9, #11, #13, #15, #27, and the dedicated reference-mapping issue.
