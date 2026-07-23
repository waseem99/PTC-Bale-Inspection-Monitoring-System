# Platform API

Planned Node.js, Express and TypeScript API for portal workflows and local PoC persistence.

## Responsibilities

- fixed-user PoC authentication and session validation;
- event, evidence, health, review and export endpoints;
- local MongoDB-compatible persistence;
- authorization and audit records;
- local Socket.IO updates;
- optional Azure synchronization and future Entra token validation.

## Exclusions

- no camera decoding;
- no AI inference;
- no duplicated SOP state-machine logic;
- no enterprise user-administration portal during the PoC.

Implementation is tracked under issues #35–#43.
