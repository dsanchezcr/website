# Coding Standards

## General Principles

- **Explicit over implicit**: No hidden dependencies, magical abstractions, or undocumented conventions
- **Descriptive naming**: Names should communicate intent — avoid abbreviations and single-letter variables
- **Consistent patterns**: Follow existing patterns in the codebase; do not introduce new paradigms without an ADR
- **i18n always**: All public user-facing text must support English, Spanish, and Portuguese; the internal admin UI is English-only (ADR-006)

## Frontend (Docusaurus / React / MDX)

### File Organization
- **Pages**: `src/pages/<pagename>.js` — React components for standalone pages
- **Components**: `src/components/<ComponentName>/index.js` — reusable widgets with their own directory
- **Hooks**: `src/hooks/<hookName>.js` — shared custom hooks, exported via `src/hooks/index.js`
- **Client Modules**: `src/clientModules/<module>.js` — global initializations (AOS animations, JSON-LD injection)
- **Data**: `src/data/<datafile>.json` — JSON data files driving dynamic content
- **Styles**: `src/css/custom.css` for global styles; component-specific styles via CSS modules (`<Component>.module.css`)
- **Images**: `static/img/<section>/<subsection>/` — organized by content section

### Component Conventions
- Import components using `@site/src/components/<ComponentName>`
- Use functional components with hooks (no class components)
- Use `useColorMode()` for theme-aware rendering
- Use `Translate` component or `translate()` function from `@docusaurus/Translate` for i18n
- Wrap external API calls in error boundaries

### Blog Posts (MDX)
- File naming: `YYYY-MM-DD-Title.mdx`
- Required frontmatter: `title`, `description`, `tags`, `authors`
- Authors defined in `blog/authors.yml`
- Images for blog posts go in `static/img/blog/` or inline
- Always create translations in `i18n/es/docusaurus-plugin-content-blog/` and `i18n/pt/docusaurus-plugin-content-blog/`

### Gaming Content
- Game status values: `completed`, `playing`, `backlog`, `dropped` (these are localized in component code)
- Platform constants defined in `src/components/Gaming/gameCardConstants.js`
- Game images: `static/img/gaming/<platform>/<title-slug>.jpg`
- Gaming data is stored in Azure Cosmos DB (`content-gaming` container, partition key: `/platform`)
- Required pattern: use `ApiGamingSection` in MDX pages to fetch and render sections from the content API
- Data entries use `type: "card"` or `type: "group"` (`games` array for groups)
- Apply the same API-driven rendering structure in all locales: `gaming/`, `i18n/es/.../gaming/`, and `i18n/pt/.../gaming/`
- User-facing text fields (`recommendation`, `description`) are localized objects: `{ en: "...", es: "...", pt: "..." }`
- Status token values are canonical and must not be translated: `completed`, `playing`, `backlog`, `dropped`

### Movies & TV Content
- Data stored in Azure Cosmos DB (`content-movies` and `content-series` containers)
- OMDb replacement (FEAT-022/API-003, 2026-09-16): validate trimmed IMDb `titleId` against `^tt[0-9]{6,12}$` for per-title lookup. Existing `tmdbId` plus `mediaType` (`movie`/`tv`) documents remain valid; never mass-convert records or remove compatibility metadata.
- **Fetch Data** fills only the movie/series draft's metadata: `title`, `year`, `plot`, `director`, `mediaType`, `imageUrl`, `genres`, `imdbRating`. Map provider `series` to stored `tv`; use the first year of a series range. Normalize optional `N/A`/missing values to null (genres to an empty array) and do not use absent values to clear existing fields.
- Preserve identity, `review`, `myRating`, `category`, `order`, unknown fields, legacy sync ownership/snapshots and existing es/pt translations. Apply English title/plot fallback rather than inventing translations; update existing `titleTranslations.en` / `overview.en` while retaining other locale values and `genresTranslations`.
- Lookup is stateless: no Cosmos write until explicit **Save** through existing raw-JSON CRUD with ETags. Store only the poster URL string in `imageUrl`; never download/store binary images. Image rendering still depends on the external host.
- Public cards render stored metadata only. Preserve legacy TMDB links/posters/community ratings, localized attribution and snapshot ordering. Personal TMDB ratings remain 0.5–10 half steps, null if unrated; review stays trilingual.
- During lookup, disable editing/saving, cancel on close and ignore stale responses; failures must leave the draft intact. Do not reintroduce the removed account-sync panel/client/workflow.
- Use `ApiMediaCardList` component in MDX pages to fetch and render from the content API
- Movie categories: `recently-watched`, `top-movies`, `watchlist`
- TV categories: `currently-watching`, `completed`, `watchlist`; `top-series`/`top-tv` remain manually ordered when present.

### i18n Patterns
For Docusaurus content (MDX docs/blog):
- Place translated files in `i18n/<locale>/docusaurus-plugin-content-<plugin>/`
- Blog translations: `i18n/<locale>/docusaurus-plugin-content-blog/<filename>.mdx`
- Gaming translations: `i18n/<locale>/docusaurus-plugin-content-docs-gaming/current/<path>.mdx`
- Page translations: `i18n/<locale>/docusaurus-plugin-content-pages/<filename>`

For React pages with inline translations:
- Use translation object pattern: `const translations = { en: {...}, es: {...}, pt: {...} }`
- Detect locale via `useDocusaurusContext()` and `i18n.currentLocale`

## Backend (.NET 9 Azure Functions)

### Function Conventions
- One function per `.cs` file in `api/` directory
- Use `[Function("FunctionName")]` attribute with descriptive names
- Use `HttpTrigger` with explicit `Route` parameter
- Register dependencies in `Program.cs`
- Add public UI routes to `src/config/environment.js` (`config.routes`); admin-only routes such as OMDb belong in `admin/src/api.ts`

### Security Patterns
- Validate all inputs at the function boundary
- Use constant-time comparison for secret key validation
- Rate limiting via `MemoryCache` (IP-based and resource-based)
- No CORS headers — Azure SWA handles CORS for managed functions
- Secrets via environment variables, never hardcoded
- OMDb lookup uses the SWA `admin` role and an independent in-function check, not an automation key. Validate before contacting the fixed HTTPS provider; disable redirects and bound rate, timeout and response size. Keep `OMDB_API_KEY` server-only, never `VITE_*` or browser OMDb calls.
- OMDb error responses must be safe and `no-store`: 400 invalid/unsupported input, 401 unauthenticated, 403 non-admin, 404 not found, 429 local/provider quota, 502 upstream/payload failure, 503 missing/rejected server key, 504 timeout. Never expose credentials, upstream URLs, raw provider errors/bodies or query strings in responses/logs. See [setup](tmdb-setup.md) for backend rollout details.

### Service Patterns
- Use constructor injection for services
- Services live in `api/Services/` directory
- Use `IHttpClientFactory` for external HTTP calls
- Use `IMemoryCache` for in-memory caching
- Use Azure Table Storage for persistent state

### Localization
- Use `LocalizationHelper.cs` for backend string localization
- Support `en`, `es`, `pt` language codes
- Accept `language` parameter from frontend requests

## Infrastructure (Bicep)

- Templates in `infra/` directory
- Use `main.parameters.json` for non-secret values
- Pass secrets via deployment-time parameters
- Always run `what-if` before deploying changes

## CI/CD (GitHub Actions)

- Single workflow deploys frontend + API together (`azure-static-web-app.yml`)
- CodeQL security scanning on push/PR
- Dependency review on PRs
- Search index reindexing after deployment (non-blocking with `continue-on-error: true`)
- Never bypass safety checks (`--no-verify`, `--force`)
