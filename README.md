# David's Personal Website

This repository contains the source code for my personal website and blog, [dsanchezcr.com](https://dsanchezcr.com). The site is built using [Docusaurus](https://docusaurus.io/), a modern static website generator with a .NET 8 API backend.

[![Build and Deploy](https://github.com/dsanchezcr/website/actions/workflows/azure-static-web-app.yml/badge.svg)](https://github.com/dsanchezcr/website/actions/workflows/azure-static-web-app.yml)
[![CodeQL](https://github.com/dsanchezcr/website/actions/workflows/codeql.yml/badge.svg)](https://github.com/dsanchezcr/website/actions/workflows/codeql.yml)

## ✨ About This Repository

This website serves as a platform to share my thoughts on technology, software development, and other interests through blog posts. It also includes information about my projects, professional background, volunteering experience, and a gaming section showcasing my gaming profiles and curated game lists across Xbox, PlayStation, Nintendo Switch, Meta Quest, Phone/Mobile, and Board Games.

## 🏗️ Architecture

The site uses **Azure Static Web Apps** with a **managed API** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                  Azure Static Web Apps                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Docusaurus Site   │    │    .NET 8 Managed API       │ │
│  │   (React/MDX)       │    │    (Azure Functions)        │ │
│  │                     │    │                             │ │
│  │  • Blog posts       │    │  • /api/contact             │ │
│  │  • Static pages     │    │  • /api/verify              │ │
│  │  • i18n (en/es/pt)  │    │  • /api/weather             │ │
│  │  • Volunteering     │    │                             │ │
│  │  • Gaming           │    │  • /api/nlweb/ask           │ │
│  │    (multi-platform) │    │                             │ │
│  │                     │    │  • /api/health              │ │
│  │                     │    │  • /api/reindex             │ │
│  │                     │    │  • /api/gaming/xbox         │ │
│  │                     │    │  • /api/gaming/playstation  │ │
│  │                     │    │  • /api/gaming/refresh      │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Both frontend and backend are deployed together from a single repository, with the API served from the same domain under `/api`.

## 🚀 Tech Stack

### Frontend
- **[Docusaurus v3](https://docusaurus.io/)**: Static site generator
- **[React](https://reactjs.org/)**: UI components
- **[MDX](https://mdxjs.com/)**: Content authoring
- **Internationalization**: English, Spanish, Portuguese

### Backend (Managed API)
- **[.NET 8](https://dotnet.microsoft.com/)**: Runtime
- **[Azure Functions](https://azure.microsoft.com/services/functions/)**: Serverless compute (isolated worker model)
- **[Azure Communication Services](https://azure.microsoft.com/services/communication-services/)**: Email delivery
- **[Azure OpenAI](https://azure.microsoft.com/services/cognitive-services/openai-service/)**: AI chat assistant
- **[Azure AI Search](https://azure.microsoft.com/services/search/)**: RAG for contextual AI responses
- **[Azure Table Storage](https://azure.microsoft.com/services/storage/tables/)**: Token & gaming profile persistence
- **[OpenXBL API](https://xbl.io/)**: Xbox Live profile data
- **[PSN API](https://ca.account.sony.com/)**: PlayStation Network profile & trophy data

### Infrastructure
- **[Azure Static Web Apps](https://azure.microsoft.com/services/app-service/static/)**: Hosting
- **[Bicep](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)**: Infrastructure as Code
- **[Application Insights](https://azure.microsoft.com/services/monitor/)**: Monitoring

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) matching `package.json` engines: 22.22.2+, 24.15.0+, or 26+
- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local) v4
- [SWA CLI](https://azure.github.io/static-web-apps-cli/) (optional, for full local emulation)

### Installation

```sh
git clone https://github.com/dsanchezcr/website.git
cd website
npm install
dotnet restore api/api.csproj
```

### Running Locally

**Option 1: SWA CLI (Recommended)** - Full emulation with API integration
```sh
npm install -g @azure/static-web-apps-cli
swa start
```
Access at `http://localhost:4280` (API available at `/api/*`)

**Option 2: Frontend Only**
```sh
npm start
```
Access at `http://localhost:3000`

**Option 3: API Only**
```sh
cd api
dotnet build
func start --csharp
```
Access at `http://localhost:7071`

## 🛠️ Building

```sh
# Build frontend
npm run build

# Build API
cd api && dotnet build --configuration Release
```

Build artifacts:
- Frontend: `build/`
- API: `api/bin/Release/net8.0/`

## 🌍 Internationalization (i18n)

| Language | Path Prefix | Translation Directory |
|----------|-------------|----------------------|
| English | `/` (default) | - |
| Spanish | `/es/` | `i18n/es/` |
| Portuguese | `/pt/` | `i18n/pt/` |

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact` | POST | Submit contact form (initiates email verification) |
| `/api/verify` | GET | Complete email verification |
| `/api/weather` | GET | Weather data for predefined locations |
| `/api/nlweb/ask` | POST | AI chat assistant with RAG |
| `/api/health` | GET | Health check for all services |
| `/api/reindex` | POST | Update search index (called by GitHub Actions) |
| `/api/gaming/xbox` | GET | Xbox Live profile, gamerscore, and recent games |
| `/api/gaming/playstation` | GET | PSN profile, trophies, and recent games |
| `/api/gaming/refresh` | POST | Admin: trigger gaming data refresh |
| `/api/content-admin/tmdb/sync` | POST | Admin/automation: non-destructive TMDB movie/TV watchlist and ratings sync |

## ☁️ Deployment

### Automatic (GitHub Actions)

Push to `main` or create a PR to trigger automatic deployment via `azure-static-web-app.yml`.

### Manual (Bicep)

Deploy infrastructure using the Bicep templates in `infra/`:

```sh
az deployment group create \
  --resource-group <resource-group> \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters \
    azureCommunicationServicesConnectionString="<secret>" \
    recaptchaSecretKey="<secret>" \
    azureOpenAIEndpoint="<endpoint>" \
    azureOpenAIKey="<secret>"
```

See [infra/README.md](infra/README.md) for complete deployment instructions.

## TMDB Account Sync Configuration

The daily TMDB sync job (`.github/workflows/tmdb-sync.yml`) runs at **1:00 AM Eastern Time** and calls `/api/content-admin/tmdb/sync`. Add/watchlist and rate movies/TV on your TMDB account; the site renders localized metadata stored in Cosmos, not a browser metadata API.

Follow the [exact application token and account session setup](.github/repo-docs/tmdb-setup.md) before enabling sync. Preview with `{ "dryRun": true, "maxItems": 250 }`; use `dryRun: false` to persist. Manual/top entries and reviews are preserved, and sync never deletes removed/unrated titles.

Each API call processes at most 20 documents within a 35-second budget. Follow
`continuationToken` with unchanged options until `completed: true`; counters are
cumulative. The workflow follows these batches automatically. Start a new chain
without a token when switching from preview to persistence.

### GitHub configuration

Set the following in your repository (or Environment: `Production`):

**Secrets**
- `TMDB_SYNC_KEY`: Independent shared secret used in `X-Tmdb-Sync-Key`; no TMDB account credentials in GitHub.

**Variables**
- `WEBSITE_URL`: Public site URL (for example `https://dsanchezcr.com`).
- `TMDB_SYNC_MAX_ITEMS`: Per-feed safety ceiling (default `250`, max `1000`); oversized feeds fail rather than truncate.

### Azure Static Web Apps app settings

Set the following app settings in the SWA resource:

- `TMDB_SYNC_KEY`: Must exactly match the GitHub secret `TMDB_SYNC_KEY` (admin-role calls do not require this key).
- `TMDB_READ_ACCESS_TOKEN`: TMDB application API Read Access Token.
- `TMDB_SESSION_ID`: Authorized v3 session for your TMDB account.
- `TMDB_ACCOUNT_ID`: Numeric account ID verified with that token/session.

All source settings are server-only; the request cannot override credentials, account or URLs. Existing Cosmos settings are required. See [API-003](specs/API-003-tmdb-sync.md) for counts, warnings, failure codes and safe retry behavior.

## 📁 Project Structure

```
├── api/                    # .NET 8 Azure Functions API
│   ├── SendEmail.cs        # Contact form endpoint
│   ├── VerifyEmail.cs      # Email verification
│   ├── GetWeather.cs       # Weather data
│   ├── ChatWithOpenAI.cs   # AI chat with RAG
│   ├── HealthCheck.cs      # Health monitoring
│   ├── ReindexContent.cs   # Search index updates
│   ├── SyncTmdbContent.cs  # TMDB account sync with stored localized metadata
│   ├── GetXboxProfile.cs   # Xbox Live profile data
│   ├── GetPlayStationProfile.cs # PSN profile & trophies
│   ├── RefreshGamingProfiles.cs # Admin refresh endpoint
│   └── Services/           # TokenStorage, Search, GamingCache
├── blog/                   # Blog posts (MDX)
├── gaming/                 # Gaming docs section
│   ├── xbox/               # Xbox & PC games
│   ├── playstation/        # PlayStation games
│   ├── nintendo-switch/    # Nintendo Switch games
│   ├── meta-quest/         # Meta Quest games
│   ├── phone-mobile/       # Phone & mobile games
│   ├── board-games/        # Board games
│   └── chess/              # Chess profile
├── src/
│   ├── components/         # React components
│   │   └── Gaming/         # Gaming widgets and renderers
│   ├── data/
│   │   └── gaming/         # Per-platform gaming JSON data files
│   ├── pages/              # Static pages
│   └── config/             # Environment configuration
├── i18n/                   # Translations (es/, pt/)
├── infra/                  # Bicep templates
├── static/                 # Static assets + SWA config
└── .github/workflows/      # CI/CD pipelines
```

## 🎮 Gaming Section

The website includes a gaming section at `/gaming` with live profile integrations and data-driven catalogs.

| Platform | Features | Data Source |
|----------|----------|-------------|
| **Xbox & PC** | Live profile (gamertag, gamerscore), recently played games | [OpenXBL API](https://xbl.io/) |
| **PlayStation** | Trophy summary, recently played games, PSN profile | [PSN Internal API](https://ca.account.sony.com/) |
| **Nintendo Switch** | Curated entries rendered from platform JSON | User-curated content |
| **Meta Quest** | Curated VR/MR entries rendered from platform JSON | User-curated content |
| **Phone/Mobile** | Curated mobile entries rendered from platform JSON | User-curated content |
| **Board Games** | Curated tabletop entries rendered from platform JSON | User-curated content |
| **Chess** | Live profile widget | Chess.com profile data |

**Key features:**
- Live profile data fetched from gaming APIs
- Dual-layer caching (in-memory + Azure Table Storage) for resilience
- Automatic fallback to cached data when APIs are unavailable
- Clickable game cards linking to Xbox/PlayStation store pages
- Per-platform JSON data files in `src/data/gaming/*.json`
- `GamingEntriesRenderer` + `GameCard`/`GameCardGroup` components for consistent rendering
- Gaming docs in English, Spanish, and Portuguese all use the same JSON-driven platform data model
- Full i18n support (English, Spanish, Portuguese)

**Required environment variables for gaming APIs:**
```
XBOX_API_KEY                # API key from https://xbl.io
XBOX_GAMERTAG_XUID          # Numeric Xbox User ID (XUID)
PSN_NPSSO_TOKEN             # NPSSO token from https://ca.account.sony.com/api/v1/ssocookie
GAMING_REFRESH_KEY          # Optional automation key; admin UI uses its signed-in role
```

**Rotating the PSN NPSSO token (expires every ~60 days):**

The PlayStation NPSSO token expires roughly every 60 days. When it does, the live PSN
fetch fails and `/api/gaming/playstation` falls back to the last cached copy, returning
`"isCached": true`. The daily **Refresh Gaming Profiles** workflow fails when it detects
stale cache, which is the signal to rotate:

1. Sign in at [playstation.com](https://www.playstation.com) in a browser.
2. Visit `https://ca.account.sony.com/api/v1/ssocookie` and copy the `npsso` value.
3. Update the `PSN_NPSSO_TOKEN` application setting on the Static Web App.
4. Open **Admin > Gaming > Refresh PlayStation** (or Xbox/both). The signed-in admin
   role authorizes the request. Automation can also call `POST /api/gaming/refresh`
   with `X-Gaming-Refresh-Key: <GAMING_REFRESH_KEY>`. Refresh fetches immediately;
   failures are reported per provider and keep the last working cached profile.
5. Confirm the admin reports the connection as refreshed, or re-run the *Refresh Gaming Profiles* workflow and confirm the public response reports `"isCached": false`.
6. Curated game cards now sort newest-added first automatically. Use the optional
   **Manual rank** to pin entries, or clear it to restore automatic ordering.
   Top Games retains ascending **Order**. See [admin ordering details](admin/README.md#gaming-connections-and-ordering).

`/api/health` also reports the cache age per platform and degrades when data is older
than 3 days.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/dsanchezcr/website/issues).

## 📝 License

This project is private and the code is proprietary. However, the blog content, unless otherwise stated, is open for sharing and referencing with appropriate attribution.

---

Thank you for visiting my repository!