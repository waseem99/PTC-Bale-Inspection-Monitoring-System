# Edge Deployment

## Purpose

The edge workstation is the production runtime for camera connectivity, computer vision, SOP evaluation, evidence generation, and offline event buffering.

## Prerequisites

- approved four-camera installation;
- stable PoE and network connectivity;
- GPU workstation matching the approved BOQ configuration;
- sufficient local storage;
- UPS protection;
- approved Windows environment or an approved alternative;
- client-approved service account and network rules;
- synchronized system time.

## Edge services

1. **Camera ingest and health service**
   - loads camera configuration;
   - connects to RTSP streams;
   - monitors last-frame time;
   - reconnects using controlled backoff.

2. **AI inference service**
   - performs frame preprocessing;
   - executes the approved model;
   - outputs detections with timestamps and confidence.

3. **Tracking and compliance service**
   - maintains camera-local tracks;
   - applies zones and associations;
   - evaluates SOP state transitions;
   - creates outcomes and reason codes.

4. **Evidence service**
   - maintains a rolling frame buffer;
   - produces snapshots and short clips;
   - calculates checksums;
   - applies local retention rules.

5. **Synchronization agent**
   - writes events to a durable local spool;
   - authenticates to the approved API;
   - uploads metadata and evidence;
   - retries without duplication.

6. **Local operations endpoint**
   - exposes service and camera health;
   - supports approved local operational checks;
   - does not expose credentials or unrestricted raw streams.

## Proposed filesystem layout

```text
C:\ProgramData\PTCBaleAI\
├── config\
├── models\
├── rules\
├── spool\
├── evidence\
├── logs\
└── releases\
```

All production paths and access-control rules must be finalized with client IT.

## Configuration

Configuration is environment-specific and must not be committed with production values.

- camera IDs and secure stream references;
- zone coordinates;
- model and rule versions;
- confidence and timing thresholds;
- event evidence duration;
- API endpoint and authentication reference;
- spool and evidence retention;
- logging level.

## Installation workflow

1. validate hardware, GPU driver, and storage health;
2. create the approved service account and directories;
3. install runtime dependencies from signed or approved packages;
4. place the approved model and configuration package;
5. register services for automatic startup;
6. configure firewall and outbound API access;
7. test each camera independently;
8. test all four streams simultaneously;
9. run AI and evidence generation tests;
10. simulate internet loss and recovery;
11. validate automatic service restart;
12. capture the installed release manifest.

## Release package

Each edge release contains:

- versioned service binaries or containers;
- dependency manifest;
- model manifest and checksum;
- configuration schema;
- installation and rollback scripts;
- release notes;
- database/spool migration steps where applicable.

## Rollback

- retain the previous approved release package;
- stop services in the approved sequence;
- back up spool and configuration;
- restore the previous binaries/model/rules;
- restart and validate camera health;
- retain unsynchronized events;
- document the rollback and cause.

## Health checks

- camera online/offline;
- last frame age;
- decoder/reconnect errors;
- inference service status;
- GPU availability and memory;
- queue depth and oldest pending event;
- local disk free space;
- evidence generation errors;
- last successful cloud synchronization.

## Backup and recovery

The edge workstation is not a permanent archive. Recovery planning covers:

- configuration backup;
- model/rule release package;
- unsynchronized event spool;
- documented rebuild procedure;
- evidence retained according to the approved policy.

## Site-security rules

- do not expose RTSP streams outside the approved network;
- do not share camera credentials across users;
- use named service identities where possible;
- restrict local administrator access;
- apply client endpoint-protection requirements;
- record installed software and versions;
- remove development tools not required in production.
