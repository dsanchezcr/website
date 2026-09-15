# Gaming admin refresh and automatic ordering

## Metadata

| Field | Value |
|-------|-------|
| Spec ID | FEAT-023 |
| Date | 2026-09-15 |
| Status | Implemented |

## Problem and expected behavior

The admin cannot refresh Xbox/PlayStation connections, and new gaming entries
require manually incrementing an integer. Provide authenticated refresh controls,
newest-added default ordering, and optional manual ranks.

## Design and affected files

- `api/Services/*ProfileService.cs`: extract existing provider fetch logic for use
  by public endpoints and the admin refresh action. Do not clear working profile
  data before fetching a replacement. PSN manual refresh bypasses its access-token
  cache, so a rotated NPSSO setting is used.
- `api/RefreshGamingProfiles.cs`: retain `POST /api/gaming/refresh`, accept the
  existing secret key or an SWA admin principal, and validate `platform` against
  `xbox`, `playstation`, `all`. Refresh immediately, rather than only clearing cache.
- `api/Services/CosmosAdminService.cs`, `GamingOrdering.cs`, content model and
  validator: stamp gaming `createdAt` on creation and preserve it on updates.
  Optional positive `manualOrder` ranks appear first, ascending; remaining games
  sort by `createdAt` descending. Untimestamped legacy entries retain descending
  `order` behind dated entries. ID breaks ties. `topGames` retains ascending `order`.
- `api/Services/CosmosContentService.cs`: sort the partition before pagination;
  do not require an index migration or exclude legacy documents missing fields.
- `src/components/Gaming/GamingEntriesRenderer.js`: mirror ordering for local
  data and public pagination.
- `admin/src/api.ts`, `contentTypes.ts`, `validation.ts`, and components: add
  refresh buttons, result/error status, and an optional manual rank with a clear
  reset-to-automatic control. Preserve ETags when saving.
- Relevant backend/frontend tests and current gaming/admin documentation.

## API contract

`POST /api/gaming/refresh`, optional JSON `{ "platform": "all" }`.
Authenticated by SWA admin role or `X-Gaming-Refresh-Key`.
Response includes `platform`, `results` keyed by provider (status, message,
lastUpdated), and timestamp. HTTP 200 means all selected providers refreshed;
502 means at least one failed and results identify each outcome. Invalid JSON or
platform returns 400; missing auth 401; authenticated non-admin 403; throttled
refresh 429. A global process-local limit of 5 refresh actions/minute bounds
provider requests. No secrets are accepted in the body or returned.

## Edge cases and acceptance criteria

- Invalid payloads never default to refreshing all platforms.
- Provider/configuration failures remain visible and retain the last working cache.
- Cancellation reaches external HTTP requests and cache persistence. A 35-second
  overall refresh budget leaves time to respond within SWA's 45-second API limit.
- Concurrent edits use ETags; ordinary edits never change creation ordering.
- New games need no order value and appear before older automatic entries.
- Manual ranks persist and can be cleared. Ties are deterministic.
- Legacy lists and manually curated top games retain intended order.
- Sorting is identical in API and UI and occurs before pagination.
- Admin controls are keyboard accessible, disable duplicate submissions, and
  display failures even when a public widget could fall back to cached data.
- Unit tests, frontend/admin type checking and production builds pass.

## Constraints, security, and i18n

No new Azure resources, secrets in browser, or live account changes. Preserve
public profile fallback, existing rate limits, and all user's existing page edits.
Admin remains English-only under repository governance; public rendering uses
the existing en/es/pt locale paths with no new untranslated public text.
Review: scope, contracts, edge cases and acceptance criteria comply with the
project constitution and existing isolated Functions architecture.

## Out of scope

Changing Xbox/PSN account credentials through the browser; importing gaming
library entries into curated Cosmos cards; reconstructing unknown historical
creation dates; deployment and commits.

## Verification

- Full frontend coverage run: 199 tests passed, including connection controls,
  new games without integer ranks, manual-rank reset and public ordering.
- Backend suite: 246 tests passed, including provider refresh, cancellation, cache retention,
  legacy ordering, creation timestamp preservation and pagination behavior.
- Admin typecheck/build and mocked Edge checks passed. Browser validation used
  mocked APIs only, including failure feedback and ETag-preserving edits.
- No credentials were changed, no production data was written and no commits made.
