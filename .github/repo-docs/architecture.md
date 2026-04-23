# Architecture Overview

## System Design

dsanchezcr.com is a personal website/blog built with a **Docusaurus v3 static frontend** and a **.NET 9 Azure Functions API backend**, hosted together on **Azure Static Web Apps (SWA)** as a managed functions deployment.

```
┌──────────────────────────────────────────────────────────┐
│                 Azure Static Web Apps                     │
│                                                          │
│  ┌─────────────────────┐   ┌──────────────────────────┐  │
│  │  Docusaurus v3 SSG  │   │  .NET 9 Azure Functions  │  │
│  │  (React/MDX)        │   │  (Isolated Worker)       │  │
│  │                     │   │                          │  │
│  │  - Blog (MDX)       │   │  /api/contact            │  │
│  │  - Gaming (docs)    │   │  /api/verify             │  │
│  │  - Movies-TV (docs) │   │  /api/weather            │  │
│  │  - Disney (docs)    │   │  /api/online-users       │  │
│  │  - Universal (docs) │   │  /api/nlweb/ask (RAG)    │  │
│  │  - Pages (React)    │   │  /api/health             │  │
│  │  - i18n (en/es/pt)  │   │  /api/reindex            │  │
│  │                     │   │  /api/gaming/xbox         │  │
│  └─────────────────────┘   │  /api/gaming/playstation  │  │
│                            │  /api/gaming/refresh      │  │
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
                      │  - Application Insights         │
                      └─────────────────────────────────┘
         │                              │
         ▼                              ▼
  ┌──────────────┐    ┌─────────────────────────────────┐
  │  External     │    │  External APIs                  │
  │  - Giscus     │    │  - Google Analytics Data API    │
  │  - reCAPTCHA  │    │  - OpenXBL (Xbox Live)          │
  │  - Open-Meteo │    │  - PSN API (PlayStation)        │
  │  - IMDb       │    │  - GitHub API (Repos)           │
  │  - Chess.com  │    │                                 │
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
| GetOnlineUsers | `/api/online-users` | Google Analytics 24h visitor count |
| ChatWithOpenAI | `/api/nlweb/ask` | RAG chatbot (Microsoft Foundry + AI Search) |
| HealthCheck | `/api/health` | Service health monitoring |
| ReindexContent | `/api/reindex` | Search index update (CI/CD triggered) |
| GetXboxProfile | `/api/gaming/xbox` | Xbox Live profile with Table Storage cache |
| GetPlayStationProfile | `/api/gaming/playstation` | PSN profile with JWT auth and cache |
| RefreshGamingProfiles | `/api/gaming/refresh` | Admin trigger for gaming data refresh |
| GetMoviesContent | `/api/content/movies` | Movies from Cosmos DB |
| GetSeriesContent | `/api/content/series` | TV series from Cosmos DB |
| GetGamingContent | `/api/content/gaming` | Gaming entries from Cosmos DB |
| GetParksContent | `/api/content/parks` | Theme parks from Cosmos DB |
| GetMonthlyUpdatesContent | `/api/content/monthly-updates` | Monthly gaming updates from Cosmos DB |
| SubscribeNewsletter | `/api/newsletter/subscribe` | Newsletter subscription with double opt-in |
| VerifySubscription | `/api/newsletter/verify` | Confirm newsletter subscription |
| UnsubscribeNewsletter | `/api/newsletter/unsubscribe` | One-click unsubscribe |
| UpdatePreferences | `/api/newsletter/preferences` | Change frequency (weekly/monthly) |
| GetSubscriptionStatus | `/api/newsletter/status` | Check subscription state |
| DispatchNewsletter | `/api/newsletter/dispatch` | Send digest (GitHub Actions triggered) |

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
- **Movie/TV reviews**: Multilingual reviews embedded in JSON data (`src/data/movies.json`, `src/data/series.json`)

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
api/                    ← .NET 9 Azure Functions backend
infra/                  ← Bicep infrastructure templates
i18n/                   ← Translations (es, pt)
static/                 ← Static assets (images, robots.txt)
scripts/                ← Build/deployment scripts
specs/                  ← Feature and content specifications
.specify/               ← Spec Kit constitution and governance
```

> **Important**: Repository documentation lives in `.github/repo-docs/` to avoid any interference with Docusaurus content processing. Docusaurus uses `disney/`, `gaming/`, `movies-tv/`, `projects/`, and `universal/` as doc plugin paths — never place agent/repository docs in those directories or in a root `docs/` folder.
