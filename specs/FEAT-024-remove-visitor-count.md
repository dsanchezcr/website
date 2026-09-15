# Feature Specification: Remove the Visitor Count

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-024 |
| **Title** | Remove the last-24-hours visitor count |
| **Author** | GitHub Copilot |
| **Date** | 2026-09-15 |
| **Status** | Implemented |
| **Related ADR** | N/A — removal within the existing architecture |

## Problem Statement

The public visitor-count widget and its dedicated backend analytics integration are no longer wanted. Disabling its display would leave unnecessary polling code, credentials, health checks, deployment settings, and dependencies behind.

## Expected Behavior

The shared homepage no longer displays or requests visitor counts in English, Spanish, or Portuguese. The dedicated endpoint is removed rather than returning a placeholder. Ordinary browser-based GA4/gtag tracking, its configuration, and all three privacy disclosures remain unchanged.

## Constraints

- Keep Docusaurus static generation and the existing SWA managed API architecture.
- Do not introduce resources, replacement endpoints, or credentials. Retain
  Cosmos DB's required Newtonsoft.Json dependency explicitly after removing
  the Google package that previously brought it in transitively.
- Preserve unrelated edits, especially the English, Spanish, and Portuguese PlayStation docs.
- Preserve the weather widget and shared homepage content.
- Do not run concurrent backend builds; the coordinating task validates the final backend.

## Technical Design

| File | Action | Description |
|------|--------|-------------|
| `src/components/OnlineStatusWidget/*` | Delete | Remove the visitor component and its styles |
| `src/client/onlineStatusWidget.js` | Delete | Remove the dormant navbar injector |
| `src/components/Homepage/index.js`, `Homepage.module.css` | Modify | Remove visitor rendering and layout rules |
| `src/components/Homepage/__tests__/Homepage.test.jsx` | Create | Verify retained localized homepage content and weather without visitor polling |
| `src/config/environment.js`, `src/config/__tests__/environment.test.js` | Modify | Remove the visitor route and feature flag |
| `i18n/es/code.json`, `i18n/pt/code.json` | Modify | Remove unused visitor translation keys |
| `api/GetOnlineUsers.cs` | Delete | Remove the dedicated endpoint |
| `api/HealthCheck.cs`, `api/api.csproj` | Modify | Remove Data API health/configuration checks and the exclusive Google Analytics package |
| `infra/main.bicep`, `infra/README.md` | Modify | Remove dedicated parameters, app settings, endpoint output, and setup instructions |
| `README.md`, `.github/copilot-instructions.md`, `.github/repo-docs/architecture.md` | Modify | Surgically remove the retired feature from current documentation |
| `.github/repo-docs/domain-overview.md`, `.specify/memory/constitution.md` | Modify | Remove backend analytics examples that no longer apply, retaining existing policies |
| `.specify/memory/decisions.md` | Modify | Record the removal and retained browser analytics |

### API Contract

Remove `GET /api/online-users` entirely. No replacement API or visitor-count data model is introduced.

## Edge Cases

- Missing Google Analytics service-account credentials must no longer degrade backend health.
- Remove legacy online/last-hour translation keys and the unused navbar injector as well as the currently rendered widget.
- General references to visitors, privacy cookies, client analytics, Application Insights, and Log Analytics are not part of this removal.

## i18n Requirements

The shared header changes all three locale homepages together. Remove obsolete Spanish and Portuguese widget translations without changing privacy pages or unrelated locale content. No new public text is required.

## Acceptance Criteria

- [x] No visitor-count component, client injector, endpoint, route, feature flag, or dedicated styles remain.
- [x] Backend health and infrastructure no longer expect Google Analytics Data API configuration.
- [x] The exclusive NuGet dependency and stale operational documentation are removed.
- [x] Focused frontend tests pass, preserving localized homepage content and weather without polling the retired endpoint.
- [x] Tracked source, hidden documentation, and scripts contain no stale integration references outside this historical specification.
- [x] GA4/gtag configuration, privacy disclosures, and protected PlayStation content remain unchanged.

## Security Considerations

Removing the endpoint also removes service-account credential consumption and public reporting of its configuration. Existing unrelated endpoint authorization, rate limits, and telemetry stay unchanged.

## Out of Scope

Removing ordinary Google Analytics, changing its tracking ID or privacy policy, deploying infrastructure, deleting live cloud settings, changing gaming/IMDb behavior, or committing changes.

## Review

Approved for the explicit removal request: no new architecture, public text, or API is introduced; affected files, locale coverage, exclusions, and bounded validation are specified.

## Verification

- Focused Vitest run: 2 files, 11 tests passed (homepage and environment configuration).
- Scanned 615 tracked and non-ignored untracked files, including hidden documentation and scripts: no stale visitor integration references outside this specification.
- Confirmed deleted files are absent, locale JSON and infrastructure parameters parse, and the API project XML contains no Google dependency.
- Editor diagnostics reported no errors in changed code/configuration; scoped `git diff --check` passed.
- Confirmed client-side tracking configuration, npm manifests/lockfile, and all three privacy pages have no changes. No PlayStation content files were edited for this removal.
- Integrated backend build/tests passed after explicitly retaining Newtonsoft.Json
  13.0.4 for Cosmos DB; no Google Analytics Data API dependency remains.
