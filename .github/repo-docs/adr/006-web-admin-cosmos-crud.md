# ADR-006: Web-based Admin for Cosmos Content (replace WPF desktop app)

## Status
Accepted

## Date
2026-06-24

## Context
Curated content (movies, series, gaming, parks, monthly-updates) is the source of truth in
Azure Cosmos DB (see [ADR-005](005-cosmos-content-readonly-source-of-truth.md), which noted
"Consider adding write/admin endpoints in a future phase"). Until now, edits were made with a
Windows-only WPF desktop app (`cosmos-manager/`). That tool requires a local install, only
runs on Windows, and cannot be used from other devices.

We want a cross-device, UI-friendly way to manage the same data, secured with Microsoft
(Entra ID) sign-in, without standing up new infrastructure.

### Key constraint discovered
Azure Static Web Apps **managed functions** (how this site's API is hosted) do **not** support
managed identity at runtime — managed identity / Key Vault references on SWA are only available
with "Bring Your Own Functions". Achieving keyless, data-plane-RBAC Cosmos access would require
migrating the entire API to a standalone Function App (large blast radius, new resources, cost).

## Decision
Add an authenticated `/admin` web app to the **existing** Static Web App and managed Functions API.

- **Hosting**: Same SWA (Standard tier already supports custom auth + RBAC). No new resources.
- **AuthN**: Microsoft Entra ID, **single tenant**, configured as a custom provider in
  `staticwebapp.config.json` (`AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`).
- **AuthZ (RBAC)**: A `rolesSource` function (`/api/auth/roles`) maps allow-listed accounts
  (`ADMIN_ALLOWED_EMAILS`) to a custom `admin` role. The **API** routes `/api/content-admin/*` are
  gated with `allowedRoles: ["admin"]`. The static `/admin` SPA is **not** edge-gated; it loads for
  anyone and gates itself via `/.auth/me` (showing a sign-in screen, then a not-authorized screen for
  non-admins). Each admin function **independently** re-checks the `admin` role from the SWA-injected
  `x-ms-client-principal` header (defense in depth). This SPA-self-gating pattern keeps the static
  bundle (which holds no secrets) public while the data API stays fully protected, and avoids a SWA
  CLI emulator crash triggered by edge `401`→login redirects on protected page assets.
- **Cosmos access**: Reuse the existing `AZURE_COSMOS_KEY` (managed functions cannot use managed
  identity). The key never leaves the backend. Admin endpoints operate on raw `System.Text.Json`
  `JsonObject` documents to **preserve unknown fields**, with server-side validation before writes.
- **UI**: A standalone Vite + React + TypeScript SPA in `admin/`, built to `build/admin/` and
  shipped with the existing SWA deploy. Uses `base: '/admin/'` + HashRouter so SWA serves only
  `/admin/index.html`, avoiding conflict with the Docusaurus `/404.html` navigation fallback.
- **Scope**: The 5 content containers only. **No** newsletter management. Admin UI is **English only**.
- **Decommission**: Delete `cosmos-manager/`, its CI workflow, and its `website.sln` entries.

## Consequences

### Positive
- Manage content from any device via the browser; no Windows install.
- No new Azure resources or cost; reuses SWA Standard auth + existing Cosmos connection.
- Unknown-field-preserving writes + server-side validation protect production data.
- Single deploy pipeline ships the public site, API, and admin SPA together.

### Negative
- Cosmos access remains key-based (not keyless RBAC) because SWA managed functions can't use
  managed identity. Mitigated by encrypted app settings, Entra+role gating, and route protection.
- The admin SPA adds a second front-end build step to the deploy workflow.
- Admin UI is English only (acceptable for a single-operator internal tool).

## Notes
- If the API is ever migrated to "Bring Your Own Functions", switch Cosmos to managed identity +
  `Cosmos DB Built-in Data Contributor` and remove the key.
- Consider an audit log (who/what/when) of admin mutations via Application Insights.
- Optimistic concurrency uses Cosmos ETag (`If-Match`) to prevent silent overwrites.
- The admin API is mounted at `/api/content-admin/*`, **not** `/api/admin/*`: `admin` is a reserved
  Azure Functions route prefix (the host owns `/admin/*`), so a function route template starting with
  `admin/` is rejected with "conflicts with one or more built in routes". The `/admin` *page* URL is
  unaffected (that's SWA static routing, not a Functions route).
