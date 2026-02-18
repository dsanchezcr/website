# David's Personal Website

This repository contains the source code for my personal website and blog, [dsanchezcr.com](https://dsanchezcr.com). The site is built using [Docusaurus](https://docusaurus.io/), a modern static website generator with a .NET 9 API backend.

[![Build and Deploy](https://github.com/dsanchezcr/website/actions/workflows/azure-static-web-app.yml/badge.svg)](https://github.com/dsanchezcr/website/actions/workflows/azure-static-web-app.yml)
[![CodeQL](https://github.com/dsanchezcr/website/actions/workflows/codeql.yml/badge.svg)](https://github.com/dsanchezcr/website/actions/workflows/codeql.yml)

## ✨ About This Repository

This website serves as a platform to share my thoughts on technology, software development, and other interests through blog posts. It also includes information about my projects, professional background, and a video games section showcasing my gaming profiles across Xbox, PlayStation, Nintendo Switch, and Meta Quest.

## 🏗️ Architecture

The site uses **Azure Static Web Apps** with a **managed API** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                  Azure Static Web Apps                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   Docusaurus Site   │    │    .NET 9 Managed API       │ │
│  │   (React/MDX)       │    │    (Azure Functions)        │ │
│  │                     │    │                             │ │
│  │  • Blog posts       │    │  • /api/contact             │ │
│  │  • Static pages     │    │  • /api/verify              │ │
│  │  • i18n (en/es/pt)  │    │  • /api/weather             │ │
│  │  • Video Games      │    │  • /api/online-users        │ │
│  │    (Xbox/PSN/NSW/   │    │  • /api/nlweb/ask           │ │
│  │     Meta Quest)     │    │                             │ │
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
- **[.NET 9](https://dotnet.microsoft.com/)**: Runtime
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

- [Node.js](https://nodejs.org/) v22 or later
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
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
- API: `api/bin/Release/net9.0/`

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
| `/api/online-users` | GET | Visitor analytics (24-hour count) |
| `/api/nlweb/ask` | POST | AI chat assistant with RAG |
| `/api/health` | GET | Health check for all services |
| `/api/reindex` | POST | Update search index (called by GitHub Actions) |
| `/api/gaming/xbox` | GET | Xbox Live profile, gamerscore, and recent games |
| `/api/gaming/playstation` | GET | PSN profile, trophies, and recent games |
| `/api/gaming/refresh` | POST | Admin: trigger gaming data refresh |

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

## 📁 Project Structure

```
├── api/                    # .NET 9 Azure Functions API
│   ├── SendEmail.cs        # Contact form endpoint
│   ├── VerifyEmail.cs      # Email verification
│   ├── GetWeather.cs       # Weather data
│   ├── GetOnlineUsers.cs   # Analytics
│   ├── ChatWithOpenAI.cs   # AI chat with RAG
│   ├── HealthCheck.cs      # Health monitoring
│   ├── ReindexContent.cs   # Search index updates
│   ├── GetXboxProfile.cs   # Xbox Live profile data
│   ├── GetPlayStationProfile.cs # PSN profile & trophies
│   ├── RefreshGamingProfiles.cs # Admin refresh endpoint
│   └── Services/           # TokenStorage, Search, GamingCache
├── blog/                   # Blog posts (MDX)
├── videogames/             # Video Games docs section
│   ├── xbox/               # Xbox & PC games
│   ├── playstation/        # PlayStation games
│   ├── nintendo-switch/    # Nintendo Switch games
│   └── meta-quest/         # Meta Quest games
├── src/
│   ├── components/         # React components
│   │   └── VideoGames/     # Gaming widgets (XboxProfile, PSNProfile, GameCard)
│   ├── pages/              # Static pages
│   └── config/             # Environment configuration
├── i18n/                   # Translations (es/, pt/)
├── infra/                  # Bicep templates
├── static/                 # Static assets + SWA config
└── .github/workflows/      # CI/CD pipelines
```

## 🎮 Video Games Section

The website includes a video games section at `/videogames` showcasing gaming profiles across three platforms:

| Platform | Features | Data Source |
|----------|----------|-------------|
| **Xbox & PC** | Live profile (gamertag, gamerscore), recently played games | [OpenXBL API](https://xbl.io/) |
| **PlayStation** | Trophy summary, recently played games, PSN profile | [PSN Internal API](https://ca.account.sony.com/) |
| **Nintendo Switch** | Manual game cards with status updates | User-curated content |
| **Meta Quest** | Manual VR/MR game lists | User-curated content |

**Key features:**
- Live profile data fetched from gaming APIs
- Dual-layer caching (in-memory + Azure Table Storage) for resilience
- Automatic fallback to cached data when APIs are unavailable
- Clickable game cards linking to Xbox/PlayStation store pages
- Custom `GameCard` component for manual game entries with status updates
- Full i18n support (English, Spanish, Portuguese)

**Required environment variables for gaming APIs:**
```
XBOX_API_KEY                # API key from https://xbl.io
XBOX_GAMERTAG_XUID          # Numeric Xbox User ID (XUID)
PSN_NPSSO_TOKEN             # NPSSO token from https://ca.account.sony.com/api/v1/ssocookie
GAMING_REFRESH_KEY          # Secret key for admin refresh endpoint
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/dsanchezcr/website/issues).

## 📝 License

This project is private and the code is proprietary. However, the blog content, unless otherwise stated, is open for sharing and referencing with appropriate attribution.

---

Thank you for visiting my repository!