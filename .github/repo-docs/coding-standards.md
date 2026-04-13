# Coding Standards

## General Principles

- **Explicit over implicit**: No hidden dependencies, magical abstractions, or undocumented conventions
- **Descriptive naming**: Names should communicate intent — avoid abbreviations and single-letter variables
- **Consistent patterns**: Follow existing patterns in the codebase; do not introduce new paradigms without an ADR
- **i18n always**: All user-facing text must support English, Spanish, and Portuguese

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
- Gaming data is stored per platform in `src/data/gaming/<platform>.json`
- Use `GamingEntriesRenderer` in MDX pages to render JSON sections
- JSON entries must use `type: "card"` or `type: "group"` (`games` array for groups)

### Movies & TV Content
- Data-driven via `src/data/movies.json` and `src/data/series.json`
- Each entry requires: `titleId` (IMDb), `myRating` (1-10), `review` object (`en`, `es`, `pt`), `category`
- Use `MediaCard` component for rendering
- Movie categories: `recently-watched`, `top-movies`, `watchlist`
- TV categories: `currently-watching`, `completed`, `watchlist`

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
- Add new routes to `src/config/environment.js` (`config.routes`)

### Security Patterns
- Validate all inputs at the function boundary
- Use constant-time comparison for secret key validation
- Rate limiting via `MemoryCache` (IP-based and resource-based)
- No CORS headers — Azure SWA handles CORS for managed functions
- Secrets via environment variables, never hardcoded

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
