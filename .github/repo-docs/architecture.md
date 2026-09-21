# Architecture Overview

## System Design

dsanchezcr.com is a personal website/blog built with a **Docusaurus v3 static frontend** and a **.NET 8 Azure Functions API backend**, hosted together on **Azure Static Web Apps (SWA)** as a managed functions deployment.

```
┌──────────────────────────────────────────────────────────┐
│                 Azure Static Web Apps                     │
│                                                          │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │  Docusaurus v3 SSG  │   │  .NET 8 Azure Functions  │  │
│  │  (React/MDX)        │   │  (Isolated Worker)       │  │
│  │                     │   │                          │  │
│  │  - Blog (MDX)       │   │  /api/contact            │  │
│  │  - Gaming (docs)    │   │  /api/verify             │  │
│  │  - Movies-TV (docs) │   │  /api/weather            │  │
│  │  - Disney (docs)    │   │                          │  │
│  │  - Universal (docs) │   │  /api/nlweb/ask (RAG)    │  │
│  │  - Pages (React)    │   │  /api/health             │  │
│  │  - i18n (en/es/pt)  │   │  /api/gaming/*           │  │
│  │                     │   │  /api/content/*          │  │
│  └─────────────────────┘   │  /api/newsletter/*       │  │
│                            │  /api/reindex            │  │
│                            └──────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  ┌──────────────┐    ┌─────────────────────────────────┐
  │  Algolia      │    │  Azure Services                 │
  │  (Search UI)  │    │  - Communication Services       │
  │               │    │  - OpenAI (GPT + RAG)           │
  └──────────────┘    │  - Foundry (GPT + RAG + Images) │
                      │  - AI Search (Content Index)    │
                      │  - Table Storage (Tokens/Cache) │
                      │  - Cosmos DB (Content/Newsletter)│
                      │  - Application Insights         │
                      └─────────────────────────────────┘
         │                              │
         ▼                              ▼
  ┌──────────────┐    ┌─────────────────────────────────┐
  │  External     │    │  External APIs                  │
  │  - Giscus     │    │                                 │
  │  - reCAPTCHA  │    │  - OpenXBL (Xbox Live)          │
  │  - Open-Meteo │    │  - PSN API (PlayStation)        │
  │  - Poster URLs│    │  - GitHub API (Repos)           │
  │  - Chess.com  │    │  - OMDb (admin lookup)         │
  └──────────────┘    └─────────────────────────────────┘
```

## Content Architecture

### Frontend Content Sections

| Section | Source Path | Plugin Type | Route |
|---------|-----------|-------------|-------|
| Blog | `blog/` | preset-classic blog | `/blog` |
| Gaming | `gaming/` | plugin-content-docs | `/gaming` |
| Movies & TV | `movies-tv/` | plugin-content-docs | `/movies-tv` |
| Disney | `disney/` | plugin-content-docs | `/disney` |
| Universal | `universal/` | plugin-content-docs | `/universal` |
| Projects | `projects/` | plugin-content-docs | `/projects` |
| Pages | `src/pages/` | preset-classic pages | `/about`, `/contact`, etc. |

### Backend Services

