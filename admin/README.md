# Content Admin (`/admin`)

Authenticated, browser-based admin for managing the site's Azure Cosmos DB content
(movies, series, gaming, parks, monthly-updates). It replaces the former Windows
`cosmos-manager` desktop app. Built as a standalone **Vite + React + TypeScript** SPA and
shipped inside the existing Static Web App at `/admin`.

- **Auth:** Microsoft Entra ID sign-in via Static Web Apps; only accounts with the custom
  `admin` role (see `api/GetRoles.cs`) can use the UI or the `/api/content-admin/*` endpoints.
- **Routing:** `base: '/admin/'` + HashRouter, so the SWA only ever serves `/admin/index.html`.
- **Output:** builds into `../build/admin/` so it deploys with the single SWA pipeline.
- Internal tool — **English only** (excluded from i18n governance).

## Prerequisites

- Node.js matching the root [`package.json`](../package.json) engine range (22.22.2+, 24.15.0+, or 26+).
- .NET 8 SDK
- [Azure Static Web Apps CLI](https://github.com/Azure/static-web-apps-cli): `npm i -g @azure/static-web-apps-cli`
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) (for the API)

## Local development & testing

The admin needs the .NET API (managed functions) plus an auth identity. There are two ways to run
it locally:

- **Recommended — Vite dev server with mock auth** (reliable on Windows). The Vite dev server
  ([vite.config.ts](vite.config.ts)) mocks `/.auth/*` and injects the SWA `x-ms-client-principal`
  header into the `/api` proxy, so you exercise the **real** SPA + API + Cosmos CRUD without the
  (Windows-flaky) SWA CLI.
- **Optional — full SWA CLI emulator** (closest to production: real `/.auth/*` mock login + route
  gating, but the CLI is unstable on Windows — see the caveat below).

### Recommended: Vite dev server + mock auth

```powershell
# Terminal 1: start the API (Functions host) — VS Code task "func: 4", or:
cd api ; func start                 # http://localhost:7071

# Terminal 2: start the admin SPA with mock auth
npm --prefix admin run dev          # http://localhost:5173/admin/
```

Open <http://localhost:5173/admin/>. You're signed in as a mock **admin** by default, so the app
loads and CRUD calls hit the live Functions host. Control the mock identity with env vars (set
them in Terminal 2 *before* `npm run dev`):

| Env var | Default | Effect |
|---------|---------|--------|
| `ADMIN_DEV_ROLES` | `admin` | Comma-separated roles. Use `authenticated` to see the **Access denied** screen; `none` (or empty) to see the **Sign in** screen. |
| `ADMIN_DEV_USER` | `local-admin@dev.local` | The `userDetails` shown in the UI. |

```powershell
# Example: test the "not authorized" path
$env:ADMIN_DEV_ROLES = "authenticated"; npm --prefix admin run dev
```

> This mock **only** runs under `npm run dev` (`apply: 'serve'`); `vite build` never includes it.
> It does not test the SWA *route* gating (`allowedRoles`) — that's a platform feature validated in
> the deployed Azure SWA — but it fully exercises the SPA auth gate and the in-function `admin`
> check (`api/AdminContent.cs` → `api/ClientPrincipal.cs`).

### Optional: full SWA CLI emulator (full-fidelity, Windows-flaky)

> **The SWA CLI 2.0.9 (latest) is unstable on Windows.** It crashes on **Node 22/24** with a libuv
> assertion (`!(handle->flags & UV_HANDLE_CLOSING) ... async.c`), and even on **Node 20 LTS** it can
> intermittently crash with `unexpected response content-type` while serving the Docusaurus
> `404.html`. Prefer the Vite path above for day-to-day work; use this when you specifically need
> the real `/.auth/*` mock login or route-gating behavior. One-time setup:
>
> ```powershell
> winget install -e --id CoreyButler.NVMforWindows
> nvm install 20
> npm i -g @azure/static-web-apps-cli
> ```

```powershell
# From the repo root — build the site and the admin SPA
npm run build                 # Docusaurus -> build/
npm --prefix admin run build  # Admin SPA  -> build/admin/

# Terminal 1: start the API (Functions host)
cd api ; func start           # http://localhost:7071

# Terminal 2: serve the built output + API + auth emulator with the SWA CLI on Node 20.
# The helper resolves the Node 20 binary (from nvm) and the SWA CLI entry point, sets the
# dummy auth env vars, and launches the emulator — no elevated `nvm use` required. Run it from
# anywhere; it resolves paths against the repo root.
./scripts/start-swa-admin.ps1
```

Open <http://localhost:4280/admin>. The SPA shows its **Sign in** screen; clicking it opens the SWA
CLI's **mock login** — set **Roles** to `admin` and submit. The emulator injects an
`x-ms-client-principal` with that role, so the SPA loads and `/api/content-admin/*` authorizes you.
(The static `/admin` page is intentionally *not* edge-gated — it gates itself via `/.auth/me`, so
the CLI never serves a `401`→login redirect, which made the crashes worse.)

> The `<AAD_TENANT_ID>` placeholder in `static/staticwebapp.config.json` does **not** matter
> locally — the SWA CLI mocks sign-in and never contacts Entra ID.

```powershell
npm --prefix admin run typecheck
```

## Configuration — where settings go

The admin's backend settings live in **`api/local.settings.json`** (the `Values` object) — the
same file the rest of the API uses. **There is no `.env.local` for the API.**

