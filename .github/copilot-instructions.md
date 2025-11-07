# Copilot Instructions for dsanchezcr.com

## Architecture Overview

This is a personal website/blog with a **dual-stack architecture**:
- **Frontend**: Docusaurus v3 static site (React/MDX) with i18n support (English, Spanish, Portuguese)
- **Backend**: .NET 9 Azure Functions API providing serverless endpoints

The frontend is hosted on **Azure Static Web Apps**, and the backend functions are deployed separately to **Azure Functions**. They communicate via REST APIs defined in `src/config/environment.js`.

## Key Components

### Frontend (Docusaurus)
- **Blog**: MDX files in `blog/` with frontmatter metadata
- **Static Pages**: React components in `src/pages/` (e.g., `contact.js`, `weather.js`, `exchangerates.js`)
- **Custom Components**: Reusable widgets in `src/components/` (Comments, NLWebChat, OnlineStatusWidget, WeatherWidget)
- **i18n**: Translations in `i18n/es/` and `i18n/pt/` directories following Docusaurus i18n structure
- **Custom Docs**: Two separate doc sections configured via plugins: `disney/` and `universal/` (theme parks content)

### Backend (Azure Functions - .NET 9)
Located in `api/` directory:
- **SendEmail.cs**: Contact form endpoint (`/api/contact`) with reCAPTCHA v3, rate limiting, spam detection, honeypot field, and email verification flow using Azure Communication Services
- **VerifyEmail.cs**: Email verification endpoint (`/api/verify`) that completes the contact form submission after user clicks verification link
- **GetWeather.cs**: Weather data endpoint
- **GetOnlineUsers.cs**: Analytics endpoint (Google Analytics integration)
- **ChatWithOpenAI.cs**: AI chat endpoint using Azure OpenAI
- **Program.cs**: Configures DI with HttpClient, MemoryCache, and Application Insights

## Development Workflows

### Frontend Development
```powershell
npm install          # Install dependencies
npm start            # Dev server at localhost:3000 (hot reload enabled)
npm run build        # Production build to build/
npm run serve        # Preview production build
```

### Backend Development (Azure Functions)
Use VS Code tasks in `.vscode/tasks.json`:
1. **Build**: Run task "build (functions)" - compiles to `api/bin/Debug/net9.0/`
2. **Start Function Host**: Run task "func: 4" - starts Functions runtime (depends on build task)
3. Local endpoint: `http://localhost:7071` (configured in `src/config/environment.js`)

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

### Multi-language Support
- Language detection: URL path prefix (`/es/`, `/pt/`, or default English)
- Contact form passes `language` parameter to API for localized emails
- Backend has inline localization dictionaries in `SendEmail.cs` (not using resource files)
- Content translations follow Docusaurus i18n structure

### Environment Configuration
`src/config/environment.js` provides runtime API endpoint detection:
- **Production**: `dsanchezcr.com` → `https://dsanchezcr.azurewebsites.net`
- **QA**: Other hostnames → `https://dsanchezcr-qa.azurewebsites.net`
- **Local**: `localhost` → `http://localhost:7071`

### CI/CD Separation
Two independent GitHub Actions workflows:
- **azure-static-web-app.yml**: Builds/deploys Docusaurus site (ignores `api/` changes)
- **api.yml**: Builds/deploys .NET Functions (only triggers on `api/` changes)
- Both use path filters to prevent unnecessary builds

## Dependencies & Integration Points

### External Services
- **Azure Communication Services**: Email sending (connection string in environment)
- **Azure OpenAI**: Chat functionality (endpoint + key required)
- **Google reCAPTCHA v3**: Site key `6LcGaAIsAAAAALzUAxzGFx5R1uJ2Wgxn4RmNsy2I` (client-side) + secret key (server-side)
- **Google Analytics**: Via `@docusaurus/plugin-google-gtag` (tracking ID: `G-18J431S7WG`)
- **Giscus**: GitHub-based comments via `@giscus/react`
- **Custom Package**: `@dsanchezcr/colonesexchangerate` (Costa Rican currency exchange rates)

### Required Environment Variables (Azure Functions)
```
AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING
RECAPTCHA_SECRET_KEY
WEBSITE_URL
AZURE_OPENAI_ENDPOINT (for ChatWithOpenAI)
AZURE_OPENAI_KEY
```

## Common Pitfalls

1. **Function build location**: Functions must be built before running. The host expects binaries in `api/bin/Debug/net9.0/`, not the source directory.
2. **CORS**: API endpoints are called from the Docusaurus site. Ensure Azure Function App has CORS configured for the website domains.
3. **Rate limiting is in-memory**: Restarting the function app clears rate limits. Not suitable for multi-instance deployments without external cache.
4. **Email verification tokens expire**: 24-hour TTL in MemoryCache. Expired tokens will fail verification.
5. **i18n content sync**: When adding blog posts or pages, remember to check if translations exist in `i18n/es/` and `i18n/pt/`.

## Adding New Features

### New Blog Post
Create `.mdx` file in `blog/` with naming convention: `YYYY-MM-DD-Title.mdx`. Frontmatter should include `title`, `description`, `tags`, and `authors` (defined in `blog/authors.yml`).

### New Azure Function
1. Create new `.cs` file in `api/`
2. Add `[Function("FunctionName")]` attribute to the method
3. Use `HttpTrigger` for HTTP endpoints
4. Register dependencies in `Program.cs` if needed
5. Build and test locally before deploying

### New React Component
Place in `src/components/ComponentName/` with index file. Import in pages using `@site/src/components/ComponentName`. Follow existing patterns (see `WeatherWidget/` or `OnlineStatusWidget/`).
