# Copilot Instructions for dsanchezcr.com

## Architecture Overview

This is a personal website/blog with **Azure Static Web Apps managed API architecture**:
- **Frontend**: Docusaurus v3 static site (React/MDX) with i18n support (English, Spanish, Portuguese)
- **Backend**: .NET 9 Azure Functions API hosted as **SWA Managed Functions**

Both frontend and backend are hosted together on **Azure Static Web Apps**. The API is served from the same domain under the `/api` path prefix. Configuration is defined in `staticwebapp.config.json` and infrastructure is managed via Bicep templates in `infra/`.

## Key Components

### Frontend (Docusaurus)
- **Blog**: MDX files in `blog/` with frontmatter metadata
- **Static Pages**: React components in `src/pages/` (e.g., `contact.js`, `weather.js`, `exchangerates.js`)
- **Custom Components**: Reusable widgets in `src/components/` (Comments, NLWebChat, OnlineStatusWidget, WeatherWidget)
- **i18n**: Translations in `i18n/es/` and `i18n/pt/` directories following Docusaurus i18n structure
- **Custom Docs**: Two separate doc sections configured via plugins: `disney/` and `universal/` (theme parks content)

### Backend (Azure Functions - .NET 9 Isolated Worker)
Located in `api/` directory:
- **SendEmail.cs**: Contact form endpoint (`/api/contact`) with reCAPTCHA v3, rate limiting, spam detection, honeypot field, and email verification flow using Azure Communication Services
- **VerifyEmail.cs**: Email verification endpoint (`/api/verify`) that completes the contact form submission after user clicks verification link
- **GetWeather.cs**: Weather data endpoint (`/api/weather`)
- **GetOnlineUsers.cs**: Analytics endpoint (`/api/online-users`) with Google Analytics Data API (24-hour visitor count)
- **ChatWithOpenAI.cs**: AI chat endpoint (`/api/nlweb/ask`) using Azure OpenAI with RAG from Azure AI Search
- **HealthCheck.cs**: Health monitoring endpoint (`/api/health`) that validates all service configurations and connectivity
- **ReindexContent.cs**: Search index update endpoint (`/api/reindex`) with secret key authentication, hybrid content indexing
- **GetXboxProfile.cs**: Xbox profile endpoint (`/api/gaming/xbox`) using OpenXBL API with Table Storage caching
- **GetPlayStationProfile.cs**: PlayStation profile endpoint (`/api/gaming/playstation`) using PSN internal API with JWT auth and Table Storage caching
- **RefreshGamingProfiles.cs**: Admin endpoint (`/api/gaming/refresh`) to trigger gaming data refresh, protected with secret key
- **Program.cs**: Configures DI with HttpClient, MemoryCache, Application Insights, TokenStorageService, SearchService, and GamingCacheService
- **LocalizationHelper.cs**: Centralized localization for email templates
- **Services/TokenStorageService.cs**: Azure Table Storage integration for persistent email verification tokens
- **Services/SearchService.cs**: Azure AI Search integration for querying and indexing documents (RAG pattern)
- **Services/GamingCacheService.cs**: Dual-layer cache (memory + Table Storage) for gaming profiles with automatic fallback

### Infrastructure (Bicep)
Located in `infra/` directory:
- **main.bicep**: Azure Static Web App, Application Insights, Log Analytics
- **main.parameters.json**: Parameter values (secrets passed at deployment time)

## Development Workflows

### Frontend Development
```powershell
npm install          # Install dependencies
npm start            # Dev server at localhost:3000 (hot reload enabled)
npm run build        # Production build to build/
npm run serve        # Preview production build
```

### Backend Development (Azure Functions with SWA CLI)
**Option 1: Using SWA CLI (recommended for full integration)**
```powershell
npm install -g @azure/static-web-apps-cli  # Install SWA CLI
swa start                                    # Starts both frontend and API
# Frontend: http://localhost:4280
# API: Proxied at /api/* on same port
```

**Option 2: Direct Function Host**
Use VS Code tasks in `.vscode/tasks.json`:
1. **Build**: Run task "build (functions)" - compiles to `api/bin/Debug/net9.0/`
2. **Start Function Host**: Run task "func: 4" - starts Functions runtime (depends on build task)
3. Local endpoint: `http://localhost:7071`