| Setting | Needed locally? | Where it's used |
|---------|-----------------|-----------------|
| `AZURE_CLIENT_ID` | ⚠️ Dummy value | Must merely *exist* in the shell env that runs `swa start` (custom-provider check). Any value works — login is still mocked. The real value is only set in Azure. |
| `AZURE_CLIENT_SECRET` | ⚠️ Dummy value | Same — any value locally; the real secret is only set in Azure. |
| `ADMIN_ALLOWED_EMAILS` | ❌ No | Read by the `GetRoles` rolesSource function, which runs in **Azure**, not the local emulator. Locally you pick the `admin` role in the mock login. |
| `AZURE_COSMOS_ENDPOINT` | ✅ Yes | Cosmos connection (already present). |
| `AZURE_COSMOS_KEY` | ✅ Yes | Cosmos connection (already present). |
| `AZURE_COSMOS_DATABASE_NAME` | ✅ Yes | Cosmos database (already present). |

Set the two `AZURE_CLIENT_*` vars to any dummy value in the terminal before `swa start`
(the SWA CLI only checks they exist). The Cosmos settings already in `api/local.settings.json`
are what the admin API actually uses to read/write data.

> ⚠️ **Those Cosmos settings point at the production account.** Local admin create/update/delete
> affects **live** data. Test reads first, or point the settings at the
> [Cosmos DB emulator](https://learn.microsoft.com/azure/cosmos-db/emulator) or a scratch database.

## Azure setup (one-time, for production)

1. Register a **single-tenant** Microsoft Entra ID app. Add redirect URI
   `https://<your-site>/.auth/login/aad/callback`. Create a client secret.
2. In the Static Web App, add application settings: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`,
   and `ADMIN_ALLOWED_EMAILS` (comma/semicolon-separated emails granted the `admin` role).
3. Add a GitHub Actions **repository variable** `AAD_TENANT_ID` (Settings → Secrets and variables →
   Actions → Variables) with your Entra tenant ID. The deploy workflow injects it into
   `staticwebapp.config.json` (replacing the `<AAD_TENANT_ID>` placeholder) at build time — SWA
   can't substitute env vars in `openIdIssuer`, and the build fails fast if the variable is unset.

## How it fits together

### TMDB connection and media editing

Open **Movies** or **Series** for the TMDB connection panel. First configure the
server account using the [TMDB setup guide](../.github/repo-docs/tmdb-setup.md).
Credentials stay in server settings; the panel uses your signed-in admin role.

**Preview TMDB sync** is the default and makes no database writes. The panel
automatically follows 20-document batches, displays cumulative counts, and only
reports completion after the final batch. For explicit retryable failures,
**Resume interrupted sync** continues from acknowledged progress. Earlier
successful batches remain saved; they are not rolled back or deleted. Closing
the panel stops requesting further batches. Changing options starts a new chain.
Uncheck **Dry run** and start **Sync TMDB** after reviewing the preview.

Imported entries can use a TMDB ID without an IMDb ID. The form supports TMDB
ratings, en/es/pt titles and overviews, stored posters, and TMDB preview links.
Legacy IMDb-only documents still work. Personal TMDB ratings use half-point
increments; an empty rating means unrated. Unknown fields and localized genre
arrays are preserved (edit nested arrays via **Raw JSON**).

Non-top lists, including the admin grid, follow the TMDB newest-added snapshot
order. **Top Movies / Top TV Shows** retain manually editable ascending **Order**.
Imported non-top order and sync ownership fields are read-only in the typed form.
Do not change ownership/snapshot fields through Raw JSON unless repairing data.
Sync preserves manually curated top documents, reviews, and unrelated fields.
Daily automation is configured in the setup guide; it runs only after deployment
and server/GitHub configuration.

### Gaming connections and ordering

Open **Gaming** to refresh Xbox, PlayStation, or both connections. The action
fetches fresh data immediately and reports each provider's result; it does not
import library entries into curated game cards. Your signed-in `admin` role
authorizes the request, so you do not need to paste a refresh key into the UI.
Automation can still use `X-Gaming-Refresh-Key` with `GAMING_REFRESH_KEY`.

If PlayStation authentication expires, obtain a new NPSSO token and update
`PSN_NPSSO_TOKEN` in the server app settings before clicking **Refresh PlayStation**.
Manual refresh bypasses the cached access token. Xbox uses `XBOX_API_KEY` and
`XBOX_GAMERTAG_XUID`. Failed refreshes retain the last working profile rather
than clearing it. Public widgets retain their normal browser cache lifetimes.

New gaming cards automatically receive a server-side `createdAt` timestamp.
Leave **Manual rank** empty for newest-added-first ordering; ordinary edits
preserve the creation timestamp. Set a positive manual rank to pin an entry
ahead of automatic entries (1 first), or choose **Use automatic ordering** to
clear it. **Top Games** continues to use ascending **Order** instead. Older
documents without a creation timestamp keep their existing descending `order`
behind dated entries; historical creation dates are not guessed from Cosmos'
last-modified timestamp.

The API sorts each curated platform partition before pagination, including
legacy entries with missing fields. No database migration or new index is needed.

```
Browser ──/admin──► SWA (static)            build/admin/index.html  (this SPA)
        ──/.auth──► SWA auth (Entra ID)     role assigned by api/GetRoles.cs
        ──/api/content-admin/*──► Managed Functions api/AdminContent.cs ──► Cosmos DB
```

- API: `api/AdminContent.cs` (CRUD), `api/Services/CosmosAdminService.cs` (raw-JSON CRUD that
  preserves unknown fields), `api/Services/ContentValidator.cs` (server-side validation),
  `api/GetRoles.cs` (rolesSource), `api/ClientPrincipal.cs` (in-function role check).
- Specs: `specs/FEAT-016-web-admin-cosmos-crud.md`, `specs/API-001-admin-content-crud.md`,
  and `.github/repo-docs/adr/006-web-admin-cosmos-crud.md`.
