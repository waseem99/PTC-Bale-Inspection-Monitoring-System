# Production Network and Credential Hardening

Status: software boundary complete for issue #146. Physical VLAN/firewall/camera capability verification remains part of #84.

## Security boundary

The supported production pattern is local-first and segmented:

`Camera network -> AI/edge runtime -> Platform API -> PostgreSQL/evidence -> Dashboard proxy -> approved users`

The browser never connects directly to PostgreSQL or to a camera RTSP/RTSPS stream. Camera stream addresses and credentials belong only in protected edge/camera runtime configuration outside Git and outside frontend build variables.

## Service / port exposure matrix

| Component | Protocol / port | Intended consumer | Host / user reachable? | Required bind / boundary |
| --- | --- | --- | --- | --- |
| Local workstation proxy (Caddy) | HTTP 80 inside container; host `${LOCAL_HTTP_PORT:-8080}` | Approved local browser | Yes, intentionally | `127.0.0.1` by default; trusted-LAN bind only after PTC approval |
| AWS/staging ingress (Caddy) | HTTP 80 / HTTPS 443, plus HTTP/3 UDP 443 where enabled | Approved browser / staging checks | Yes, staging ingress only | Public/reverse-proxy boundary; API/dashboard remain container-only |
| Dashboard Nginx | HTTP 8080 | Caddy/proxy | No direct production host publish | Docker frontend/internal network only; local API test harness is loopback-bound |
| Platform API | HTTP 4000 | Proxy, dashboard same-origin path, edge/runtime | No direct production host publish | Docker network only; browser uses approved `/api` proxy path |
| PostgreSQL | TCP 5432 | Platform API, migration/backup tools | **Never browser/user facing** | Backend/internal Docker network only; no Compose `ports:` publication |
| Edge spool/runtime | Outbound HTTP to API 4000; no inbound service port | AI/edge process | No | Backend/internal network only |
| Evidence content | API route over the same approved HTTPS/HTTP proxy | Authenticated application users | Only through API authorization | Evidence files are not directly published from storage |
| Camera video stream | RTSP commonly 554; RTSPS/TLS port is device/vendor specific | AI/edge runtime only | No browser access | Camera VLAN + ACL/firewall; credentials in protected runtime config |
| Camera management | HTTPS/management ports are device specific | PTC administrators | PTC-controlled only | Management VLAN/ACL; never exposed through application API |
| Entra/OIDC activation | HTTPS 443 | Browser/API identity flow | Only when PTC activates IAM | See `docs/46-enterprise-identity-readiness.md`; activation remains PTC-owned |

`EXPOSE`/Compose `expose` is container metadata/internal reachability and does not publish a service to the host. Only Compose `ports:` entries create host listeners in the supplied runtime definitions.

## Implemented software controls

- Production PostgreSQL has no host-published port in local workstation, local API harness, or AWS staging Compose definitions.
- Production workstation API, dashboard and edge services are not directly host-published; the workstation proxy is the single host-facing entry point.
- The local API harness now binds the dashboard to `127.0.0.1` by default instead of all interfaces.
- The API production configuration rejects `SIMULATOR_ENABLED=true`.
- The workstation edge runtime defaults to `hardware-ready`; simulator mode requires an explicit CI/UAT override.
- No `/debug`, `/api/debug`, `/simulator`, or `/api/simulator` route is part of the production API surface.
- Per-camera `VITE_CAMERA_01..04_PREVIEW_URL` variables were removed. Vite/browser configuration now has only the non-secret selector `VITE_CAMERA_PREVIEW_MODE=drive|local`.
- Recorded dashboard previews are either fixed shared Drive previews or local `/media/camera-01..04.mp4` files; they are separate from operational camera streams.
- Camera API responses expose operational metadata only and do not return stream addresses, private camera credentials or passwords.
- CI builds the frontend while intentionally supplying hostile legacy RTSP/database canaries and fails if any canary, credentialed RTSP/RTSPS URL or database connection string appears in the browser bundle.
- A static network-boundary verifier checks Compose publication, loopback defaults, production simulator settings, browser build variables and debug/simulator HTTP route absence.

## Camera transport position for #84

Preferred transport is **RTSPS/TLS when the actual camera model and firmware support it reliably**. The application does not claim or invent RTSPS capability before site verification.

If a camera supports only plain RTSP, acceptance is based on compensating network controls verified under #84:

1. Camera 01–04 are placed on a dedicated camera VLAN or equivalent isolated segment.
2. Only the approved AI/edge host can reach camera stream ports.
3. User/browser networks cannot reach RTSP or camera management interfaces.
4. Each camera uses a unique non-default credential stored outside Git and outside frontend/browser configuration.
5. Camera management access is restricted to approved PTC administrative paths.
6. Firewall/ACL behavior, firmware capability, actual RTSP/RTSPS port and reconnect behavior are recorded during site acceptance.
7. WAN loss does not prevent local camera -> AI/edge -> API -> PostgreSQL/dashboard processing.

These controls are PTC/site infrastructure verification items. Their absence does not create undefined Codistan software work; it is recorded as an external dependency/limitation at #84 unless a separate change request is approved.

## Verification commands

```bash
node scripts/security/verify-network-boundary.mjs
pnpm --filter @ptc-bale/dashboard-web test -- cameraPreview.test.tsx
pnpm --filter @ptc-bale/platform-api test
```

GitHub Actions also runs `Network Boundary CI`, including a hostile-secret-canary production frontend build and bundle scan.

## Closure statement

Issue #146 is complete when the code/CI changes are merged and green. Actual VLAN creation, firewall ACL enforcement, PoE/switch configuration, camera firmware/settings and confirmation of RTSPS capability remain #84 / PTC site responsibilities.