**Important**: Always build the function before running the host. The function host runs from `api/bin/Debug/net9.0/`.

## Project-Specific Patterns

### Contact Form Architecture
The contact form uses a **two-step verification process**:
1. User submits form → backend validates (reCAPTCHA, rate limits, spam checks) → sends verification email with token
2. User clicks email link → `VerifyEmail.cs` validates token from cache → sends final emails (notification + confirmation)

This prevents spam and validates email addresses. Key security features:
- **Honeypot field** (`website`) - hidden field that bots fill
- **Rate limiting**: 3 submissions/IP/hour, 2 submissions/email/day (in-memory cache)
- **reCAPTCHA v3** with minimum score 0.5
- **Regex-based spam detection**: URL patterns, multiple emails, spam keywords, character repetition

### Search Indexing (RAG)
The site uses Azure AI Search for RAG (Retrieval-Augmented Generation) capabilities in the AI chatbot:

**Architecture:**
```
Push to main → Deploy to SWA → Extract MDX → POST /api/reindex → Azure AI Search
                                     ↓
                          Fetch GitHub repos (live API)
```

**Components:**
- **scripts/extract-content.js**: Node.js script that extracts content from MDX files at build time
- **ReindexContent.cs**: HTTP endpoint that receives extracted content and indexes it to Azure AI Search
- **SearchService.cs**: Queries the search index and injects relevant context into AI prompts

**Content Sources:**
| Source | Method | Trigger |
|--------|--------|---------|
| Pages (about, projects, etc.) | Extracted from MDX files | Each deployment |
| Blog posts | Extracted from MDX files | Each deployment |
| GitHub repos | Fetched from GitHub API | Each deployment |

**Automatic Updates:**
- Search index updates automatically after each deployment to main branch
- GitHub Actions extracts content, writes to temp file, calls `/api/reindex`
- The workflow step has `continue-on-error: true` so index failures don't block deployments

**Manual Trigger:**
- Run the workflow manually via `workflow_dispatch` to force reindex

**Security:**
- Endpoint requires `X-Reindex-Key` header matching `REINDEX_SECRET_KEY` environment variable
- Uses constant-time comparison to prevent timing attacks

### Health Check Endpoint
The `/api/health` endpoint provides comprehensive health monitoring:

**Response Structure:**
```json
{
  "overallStatus": "Healthy|Degraded|Unhealthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": [
    { "name": "Azure Communication Services", "status": "Healthy", "message": "..." },
    { "name": "Azure OpenAI", "status": "Healthy", "message": "..." },
    { "name": "Azure AI Search", "status": "Degraded", "message": "..." }
  ],
  "environmentVariables": { "AZURE_OPENAI_KEY": true, "...": false }
}
```

**HTTP Status Codes:**
- `200 OK`: All services healthy
- `207 Multi-Status`: Some services degraded (optional features missing)
- `503 Service Unavailable`: Critical services unhealthy

**Rate Limiting:** 10 requests/minute per IP to prevent abuse

### Token Storage
Email verification tokens can be persisted to Azure Table Storage for reliability:
- **Fallback**: Uses in-memory cache if `AZURE_STORAGE_CONNECTION_STRING` not configured
- **TTL**: Tokens expire after 24 hours
- **Table**: `EmailVerificationTokens` (created automatically)

### Multi-language Support
- Language detection: URL path prefix (`/es/`, `/pt/`, or default English)
- Contact form passes `language` parameter to API for localized emails
- Backend uses `LocalizationHelper.cs` for centralized localization strings
- Content translations follow Docusaurus i18n structure

### Environment Configuration
`src/config/environment.js` provides runtime API endpoint detection:
- **Production/Deployed**: Uses relative paths (empty string) - SWA serves API on same origin
- **SWA CLI (port 4280)**: Uses relative paths - SWA CLI proxies API calls
- **Local Development (port 3000)**: Uses `http://localhost:7071` for direct function host