| Function | Route | Purpose |
|----------|-------|---------|
| SendEmail | `/api/contact` | Contact form with reCAPTCHA, rate limiting, spam detection, email verification |
| VerifyEmail | `/api/verify` | Two-step email verification completion |
| GetWeather | `/api/weather` | Weather data proxy |
| ChatWithOpenAI | `/api/nlweb/ask` | RAG chatbot (Microsoft Foundry + AI Search) |
| HealthCheck | `/api/health` | Service health monitoring |
| ReindexContent | `/api/reindex` | Search index update (CI/CD triggered) |
| GetXboxProfile | `/api/gaming/xbox` | Xbox Live profile with Table Storage cache |
| GetPlayStationProfile | `/api/gaming/playstation` | PSN profile with JWT auth and cache |
| RefreshGamingProfiles | `/api/gaming/refresh` | Admin role or automation key; immediate provider refresh with safe cache retention |
| GetMoviesContent | `/api/content/movies` | Movies from Cosmos DB |
| GetSeriesContent | `/api/content/series` | TV series from Cosmos DB |
| GetOmdbMetadata | `GET /api/content-admin/omdb?imdbId=tt0111161` | SWA admin-only per-title metadata auto-fill; no automation key or persistence |
| GetGamingContent | `/api/content/gaming` | Gaming entries from Cosmos DB |
| GetParksContent | `/api/content/parks` | Theme parks from Cosmos DB |
| GetMonthlyUpdatesContent | `/api/content/monthly-updates` | Monthly gaming updates from Cosmos DB |
| SubscribeNewsletter | `/api/newsletter/subscribe` | Newsletter subscription with double opt-in |
| VerifySubscription | `/api/newsletter/verify` | Confirm newsletter subscription |
| UnsubscribeNewsletter | `/api/newsletter/unsubscribe` | Unsubscribe with confirmation |
| UpdatePreferences | `/api/newsletter/preferences` | Change frequency (weekly/monthly) |
| GetSubscriptionStatus | `/api/newsletter/status` | Check subscription state |
| DispatchNewsletter | `/api/newsletter/dispatch` | Send digest (GitHub Actions triggered) |

### Data Flow: OMDb media auto-fill (2026-09-16 replacement)

Admin `FormEditor` **Fetch Data** (`admin/src/api.ts`, validation/merge in
`admin/src/omdb.ts`) → same-origin
`GET /api/content-admin/omdb?imdbId=...` → SWA admin authorization plus in-function
role/input checks → fixed `https://www.omdbapi.com/` → normalized metadata → draft.
Only explicit **Save** uses existing raw-JSON/ETag-protected admin CRUD to write
Cosmos → public content API → `ApiMediaCardList` / `MediaCard`.

Lookup is independent of Cosmos. `OMDB_API_KEY` remains server-only; there is no
automation key, browser OMDb request, image proxy or binary image storage.
`OmdbLookupService` disables redirects, bounds the provider request/body read to
10 seconds and the response to 128 KiB; `GetOmdbMetadata` allows 20 valid
requests/admin/minute/instance. `OmdbSettings` reads the environment first, with
local-only API-project `.env` fallback through DotNetEnv; see [setup](tmdb-setup.md).
The admin's Vite/React/TypeScript editor fills title, first release year, plot,
director, media type, `imageUrl`, genres and IMDb rating. Missing/`N/A` metadata
does not clear existing draft fields. Curated reviews, personal ratings, category,
order, unknown fields and existing es/pt translations survive lookup.
Successful lookup sets `metadataSource: "omdb"` in the draft; only **Save**
persists it. Health reports OMDb key presence from the same `OmdbSettings` instance,
not a live provider/key/quota check.

`SyncTmdbContent`, `TmdbSyncService`, `TmdbSyncPanel`, `tmdb-sync.yml` and the
anonymous TMDB route exception are removed, not their stored documents. OMDb uses
the admin-only `/api/content-admin/*` route. Legacy TMDB metadata, posters/links,
community ratings, `TmdbAttribution` and `MediaOrdering` remain compatible:
non-top imports sort by stored snapshot then descending order, manual entries follow;
top-movies/top-series/top-tv retain manual ascending order. There is no replacement
account importer, scheduled job, automatic cleanup or database migration.
For saved `metadataSource: "omdb"` records, `MediaCard` selects IMDb links and
`imdbRating` without deleting TMDB fields. It prefers `imageUrl` over legacy
`posterPath`, and resolved localized `overview` over English `plot`.
Unmarked TMDB records retain their TMDB link/rating behavior.
Operators remove/revoke unused TMDB server/GitHub settings after rollout.
See [ADR-007](adr/007-tmdb-account-media-source.md), [setup](tmdb-setup.md),
and the replacement sections of FEAT-022/API-003.
PlayStation refresh resolves the numeric account ID from the authenticated
`users/me/trophySummary` response, not from access-token JWT claims. Its in-memory
access-token cache is tied to a fingerprint of the current `PSN_NPSSO_TOKEN`;
credential rotation invalidates reuse, and manual refresh always exchanges again.
Public refresh retries an HTTP 401 once with renewed credentials. Profile data is
saved only after all provider requests succeed, preserving the last working
profile on authentication, partial-response, or cancellation failures.

