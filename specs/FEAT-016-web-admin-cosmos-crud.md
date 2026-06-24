# FEAT-016: Web-based Cosmos DB Admin (replace WPF desktop app)

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-016 |
| **Title** | Authenticated `/admin` web app for Cosmos DB content CRUD |
| **Author** | David Sanchez |
| **Date** | 2026-06-24 |
| **Status** | Approved |
| **Related ADR** | [ADR-006](../.github/repo-docs/adr/006-web-admin-cosmos-crud.md) |

## Problem Statement

Content (movies, series, gaming, parks, monthly-updates) lives in Azure Cosmos DB and is
currently managed with a Windows-only WPF desktop app (`cosmos-manager/`). The desktop app
only runs on Windows, requires a local install, and cannot be used from other devices. We
want a UI-friendly, cross-device way to perform CRUD on the same Cosmos data, secured with
Microsoft (Entra ID) sign-in, hosted on the existing Static Web App.

## Expected Behavior

- Navigating to `/admin` requires Microsoft Entra ID sign-in; only allow-listed accounts
  receive the `admin` role and may access the UI and the `/api/content-admin/*` endpoints.
- An authenticated admin can list, filter (by partition key), create, edit, and delete
  documents in the 5 content containers, from any device/browser.
- The editor surfaces typed fields per content type **and** a generic editor for any other
  JSON fields, preserving unknown fields on save (no data loss).
- The editor previews media: images, YouTube thumbnail/embed, IMDb link, and a map link.
- Writes are validated server-side (partition key present, localized-object shape, gaming
  status enum, numeric ranges) to avoid breaking production data.
- The WPF desktop app and its CI are removed.

## Constraints

- [x] Admin UI is an internal tool — **English only** (explicitly excluded from i18n governance).
- [x] Must reuse the existing Static Web App (Standard tier) and managed Functions API.
- [x] Must not require new Azure resources (reuse existing Cosmos key; no managed identity —
      SWA managed functions do not support it).
- [x] Must not weaken the existing global Content-Security-Policy.
- [x] Scope is the 5 content containers only — **no** newsletter management.

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `static/staticwebapp.config.json` | Modify | Add Entra `auth`, `rolesSource`, `/api/content-admin/*` role rule (admin). The `/admin` SPA self-gates via `/.auth/me` (no edge gate / no 401 redirect) |
| `api/GetRoles.cs` | Create | Roles function: map allow-listed email → `admin` role |
| `api/Services/CosmosAdminService.cs` | Create | Generic JSON CRUD over the 5 containers (preserves unknown fields) |
| `api/AdminContent.cs` | Create | `/api/content-admin/*` CRUD + sample + partitions endpoints (`admin` is a reserved Functions prefix) |
| `api/ClientPrincipal.cs` | Create | Parse `x-ms-client-principal`, enforce `admin` role |
| `api/Program.cs` | Modify | Register `CosmosAdminService` |
| `admin/**` | Create | Standalone Vite + React + TS SPA, built to `build/admin/` |
| `.github/workflows/azure-static-web-app.yml` | Modify | Build the admin SPA into `build/admin/` before deploy |
| `cosmos-manager/**`, `.github/workflows/cosmos-manager.yml`, `website.sln` | Delete | Remove desktop app + its CI |
| `src/config/environment.js` | Modify | Add `admin*` routes |

### API Contracts

```
GET    /api/content-admin/{type}                 -> 200 [ {doc}, ... ]            (type ∈ movies|series|gaming|parks|monthly-updates)
GET    /api/content-admin/{type}?pk={value}      -> 200 [ {doc}, ... ]            (filter by partition key)
GET    /api/content-admin/{type}/sample          -> 200 {doc}                    (schema introspection)
GET    /api/content-admin/{type}/partitions      -> 200 [ "value", ... ]         (distinct partition-key values)
GET    /api/content-admin/{type}/{id}?pk={value} -> 200 {doc} | 404
POST   /api/content-admin/{type}                 -> 201 {doc}                     (body = full JSON document)
PUT    /api/content-admin/{type}/{id}            -> 200 {doc}                     (body = full JSON document; If-Match optional)
DELETE /api/content-admin/{type}/{id}?pk={value} -> 204
All:   401 (unauthenticated) | 403 (not admin) | 400 (validation) | 409 (conflict) | 503 (Cosmos unconfigured)
```

### Component Design (SPA)

Standalone Vite/React/TS app, `base: '/admin/'`, HashRouter so SWA serves only
`/admin/index.html` + assets (avoids clashing with the Docusaurus `/404.html` fallback).
Views: auth gate (`/.auth/me`), container list/grid with partition filter, form editor
(typed + dynamic + raw-JSON tabs), media preview panel.

### Data Model

No new containers. Reuses `content-movies` (`/category`), `content-series` (`/category`),
`content-gaming` (`/platform`), `content-parks` (`/provider`),
`content-monthly-updates` (`/month`). See `api/Models/Content/ContentModels.cs`.

## Edge Cases

1. Unknown JSON fields must round-trip unchanged on save.
2. Changing a document's partition-key value (delete-and-recreate semantics handled client-side).
3. Gaming `title`/`description`/`recommendation` may be a string **or** localized object.
4. Concurrent edits from two devices → optimistic concurrency via ETag (`If-Match`), 409 on conflict.
5. Cosmos unconfigured locally → endpoints return 503; SPA shows a clear message.
6. Non-admin authenticated user → 403 from API and blocked route.

## i18n Requirements

- [x] **N/A** — admin is an internal English-only tool, explicitly excluded from i18n governance.

## Acceptance Criteria

- [ ] Anonymous request to `/admin` loads the SPA, which shows a Microsoft sign-in screen.
- [ ] Only allow-listed accounts get `admin`; others receive 403 from `/api/content-admin/*`.
- [ ] CRUD works for all 5 containers from a browser; unknown fields preserved.
- [ ] Media previews render (image/YouTube/IMDb/map) using existing CSP.
- [ ] Server rejects invalid documents with 400 before writing.
- [ ] `npm test` and `dotnet test` pass; no new lint errors.
- [ ] Desktop app and its workflow removed; site still builds and deploys.

## Security Considerations

- Entra single-tenant sign-in; `admin` role via allow-list roles function (`ADMIN_ALLOWED_EMAILS`).
- Defense in depth: SWA route rules **and** in-function `x-ms-client-principal` role check.
- Cosmos key stays server-side; content-type allow-list prevents touching other containers.
- Parameterized queries only; full server-side validation; admin mutations logged to App Insights.

## Out of Scope

- Newsletter subscriber management.
- Image upload pipeline (URLs are referenced, not uploaded).
- Managed-identity / keyless Cosmos access (not supported on SWA managed functions).
- Localization of the admin UI.
