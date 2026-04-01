# Copilot Instructions for dsanchezcr.com

## Architecture Overview

This is a personal website/blog with **Azure Static Web Apps managed API architecture**:
- **Frontend**: Docusaurus v3 static site (React/MDX) with i18n support (English, Spanish, Portuguese)
- **Backend**: .NET 9 Azure Functions API hosted as **SWA Managed Functions**

Both frontend and backend are hosted together on **Azure Static Web Apps**. The API is served from the same domain under the `/api` path prefix. Configuration is defined in `staticwebapp.config.json` and infrastructure is managed via Bicep templates in `infra/`.

## Key Components

### Frontend (Docusaurus)
- **Blog**: MDX files in `blog/` with frontmatter metadata
- **Static Pages**: React components in `src/pages/` (e.g., `contact.js`, `weather.js`, `exchangerates.js`, `volunteering.js`)
  - **Volunteering**: Displays volunteering experience with card-based layout, category badges, organization links, and pre-populated contact form for volunteer project inquiries
- **Custom Components**: Reusable widgets in `src/components/` (Comments, NLWebChat, OnlineStatusWidget, WeatherWidget)
- **i18n**: Translations in `i18n/es/` and `i18n/pt/` directories following Docusaurus i18n structure
- **Gaming**: Docs in `gaming/` with images in `static/img/gaming/<platform>/`; status labels are localized in `GameCard`/`GameCardGroup` (keep status values like `completed`, `playing`, `backlog`, `dropped`)
- **Custom Docs**: Four doc sections configured via plugins: `disney/`, `gaming/`, `movies-tv/`, and `universal/`

### Backend (Azure Functions - .NET 9 Isolated Worker)
Located in `api/` directory:
- **SendEmail.cs**: Contact form endpoint (`/api/contact`) with reCAPTCHA v3, rate limiting, spam detection, honeypot field, and email verification flow using Azure Communication Services
- **VerifyEmail.cs**: Email verification endpoint (`/api/verify`) that completes the contact form submission after user clicks verification link
- **GetWeather.cs**: Weather data endpoint (`/api/weather`)
- **GetOnlineUsers.cs**: Analytics endpoint (`/api/online-users`) with Google Analytics Data API (24-hour visitor count)
- **ChatWithOpenAI.cs**: AI chat endpoint (`/api/nlweb/ask`) using Microsoft Foundry with RAG from Azure AI Search
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
healthConfig: '/api/health/config'
xboxProfile: '/api/gaming/xbox'
playstationProfile: '/api/gaming/playstation'
gamingRefresh: '/api/gaming/refresh'  // POST, requires X-Gaming-Refresh-Key header
```

Additional API endpoints (not used by the public UI — backend/CI/admin only):
- `/api/reindex` — Called by GitHub Actions, requires `X-Reindex-Key` header
- `/api/gaming/refresh` — Admin-only manual trigger, requires `X-Gaming-Refresh-Key` header

### CI/CD (Unified Deployment)
Single GitHub Actions workflow deploys both frontend and managed API together:
- **azure-static-web-app.yml**: Builds Docusaurus site and .NET 9 API, deploys to SWA
- SWA handles deploying both app and API from the same repository

## Dependencies & Integration Points

### External Services
- **Azure Communication Services**: Email sending (connection string in environment)
- **Microsoft Foundry**: Chat functionality with RAG (endpoint + key + deployment required)
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

# Microsoft Foundry (Chat)
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

## Repository Documentation

Repository-level documentation (architecture, domain, coding standards, ADRs) lives in `.github/repo-docs/` — **NOT** in a root `docs/` folder. This separation prevents interference with Docusaurus content processing, which uses `disney/`, `gaming/`, `movies-tv/`, and `universal/` as doc plugin paths.

```
.github/repo-docs/
├── architecture.md        # System design overview
├── domain-overview.md     # Business context and content domains
├── coding-standards.md    # Conventions and patterns
└── adr/                   # Architecture Decision Records
    ├── 001-docusaurus-ssg.md
    ├── 002-azure-swa-managed-functions.md
    ├── 003-rag-chatbot.md
    └── 004-agentic-modernization.md
