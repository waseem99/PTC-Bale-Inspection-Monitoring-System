# Historical Software-Completion Release Plan

**Approved:** 2026-07-31  
**Status:** Superseded historical planning record

> This file preserves the July 2026 software-completion strategy. It is not the current release plan or repository baseline. Use [`51-current-release-and-control-state.md`](51-current-release-and-control-state.md) for current status and [`35-pm-ai-project-closure-runbook.md`](35-pm-ai-project-closure-runbook.md) for the active closure sequence.

## Historical purpose

This plan established the original software-complete direction: consolidate the React/Node/PostgreSQL platform, complete authenticated APIs, evidence/realtime/reporting, simulators, CI/deployment and UAT before final physical camera/model integration.

It also established the lasting rule that restricted factory media, credentials, evidence, datasets, database backups and model binaries remain outside GitHub.

## Historical release train

The original sequence used issues #78–#83 to reconcile source, consolidate backend/deployment work, complete contracts/simulators, evidence/realtime/reporting and certify the software platform before #84/#85 physical/AI integration.

That sequence has since been substantially completed and superseded by later merged work and reconciled issue states. It must not be used to infer that PR #69/#70, Vercel/AWS assumptions, #14 governance acceptance or the July release baseline remain current.

## Current correction

The current project position is now narrower:

- repository/platform and AI framework work is complete;
- #14 governance is closed;
- the current software baseline is recorded in `51-current-release-and-control-state.md` rather than this plan;
- #83 remains only a target deployment/acceptance gate;
- #102 and #148 are finite local/real-environment execution gates;
- #84/#27–#34/#114–#116/#85/#86 control real PTC site/data/model acceptance;
- broad toolchain, HA, enterprise-security and framework expansion are not closure work without a demonstrated need or approved change request.

## Preserved architecture decisions

The following high-level implementation choices remain valid unless separately superseded:

- React/TypeScript frontend;
- Node.js/Express/TypeScript API;
- PostgreSQL/Prisma persistence;
- local-first/offline-capable factory operation;
- camera/edge/AI integrations behind versioned adapters;
- protected evidence/review/audit/reporting;
- restricted data and model artifacts outside GitHub.

For current execution, release identity, governance and issue status, use the canonical current-state document only.
