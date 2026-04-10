# Project Constitution — dsanchezcr.com

> This document defines the non-negotiable principles, constraints, and standards for all work on this repository — whether performed by humans or AI agents. Every specification, implementation, and review must comply with these rules.

## Core Principles

1. **User-first**: Every change must benefit the end user — readers, visitors, or collaborators
2. **Static-first**: Pre-render content at build time; use API calls only for dynamic data (weather, gaming profiles, chat, analytics)
3. **Explicit over implicit**: No hidden dependencies, magical abstractions, or undocumented conventions
4. **Specification before implementation**: Non-trivial features must have a spec before code

## Technology Constraints

| Layer | Technology | Version | Non-Negotiable |
|-------|-----------|---------|----------------|
| Frontend SSG | Docusaurus | v3.x | Must remain SSG (no SSR) |
| Frontend Language | React/JSX/MDX | Latest | Functional components, hooks only |
| Backend Runtime | .NET Isolated Worker | 9.0 | Azure Functions programming model |
| Hosting | Azure Static Web Apps | Managed Functions | Single deployment unit |
| Infrastructure | Bicep | Latest | No Terraform, no ARM templates |
| Testing (Frontend) | Vitest | 3.x | Behavior-focused, deterministic |
| Testing (Backend) | xUnit | Latest | .NET test runner |
| Testing (E2E) | Playwright | Latest | Chromium, smoke tests |
| CI/CD | GitHub Actions | Latest | Single workflow for deploy |

## i18n Requirements

- **Mandatory locales**: English (default), Spanish, Portuguese
- **Coverage rule**: ALL user-facing content must support all 3 locales
- **Blog posts**: Translations required in `i18n/es/` and `i18n/pt/` before merging
- **Data files**: `movies.json` and `series.json` reviews must include `en`, `es`, `pt` keys
- **Component text**: Use `Translate` component, `translate()`, or inline translation objects
- **Game statuses**: Values (`completed`, `playing`, `backlog`, `dropped`) are code-level constants — never translate the values themselves

## Security Requirements

- Input validation at every API boundary
- reCAPTCHA v3 on all public form submissions
- Rate limiting on all public API endpoints
- Honeypot fields on forms
- No secrets in code — environment variables only
- Constant-time comparison for secret key validation
- No CORS headers in function code (SWA manages CORS)

## Quality Standards

- **Testing**: Behavior-focused tests, not implementation-focused
- **Tests must be deterministic**: No flaky tests, no timing dependencies
- **Accessibility**: Alt text on images, semantic HTML, keyboard navigation
- **Performance**: Lighthouse scores should not regress significantly

## Dependency Management

> **Principle: Always use the latest stable versions. Adapt the code to the packages, never pin old packages to avoid code changes.**

- **npm**: All packages in `dependencies` and `devDependencies` must use the latest stable versions. Run `npx npm-check-updates -u` and `npm audit` before merging dependency PRs.
- **NuGet**: All packages in `api.csproj` and `api.tests.csproj` must use the latest stable versions. Run `dotnet list package --outdated` before merging.
- **When upgrading causes breaking changes**: Adapt the codebase (update API calls, fix type changes, adjust configuration) rather than downgrading or pinning old versions.
- **Incompatible transitive dependencies**: If two packages conflict (e.g., AI SDK major version mismatch), remove the less critical package and replicate its functionality in code. Never keep incompatible packages together.
- **Security vulnerabilities**: Fix immediately by updating the vulnerable package or its override. Use `npm audit` and `dotnet list package --vulnerable`.
- **Overrides/resolutions**: Only use npm `overrides` to fix transitive dependency vulnerabilities. Use `^x.y.z` syntax (not `>=`) for deterministic installs.
- **Pre-release packages**: Only acceptable when no stable version exists (e.g., `Google.Analytics.Data.V1Beta`).

## Content Standards

- **Blog frontmatter**: Must include `title`, `description`, `tags`, `authors`
- **Images**: Organized by section in `static/img/<section>/`, reasonable file sizes (< 500KB)
- **Game images**: `static/img/gaming/<platform>/<title-slug>.jpg`
- **Movie/TV entries**: Must include `titleId` (IMDb), `myRating` (1-10), trilingual `review`, `category`

## Architectural Boundaries

- Repository documentation lives in `.github/repo-docs/` — never in a root `docs/` folder
- Docusaurus content paths are reserved: `disney/`, `gaming/`, `movies-tv/`, `universal/`
- Agent definitions live in `.github/agents/`
- Specification files go in `specs/`
- The constitution lives here: `.specify/memory/constitution.md`

## Agent Governance

- Agents must follow the specification-driven workflow: Specify → Review → Implement → Verify
- Agent-generated code receives the same review rigor as human-authored code
- Agents must not bypass CI checks or safety mechanisms
- Agents must maintain i18n consistency — never create English-only content
- Agents should create ADRs for significant architectural decisions