### Data Flow: TMDB media

TMDB account watchlists/ratings → authorized server sync → complete pagination
and per-batch localized metadata validation → ETag-protected Cosmos writes → public content
API → MediaCard (no browser metadata requests). The daily `tmdb-sync.yml` workflow
uses a dedicated invocation key; application read token/session/account settings
stay server-side. Top/manual documents and reviews survive; sync never deletes.
Current refresh snapshots and source order show newest account additions first.
Each request processes at most 20 documents in a 35-second budget; signed stateless
continuations share the snapshot and cumulative counters across requests. Source
changes require a safe restart; timeout/storage errors expose acknowledged progress
and a retry cursor. Nothing runs in the background after the response.
See [ADR-007](adr/007-tmdb-account-media-source.md) and [setup](tmdb-setup.md).

### Data Flow: RAG Pipeline

```
Push to main → GitHub Actions builds Docusaurus + .NET API
     │
     ├─→ Deploy to Azure Static Web Apps
     │
     └─→ scripts/extract-content.js extracts MDX content
              │
              └─→ POST /api/reindex (with X-Reindex-Key)
                       │
                       ├─→ Index extracted pages/blog to Azure AI Search
                       └─→ Fetch GitHub repos via API → index to Azure AI Search
```

### i18n Architecture

- **Locales**: English (default), Spanish, Portuguese
- **Detection**: URL path prefix (`/es/`, `/pt/`, or default English)
- **Content translation**: Docusaurus i18n structure under `i18n/es/` and `i18n/pt/`
- **Component translations**: Some pages embed translations inline (e.g., `3dprinting.js`, `volunteering.js`, `sponsors.js`)
- **Backend localization**: `LocalizationHelper.cs` for email templates
- **Movie/TV metadata and reviews**: Stored en/es/pt titles, overviews, genres and reviews remain in Cosmos DB (`content-movies`, `content-series`). OMDb supplies English title/plot fallback, not Spanish/Portuguese translations; preserve existing localized fields and curate translations separately
- **Admin UI**: English-only internal-tool exemption (ADR-006); public en/es/pt UI and legacy TMDB attribution remain localized

## Infrastructure

Managed via Bicep templates in `infra/`:
- Azure Static Web App (frontend + managed API)
- Application Insights + Log Analytics (telemetry)
- Secrets passed at deployment time via GitHub Actions

## Repository Structure Boundaries

```
.github/
├── repo-docs/          ← Repository documentation (agents, architecture — NOT served by Docusaurus)
├── agents/             ← Copilot agent definitions
├── copilot-instructions.md
├── workflows/          ← CI/CD pipelines
└── dependabot.yml

blog/                   ← Blog content (Docusaurus)
gaming/                 ← Gaming docs (Docusaurus plugin)
movies-tv/              ← Movies & TV docs (Docusaurus plugin)
disney/                 ← Disney docs (Docusaurus plugin)
universal/              ← Universal docs (Docusaurus plugin)
projects/               ← Projects docs (Docusaurus plugin)
src/                    ← React components, pages, hooks, data, CSS
api/                    ← .NET 8 Azure Functions backend
infra/                  ← Bicep infrastructure templates
i18n/                   ← Translations (es, pt)
static/                 ← Static assets (images, robots.txt)
scripts/                ← Build/deployment scripts
specs/                  ← Feature and content specifications
.specify/               ← Spec Kit constitution and governance
```

> **Important**: Repository documentation lives in `.github/repo-docs/` to avoid any interference with Docusaurus content processing. Docusaurus uses `disney/`, `gaming/`, `movies-tv/`, `projects/`, and `universal/` as doc plugin paths — never place agent/repository docs in those directories or in a root `docs/` folder.
