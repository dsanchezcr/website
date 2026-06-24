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

- Node.js 22+
- .NET 9 SDK
- [Azure Static Web Apps CLI](https://github.com/Azure/static-web-apps-cli): `npm i -g @azure/static-web-apps-cli`
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) (for the API)

## Local development & testing

The admin needs three things running together: the static SPA, the .NET API (managed
functions), and the SWA **auth emulator**. The reliable way to get all three is the SWA CLI
serving the built output.

### Full local test (auth + CRUD)

> **Node version matters.** The SWA CLI 2.0.9 (latest) crashes on **Node 22/24** on Windows
> with a libuv assertion (`!(handle->flags & UV_HANDLE_CLOSING) ... async.c`). Run the **emulator**
> on **Node 20 LTS**. (Your Docusaurus/admin builds and the .NET API are unaffected — only the SWA
> CLI process needs Node 20.) One-time setup:
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

# Terminal 1: start the API (Functions host) from the api/ directory
cd api ; func start           # http://localhost:7071

# Terminal 2: serve the built site + API + auth emulator with the SWA CLI on Node 20.
# This helper resolves the Node 20 binary (from nvm) and the SWA CLI entry point, sets the
# dummy auth env vars, and launches the emulator — no elevated `nvm use` required.
./scripts/start-swa-admin.ps1
```

The helper sets `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` to dummy values automatically. The
custom Entra provider in `staticwebapp.config.json` only requires these to *exist* locally — no
real Entra call is made; the CLI still shows its mock login form.

Open <http://localhost:4280/admin>. The SPA loads and shows its **Sign in** screen; clicking it
opens the SWA CLI's **mock login** — set **Roles** to `admin` and submit. The emulator injects an
`x-ms-client-principal` with that role, so the SPA shows the app and the `/api/content-admin/*`
endpoints authorize you. (The static `/admin` page is intentionally *not* edge-gated — it gates
itself via `/.auth/me`, so the SWA CLI never has to serve a `401`→login redirect, which previously
crashed the Windows emulator.)

> The `<AAD_TENANT_ID>` placeholder in `static/staticwebapp.config.json` does **not** matter
> locally — the SWA CLI mocks sign-in and never contacts Entra ID.

### Fast UI iteration (SPA only)

```powershell
npm --prefix admin run dev    # http://localhost:5173, proxies /api -> :7071
```

Use this for styling/markup only. The auth emulator isn't in front, so `/.auth/me` returns
nothing and you'll see the sign-in screen — exercise auth and CRUD with the full flow above.

### Type-check

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
3. In `static/staticwebapp.config.json`, replace `<AAD_TENANT_ID>` with your tenant ID.

## How it fits together

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