API Routes (defined in `config.routes`):
```javascript
contact: '/api/contact'
verify: '/api/verify'
weather: '/api/weather'
onlineUsers: '/api/online-users'
chat: '/api/nlweb/ask'
health: '/api/health'
reindex: '/api/reindex'  // Called by GitHub Actions, requires X-Reindex-Key header
xboxProfile: '/api/gaming/xbox'
playstationProfile: '/api/gaming/playstation'
gamingRefresh: '/api/gaming/refresh'  // POST, requires X-Gaming-Refresh-Key header
```

### CI/CD (Unified Deployment)
Single GitHub Actions workflow deploys both frontend and managed API together:
- **azure-static-web-app.yml**: Builds Docusaurus site and .NET 9 API, deploys to SWA
- SWA handles deploying both app and API from the same repository

## Dependencies & Integration Points

### External Services
- **Azure Communication Services**: Email sending (connection string in environment)
- **Azure OpenAI**: Chat functionality with RAG (endpoint + key + deployment required)
- **Azure AI Search**: Content search for RAG pattern in chatbot (endpoint + API key + index name)
- **Azure Table Storage**: Persistent storage for email verification tokens (connection string)
- **Google reCAPTCHA v3**: Site key `6LcGaAIsAAAAALzUAxzGFx5R1uJ2Wgxn4RmNsy2I` (client-side) + secret key (server-side)
- **Google Analytics**: Via `@docusaurus/plugin-google-gtag` (tracking ID: `G-18J431S7WG`) and Data API for visitor count
- **Giscus**: GitHub-based comments via `@giscus/react`
- **Custom Package**: `@dsanchezcr/colonesexchangerate` (Costa Rican currency exchange rates)

### Required Environment Variables (SWA App Settings)
```
# Contact Form / Email
AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING
RECAPTCHA_SECRET_KEY
WEBSITE_URL
API_URL

# Azure OpenAI (Chat)
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT

# Azure AI Search (RAG - Optional)
AZURE_SEARCH_ENDPOINT
AZURE_SEARCH_API_KEY
AZURE_SEARCH_INDEX_NAME

# Azure Table Storage (Token Persistence - Optional)
AZURE_STORAGE_CONNECTION_STRING

# Search Index Update (Called by GitHub Actions)
REINDEX_SECRET_KEY

# Google Analytics
GOOGLE_ANALYTICS_PROPERTY_ID
GOOGLE_ANALYTICS_CREDENTIALS_JSON

# Gaming APIs
XBOX_API_KEY
XBOX_GAMERTAG_XUID
PSN_NPSSO_TOKEN
GAMING_REFRESH_KEY

# Telemetry
APPLICATIONINSIGHTS_CONNECTION_STRING
```

## Common Pitfalls

1. **Function build location**: Functions must be built before running. The host expects binaries in `api/bin/Debug/net9.0/`, not the source directory.
2. **CORS**: Azure Static Web Apps handles CORS automatically for managed functions - do not add CORS headers in function code.
3. **Rate limiting is in-memory**: Restarting the function app clears rate limits. Not suitable for multi-instance deployments without external cache.
4. **Email verification tokens expire**: 24-hour TTL in MemoryCache. Expired tokens will fail verification.
5. **i18n content sync**: When adding blog posts or pages, remember to check if translations exist in `i18n/es/` and `i18n/pt/`.
6. **SWA API runtime**: Managed functions use .NET 9 isolated worker. Ensure `api.csproj` targets `net9.0`.

## Adding New Features

### New Blog Post
Create `.mdx` file in `blog/` with naming convention: `YYYY-MM-DD-Title.mdx`. Frontmatter should include `title`, `description`, `tags`, and `authors` (defined in `blog/authors.yml`).

### New Azure Function
1. Create new `.cs` file in `api/`
2. Add `[Function("FunctionName")]` attribute to the method
3. Use `HttpTrigger` with explicit `Route` parameter for consistent naming
4. Register dependencies in `Program.cs` if needed
5. Build and test locally before deploying
6. Add route to `config.routes` in `src/config/environment.js`

### New React Component
Place in `src/components/ComponentName/` with index file. Import in pages using `@site/src/components/ComponentName`. Follow existing patterns (see `WeatherWidget/` or `OnlineStatusWidget/`).

### Infrastructure Changes
1. Update `infra/main.bicep` with new resources or settings
2. Run `az deployment group what-if` to preview changes
3. Deploy with `az deployment group create`
