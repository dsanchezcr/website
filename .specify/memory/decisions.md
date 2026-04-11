# Decisions Log

> Architectural and implementation decisions made during development. Each entry records what was decided, why, and when. For significant architectural changes, create a formal ADR in `.github/repo-docs/adr/`.

## Format

```
### [YYYY-MM-DD] Decision Title
**Context**: Why was this decision needed?
**Decision**: What was decided?
**Rationale**: Why this option over alternatives?
**Spec**: Link to spec if applicable
```

---

### [2026-03-31] Adopt Agentic Modernization
**Context**: Website should practice the agent-first patterns advocated in recent blog posts.
**Decision**: Implement 6-phase agentic modernization: repo foundation, agent team, testing, spec kit, CI/CD, showcase.
**Rationale**: Dogfooding builds credibility; the site becomes both better and a reference implementation.
**Spec**: See ADR `.github/repo-docs/adr/004-agentic-modernization.md`

### [2026-03-31] Repository Docs in .github/repo-docs/
**Context**: Needed a location for architecture docs, ADRs, and coding standards that doesn't interfere with Docusaurus content processing.
**Decision**: Place all repository documentation in `.github/repo-docs/` instead of root `docs/`.
**Rationale**: Docusaurus uses `disney/`, `gaming/`, `movies-tv/`, `universal/` as doc plugin paths. A root `docs/` folder could conflict. `.github/repo-docs/` is clearly separated.
**Spec**: See ADR `.github/repo-docs/adr/001-docusaurus-ssg.md`

### [2026-03-31] Vitest 3.x with esbuild for Frontend Tests
**Context**: Needed a test framework that handles Docusaurus's `.js` files containing JSX.
**Decision**: Use Vitest 3.x with Vite 6 and `esbuild.loader: 'jsx'` for `.js` files.
**Rationale**: Vite 8's oxc parser doesn't support JSX in `.js` files. Vitest 3.x/Vite 6 with esbuild handles this correctly. The React plugin alone was insufficient.
**Spec**: N/A (infrastructure)

### [2026-03-31] Lightweight Spec Kit Adoption
**Context**: Full Spec Kit CLI may not be publicly available yet.
**Decision**: Adopt spec-driven workflow with constitution, templates, and prompts. Defer CLI integration.
**Rationale**: The workflow patterns deliver value independently. Constitution + templates + prompts provide structure without external dependencies.
**Spec**: See ADR `.github/repo-docs/adr/004-agentic-modernization.md`

### [2026-04-10] UI/UX Design Overhaul — 5-Phase Implementation
**Context**: Design session feedback identified improvements across brand identity, layout, animations, content structure, and SEO.
**Decision**: Implemented in 5 phases: (1) Brand palette (teal) + typography (Plus Jakarta Sans) + micro-interactions, (2) Navigation dropdown + footer + mobile chatbot fix, (3) Typewriter effect + AOS scroll animations + page transitions, (4) ImageCompareSlider + CareerTimeline + chatbot contextual greetings, (5) JSON-LD structured data + GitHubStats + mobile UX fixes.
**Rationale**: Phased approach allowed incremental review and reduced risk. Each phase was independently buildable and testable.

### [2026-04-10] Projects Migrated from Page to Docs Plugin
**Context**: Projects page was a single monolithic MDX file with side-to-side table of contents, making it hard to navigate with growing project count.
**Decision**: Converted to a Docusaurus docs plugin (`projects/`) with individual pages per project and a "Previous Roles" subcategory. Full i18n coverage.
**Rationale**: Better SEO (individual URLs per project), sidebar navigation, scalable structure. Follows the pattern already used by Gaming and Movies sections.

### [2026-04-10] Shared Homepage Component Pattern
**Context**: Homepage code was duplicated across 3 locale files (en/es/pt) with identical layout logic.
**Decision**: Created `src/components/Homepage/` as a shared component. Locale pages only pass translated props (greeting, subtitle, tagline, features).
**Rationale**: Eliminates ~70 lines of duplication per locale. Style/layout changes propagate to all locales automatically.

### [2026-04-10] AOS for Scroll Animations
**Context**: Needed scroll-triggered animations for homepage and content sections.
**Decision**: Adopted AOS (Animate on Scroll) library via Docusaurus clientModules with debounced MutationObserver for SPA route refreshes.
**Rationale**: Lightweight (~6KB), declarative (`data-aos` attributes), works in MDX without React wrappers. Respects `prefers-reduced-motion`.
