# Local Workstation UAT Record

Use this record for the target workstation acceptance under #102. Automated CI evidence is necessary but does not replace this workstation test.

Do not record passwords, tokens, database URLs, camera credentials, private network diagrams, factory media, evidence binaries, database dumps, or model files in this document or GitHub.

## Session information

| Field | Value |
|---|---|
| Date/time | `________` |
| Tester(s) | `________` |
| Workstation/asset | `________` |
| Operating system | `________` |
| Docker/Compose | `________` |
| Git commit/tag | `________` |
| Runtime mode | `simulator` / `hardware-ready` |
| Workstation URL | `________` |
| LAN URL, if approved | `________` |
| Release manifest | `docs/33-local-release-manifest.md` |

## Installation and startup

| Test | Expected | Result | Notes/evidence reference |
|---|---|---|---|
| Fresh bootstrap command | Completes without manual service editing | Pass / Fail | `________` |
| Protected runtime file | Created outside repository; secrets not printed | Pass / Fail | `________` |
| Docker services | Required services healthy | Pass / Fail | `________` |
| Local URL | Dashboard opens from same workstation | Pass / Fail | `________` |
| Cloud independence | Stack operates with internet disconnected | Pass / Fail | `________` |
| Workstation reboot | Data and services recover through documented start | Pass / Fail | `________` |

## Authentication and roles

| Test | Expected | Result | Notes |
|---|---|---|---|
| Viewer login/refresh/logout | Session works; logout clears session | Pass / Fail | `________` |
| Supervisor login | Supervisor capabilities visible | Pass / Fail | `________` |
| Administrator login | Administrative operations available | Pass / Fail | `________` |
| Incorrect password | Safe 401 response | Pass / Fail | `________` |
| Viewer review attempt | Rejected with 403 | Pass / Fail | `________` |
| Session expiry | Expired session returns to login | Pass / Fail | `________` |
| Origin protection | Unapproved mutation origin rejected | Pass / Fail | `________` |

## Dashboard and events

| Test | Expected | Result | Notes |
|---|---|---|---|
| Overview totals | Reconcile with Events and Reports | Pass / Fail | `________` |
| Four cameras | All logical cameras displayed | Pass / Fail | `________` |
| Camera states | Online/offline/reconnecting/disabled shown correctly | Pass / Fail | `________` |
| Events search/filter | Correct filtered results | Pass / Fail | `________` |
| Sorting/pagination | Stable and correct | Pass / Fail | `________` |
| Event detail | Camera, outcome, reason, confidence and ordered steps shown | Pass / Fail | `________` |
| Completed event | Correctly represented | Pass / Fail | `________` |
| Missed event | Correctly represented | Pass / Fail | `________` |
| Incomplete event | Correctly represented | Pass / Fail | `________` |
| Unresolved event | Correctly represented without false violation certainty | Pass / Fail | `________` |
| Operational failure | Kept separate from process violation | Pass / Fail | `________` |

## Review and audit

| Test | Expected | Result | Notes |
|---|---|---|---|
| Supervisor confirm | Persists with remarks | Pass / Fail | `________` |
| Supervisor dismiss | Persists with remarks | Pass / Fail | `________` |
| Audit history | Actor/action/time visible | Pass / Fail | `________` |
| Stale concurrent update | Rejected with conflict | Pass / Fail | `________` |
| Restart persistence | Review and audit survive API/database restart | Pass / Fail | `________` |

## Evidence

| Test | Expected | Result | Notes |
|---|---|---|---|
| Pending metadata | Becomes available after binary finalization | Pass / Fail | `________` |
| Snapshot | Authenticated display/download works | Pass / Fail | `________` |
| Clip/range | Authenticated byte-range playback works | Pass / Fail | `________` |
| Viewer evidence access | Authorized read works | Pass / Fail | `________` |
| Unauthenticated evidence | Rejected | Pass / Fail | `________` |
| Missing evidence | Safe unavailable state | Pass / Fail | `________` |
| Consistency dry run | Missing/orphan/unsafe references reported | Pass / Fail | `________` |
| Evidence remains private | No public filesystem URL | Pass / Fail | `________` |

## Realtime and resilience

| Test | Expected | Result | Notes |
|---|---|---|---|
| Realtime event update | Arrives without page reload | Pass / Fail | `________` |
| Polling fallback | Data refreshes when realtime is unavailable | Pass / Fail | `________` |
| API outage | Edge spool queues without false acknowledgement | Pass / Fail | `________` |
| API recovery | Pending delivery resumes | Pass / Fail | `________` |
| PostgreSQL outage | API fails safely; spool retains pending work | Pass / Fail | `________` |
| Exact duplicate replay | No duplicate event/evidence/audit rows | Pass / Fail | `________` |
| Conflicting ID replay | Rejected safely | Pass / Fail | `________` |
| Proxy restart | Browser access recovers | Pass / Fail | `________` |
| Low disk/storage unavailable | Visible safe health state | Pass / Fail | `________` |
| Hardware-ready mode | Simulator generation disabled | Pass / Fail | `________` |

## Reports

| Test | Expected | Result | Notes |
|---|---|---|---|
| Report filters | Match Events filters | Pass / Fail | `________` |
| CSV export | Correct rows and active filters | Pass / Fail | `________` |
| PDF report | Opens and contains reconciled totals | Pass / Fail | `________` |
| No secrets in downloads | Verified | Pass / Fail | `________` |

## Backup, restore and upgrade

| Test | Expected | Result | Notes |
|---|---|---|---|
| PostgreSQL backup | Custom-format dump created | Pass / Fail | `________` |
| Evidence backup | Separate archive created | Pass / Fail | `________` |
| Checksums | SHA-256 verification passes | Pass / Fail | `________` |
| Guarded restore | Requires confirmation and completes | Pass / Fail | `________` |
| Restore reconciliation | Users/cameras/events/reviews/audits/evidence metadata match | Pass / Fail | `________` |
| Upgrade backup | Pre-upgrade backup created | Pass / Fail | `________` |
| Forward migrations | Apply successfully | Pass / Fail | `________` |
| Application rollback procedure | Reviewed/tested where applicable | Pass / Fail | `________` |

## Optional trusted-LAN test

Complete only after workstation-only UAT passes and firewall approval is available.

| Test | Expected | Result | Notes |
|---|---|---|---|
| Binding | Only approved port exposed | Pass / Fail / N/A | `________` |
| Firewall | Restricted to approved subnet/devices | Pass / Fail / N/A | `________` |
| Second device login | Works over private LAN | Pass / Fail / N/A | `________` |
| Unauthorized origin/device | Rejected or blocked | Pass / Fail / N/A | `________` |
| Return to local-only mode | Binding and firewall restored | Pass / Fail / N/A | `________` |

## Defects and limitations

| ID | Severity | Description | Owner | Decision/target |
|---|---|---|---|---|
| `________` | P0/P1/P2/P3 | `________` | `________` | `________` |

No P0/P1 local software defect may remain open at acceptance unless explicitly accepted in writing by the authorized decision-maker.

## Acceptance decision

- [ ] Accepted for simulator-driven local software use.
- [ ] Accepted for hardware-ready integration.
- [ ] Rejected; blocking defects listed above.

| Role | Name | Decision | Date |
|---|---|---|---|
| Technical owner | `________` | Accept / Reject | `________` |
| DevOps/release owner | `________` | Accept / Reject | `________` |
| PM/UAT owner | `________` | Accept / Reject | `________` |
| Client representative, when required | `________` | Accept / Reject | `________` |
