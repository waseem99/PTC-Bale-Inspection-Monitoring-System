# Historical GitHub Issue Map

**Status:** Historical planning/index record

> This file preserves the original issue structure created from the awarded scope. It is not a current status board and must not be used to infer which issues are open, closed, blocked or next. Use [`51-current-release-and-control-state.md`](51-current-release-and-control-state.md) for the current release/closure state and GitHub itself for live issue status.

## Original milestone structure

### M0 — Scope and architecture

#1, #59, #9, #10, #11, #12, #13, #14, #60

### M1 — Site and hardware readiness

#2, #15, #16, #17, #18, #19

### M2 — Edge video and evidence platform

#3, #20, #21, #22, #23, #24, #25, #26

### M3 — AI inspection compliance

#4, #27, #28, #29, #30, #31, #32, #33, #34

### M4 — React/Node/PostgreSQL application and management-plane work

#5, #35, #36, #37, #38, #39, #40, #41, #42, #43, #68

### M5 — Dashboard and development demo

#6, #44, #45, #46, #47, #48, #61, #63, #64, #65, #66, #67

### M6 — Integration and release

#7, #49, #50, #51, #52, #53

### M7 — Hypercare and stabilization

#8, #54, #55, #56, #57

## Historical dependency shape

The original plan linked scope/site readiness to controlled data and AI development, platform/backend readiness to integration, and release/UAT to handover/hypercare. Later issues and acceptance gates refined that sequence substantially.

The **current** controlling AI execution sequence is maintained only in `docs/51-current-release-and-control-state.md` and `docs/35-pm-ai-project-closure-runbook.md`.

## Do not use this file for current execution

The original version of this map contained dated statements such as pending #14 governance setup, old frontend/backend PR queues and early PostgreSQL validation instructions. Those operational instructions have been removed because they are now obsolete and could reopen already completed work.

For current work:

- use the canonical current-state document for what remains;
- use the live GitHub issue body/comments for exact acceptance evidence;
- do not reopen closed historical issues solely because they appear in this original map.
