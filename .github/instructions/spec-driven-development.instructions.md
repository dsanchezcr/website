---
description: "Enforces specification-driven development. Triggers when creating new features, API endpoints, or content sections. Use when: adding features, creating endpoints, modifying architecture."
applyTo: "specs/**,api/*.cs,src/pages/**,src/components/**,gaming/**,movies-tv/**"
---

## Specification-Driven Development

Before implementing non-trivial changes, check if a specification exists in `specs/`.

### When a spec IS required (create one first):
- New API endpoints in `api/`
- New React pages in `src/pages/`
- New components in `src/components/`
- New gaming platforms or structural changes in `gaming/`
- New content sections
- Changes affecting multiple files
- Architecture changes (create an ADR in `.github/repo-docs/adr/`)

### When a spec is NOT required:
- Bug fixes with clear scope
- Adding a single game or movie entry
- Updating dependencies
- Documentation-only changes
- Single-file content updates

### Workflow: Specify → Review → Implement → Verify
1. Use `/specify` prompt to create a spec
2. Use `/review-spec` prompt to validate it
3. Use `/implement-spec` prompt to build it
4. Use `/verify-spec` prompt to confirm completion

### Constitution compliance
All specs must comply with `.specify/memory/constitution.md`. Key checks:
- i18n: All 3 locales covered (en/es/pt)
- Security: Input validation, rate limiting where applicable
- Testing: Acceptance criteria must be testable
- Architecture: Stays within established boundaries
