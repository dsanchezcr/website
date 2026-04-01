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
