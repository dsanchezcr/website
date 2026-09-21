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
- Gaming data is stored in Azure Cosmos DB (`content-gaming` container, partition key: `/platform`)
- Required pattern: use `ApiGamingSection` in MDX pages to fetch and render sections from the content API
- Data entries use `type: "card"` or `type: "group"` (`games` array for groups)
- Apply the same API-driven rendering structure in all locales: `gaming/`, `i18n/es/.../gaming/`, and `i18n/pt/.../gaming/`
- User-facing text fields (`recommendation`, `description`) are localized objects: `{ en: "...", es: "...", pt: "..." }`
- Status token values are canonical and must not be translated: `completed`, `playing`, `backlog`, `dropped`

### Gaming Writing
- **Gaming Notes** (`gaming/gaming-notes/`): extended reviews, games of the year, and general gaming reflections
- **Game Development** (`gaming/game-development/`): development journals, tools, experiments, and games in progress
- These are static MDX subsections of the gaming docs, like Monthly Updates, not additional instances of the main blog. They do not publish separate blog feeds or archives, and do not require Cosmos DB entries.
- Add each entry as a separate `YYYY-MM-DD-short-title.mdx` file in the appropriate folder. Keep `index.mdx` as the section landing page.
- Include `title`, `description`, `sidebar_label`, and `sidebar_position` in frontmatter. Set an explicit `slug` of `/gaming-notes/<entry-slug>` or `/game-development/<entry-slug>` for a stable URL under `/gaming/`.
- Start entry ordering at `sidebar_position: 999` and decrease it for each newer entry, matching Monthly Updates. Keep the slug and position identical across translations.
- Include a localized publication date in the article body; these docs do not automatically display blog publication metadata.
- Add matching entries in both `i18n/es/docusaurus-plugin-content-docs-gaming/current/` and `i18n/pt/docusaurus-plugin-content-docs-gaming/current/`, preserving the section and filename. Translate the title, summary, sidebar label, and full article.
- Entries are discovered by the gaming sidebar and landing-page cards automatically. Until an entry is published, the landing page shows a localized empty state. Keep each section's `_category_.json` linked to its `index` document.
- Reuse the existing `Comments` and `YouTubeEmbed` components when appropriate. Do not add placeholder reviews or fictional project updates to populate an empty section.

### Movies & TV Content
- Data stored in Azure Cosmos DB (`content-movies` and `content-series` containers)
- Identity is `tmdbId` (positive integer) plus `mediaType` (`movie`/`tv`), or legacy manual IMDb `titleId`. Preserve old manual documents.
- TMDB sync stores localized `titleTranslations`, `overview`, `genresTranslations` in en/es/pt, poster path and community rating; public cards render stored metadata only.
- Include `myRating` (TMDB 0.5–10 half steps, null if unrated), trilingual `review`, and `category`; sync preserves existing reviews/unknown fields using ETags and never deletes or changes manual top lists.
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

## Backend (.NET 8 Azure Functions)

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