```

When making architectural decisions, create a new ADR in `.github/repo-docs/adr/` following the existing format (Status, Date, Context, Decision, Consequences).

## Specification-Driven Development

For non-trivial features, use specification templates from `specs/templates/` before implementation:

| Template | Use When |
|----------|----------|
| `feature-spec.md` | Adding a new feature or modifying existing functionality |
| `blog-post-spec.md` | Planning a new blog post |
| `api-endpoint-spec.md` | Creating a new Azure Functions endpoint |
| `gaming-content-spec.md` | Adding games, platforms, or gaming features |

### Workflow: Specify → Review → Implement → Verify

Use the prompts in `.github/prompts/` for each workflow step:

| Prompt | Purpose |
|--------|---------|
| `/specify` | Create a new specification from a template |
| `/review-spec` | Validate a spec against the constitution |
| `/implement-spec` | Build from an approved specification |
| `/verify-spec` | Confirm implementation meets acceptance criteria |
| `/write-blog` | End-to-end blog post creation (spec + content + translations + hero image) |

Create spec files in `specs/` (e.g., `specs/FEAT-001-new-widget.md`) based on the appropriate template. Specs must define acceptance criteria, i18n requirements, and affected files before implementation begins.

### Governance Files

| File | Purpose |
|------|---------|
| `.specify/memory/constitution.md` | Non-negotiable project principles (all agents must comply) |
| `.specify/memory/decisions.md` | Log of architectural and implementation decisions |
| `.github/instructions/spec-driven-development.instructions.md` | Enforces spec workflow on relevant files |

## Agent Team

This repository uses GitHub Copilot custom agents defined in `.github/agents/`. Each agent has a specialized role:

| Agent | Role | Primary Focus |
|-------|------|---------------|
| `blog-writer` | Draft blog posts from topic specs | Blog content, MDX, frontmatter, i18n |
| `blog-image` | Generate/source images for posts | Image assets, naming, formats |
| `documentation` | Keep repo docs synced with code | ADRs, architecture, copilot-instructions |
| `section-features` | Build features across content sections | Gaming, movies-tv, 3D printing, disney, universal |
| `best-practices` | Review and propose improvements | Dependencies, security, accessibility, performance |
| `testing-quality` | Write and maintain tests | Vitest, xUnit, Playwright, CI quality gates |
| `innovation` | Propose new features and ideas | Content gaps, trend analysis, spec proposals |
| `cicd-quality` | Improve CI/CD and deployment quality | Workflows, quality gates, validation |

Agents follow the specification-driven workflow and must respect the project constitution (`.specify/memory/constitution.md`).

## i18n Governance

### Mandatory i18n Coverage
All user-facing content **must** support English (default), Spanish, and Portuguese. This is enforced as follows:

**Blog posts**: Every new `.mdx` file in `blog/` must have corresponding translations in:
- `i18n/es/docusaurus-plugin-content-blog/<filename>.mdx`
- `i18n/pt/docusaurus-plugin-content-blog/<filename>.mdx`

**Gaming docs**: Every change in `gaming/<platform>/index.mdx` must be reflected in:
- `i18n/es/docusaurus-plugin-content-docs-gaming/current/<platform>/index.mdx`
- `i18n/pt/docusaurus-plugin-content-docs-gaming/current/<platform>/index.mdx`

**Movies & TV docs**: Changes in `movies-tv/` must be reflected in:
- `i18n/es/docusaurus-plugin-content-docs-movies-tv/current/`
- `i18n/pt/docusaurus-plugin-content-docs-movies-tv/current/`

**React pages with inline translations** (no i18n files needed — translations embedded in component):
- `3dprinting.js`, `volunteering.js`, `sponsors.js` — use inline translation objects
- `movies.js` — redirect only, no translation needed

**Pages with i18n files**: `about.mdx`, `contact.js`, `exchangerates.js`, `index.js`, `projects.mdx`, `weather.js` have translations in:
- `i18n/es/docusaurus-plugin-content-pages/`
- `i18n/pt/docusaurus-plugin-content-pages/`

**Movie/TV data**: Reviews in `src/data/movies.json` and `src/data/series.json` must include `review` objects with `en`, `es`, and `pt` keys.

### i18n Patterns
- **MDX content**: Place translated files in the appropriate `i18n/<locale>/docusaurus-plugin-content-*` directory
- **React pages with dynamic text**: Use the `Translate` component or `translate()` function from `@docusaurus/Translate`
- **React pages with static text blocks**: Use inline translation objects (`const translations = { en: {...}, es: {...}, pt: {...} }`)
- **Backend emails**: Use `LocalizationHelper.cs` for localized email templates
- **Game statuses**: Values (`completed`, `playing`, `backlog`, `dropped`) are localized in `GameCard` component code — do NOT translate the status values in MDX

## Adding New Features

### New Blog Post
1. Create spec using `specs/templates/blog-post-spec.md` (optional for simple posts)
2. Create `.mdx` file in `blog/` with naming convention: `YYYY-MM-DD-Title.mdx`
3. Frontmatter must include `title`, `description`, `tags`, and `authors` (defined in `blog/authors.yml`)
4. Create translations in `i18n/es/docusaurus-plugin-content-blog/` and `i18n/pt/docusaurus-plugin-content-blog/`
5. Add images to `static/img/blog/` if needed

### New Gaming Content
1. Add `GameCard` entry to `gaming/<platform>/index.mdx`
2. Add game image to `static/img/gaming/<platform>/<title-slug>.jpg`
3. Update translations in both `i18n/es/.../gaming/` and `i18n/pt/.../gaming/`
4. Use established status values: `completed`, `playing`, `backlog`, `dropped`

### New Movie/TV Entry
1. Add entry to `src/data/movies.json` or `src/data/series.json`
2. Include `titleId` (IMDb), `myRating` (1-10), `review` with `en`/`es`/`pt` keys, and `category`

### New Azure Function
1. Create spec using `specs/templates/api-endpoint-spec.md`
2. Create new `.cs` file in `api/`
3. Add `[Function("FunctionName")]` attribute to the method
4. Use `HttpTrigger` with explicit `Route` parameter for consistent naming
5. Register dependencies in `Program.cs` if needed
6. Build and test locally before deploying
7. Add route to `config.routes` in `src/config/environment.js`

### New React Component
Place in `src/components/ComponentName/` with index file. Import in pages using `@site/src/components/ComponentName`. Follow existing patterns (see `WeatherWidget/` or `OnlineStatusWidget/`).

### Infrastructure Changes
1. Update `infra/main.bicep` with new resources or settings
2. Run `az deployment group what-if` to preview changes
3. Deploy with `az deployment group create`
4. Create an ADR in `.github/repo-docs/adr/` for significant changes
