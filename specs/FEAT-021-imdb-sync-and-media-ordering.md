# Feature Specification

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-021 |
| **Title** | IMDb Sync and Auto-Ordering for Movies/Series + Monthly Platform Formatting Fix |
| **Author** | GitHub Copilot |
| **Date** | 2026-07-26 |
| **Status** | Implemented |
| **Related ADR** | N/A (no architecture boundary change) |

## Problem Statement

Managing Movies/TV entries is too manual because display order depends on a fixed `order` sequence edited by hand. The site also lacks an automated sync path from IMDb account lists for watchlist/recent activity. Additionally, monthly gaming update platform labels with markdown bold markers are rendered as literal text instead of bold formatting.

## Expected Behavior

1. Movies/Series lists display with newest queue item first when `order` is larger.
2. Creating new Movies/Series entries in admin auto-fills a higher `order` value to speed up entry creation.
3. Admin can trigger IMDb sync to populate watchlist and recently watched/completed categories with minimal manual work.
4. Top Movies/Top Series remain manually curated and untouched by IMDb sync.
5. Monthly update platform/source text supports markdown-style `**bold**` rendering in the card output.

## Constraints

- [x] Must support i18n (en/es/pt)
- [x] Must work with existing Docusaurus build
- [x] Must not require new Azure resources
- [x] Admin-only operations must keep existing auth/role checks
- [x] Existing manual top categories must remain unaffected

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `api/Services/ImdbSyncService.cs` | Create | New service to fetch/parse IMDb pages and upsert sync-managed docs into movies/series containers |
| `api/SyncImdbContent.cs` | Create | New authenticated admin endpoint to trigger sync |
| `api/Program.cs` | Modify | Register IMDb sync service |
| `api/Services/CosmosContentService.cs` | Modify | Order movies/series by descending `order` in Cosmos queries |
| `src/components/MediaCard/MediaCardList.js` | Modify | Fallback client-side descending order by `order` |
| `admin/src/components/ContentManager.tsx` | Modify | Prefill new docs with computed `order` and optional localized TBD review defaults |
| `admin/src/api.ts` | Modify | Add IMDb sync API client call |
| `admin/src/components/ImdbSyncPanel.tsx` | Create | Admin UI action panel for one-click sync |
| `admin/src/components/ContentManager.tsx` | Modify | Render sync panel for movies/series |
| `src/components/Gaming/ApiMonthlyReleases.js` | Modify | Render markdown-like bold segments for platform/source text |
| `src/config/environment.js` | Modify | Add route constant for admin IMDb sync endpoint |
| `api.tests/ImdbSyncServiceTests.cs` | Create | Unit tests for parsing and sync classification logic |

### API Contracts

```http
POST /api/content-admin/imdb/sync
Authorization: SWA authenticated admin role required
Content-Type: application/json

Request:
{
  "watchlistUrl": "https://www.imdb.com/user/<id>/watchlist",
  "ratingsUrl": "https://www.imdb.com/user/<id>/ratings",
  "dryRun": false,
  "maxItems": 200
}

Response 200:
{
  "watchlistImported": 0,
  "recentlyImported": 0,
  "moviesUpdated": 0,
  "seriesUpdated": 0,
  "skipped": 0,
  "details": "..."
}

Errors:
- 400 invalid payload or missing source URLs
- 401 unauthenticated
- 403 not admin
- 503 content service unavailable
- 500 sync execution failure
```

### Data Model

IMDb-managed docs are upserted with deterministic IDs:
- `id`: `imdb-<titleId>` for watchlist entries
- `id`: `imdb-recent-<titleId>` for recently watched/completed entries

Additional metadata fields added to synced docs:
- `syncSource`: `"imdb"`
- `syncedAt`: ISO-8601 UTC timestamp

These are non-breaking because unknown fields are already preserved by the admin/content model.

## Edge Cases

1. IMDb source page missing or returns no title IDs.
2. IMDb source order includes duplicate title IDs.
3. Ratings source has IDs but no parseable rating values.
4. Unknown title types returned by IMDb metadata API.
5. Existing manual entries in top categories must not be modified.

## i18n Requirements

- [x] New user-facing text has translations in all 3 locales (only admin internal text added; admin is English-only by governance)
- [x] Translated content files created in `i18n/es/` and `i18n/pt/` (not applicable for admin-only UI)
- [x] Component text uses existing patterns (public components unchanged except rendering logic)

## Acceptance Criteria

- [x] Movies/series lists sort with greatest `order` first.
- [x] New movies/series docs auto-populate `order` in admin editor.
- [x] Admin can trigger IMDb sync and receive a structured result.
- [x] Sync updates watchlist/recent categories only; top categories remain manual.
- [x] Monthly platform text displays bold when stored as `**text**`.
- [x] Backend tests cover parser/classification behavior.

## Security Considerations

- Reuses existing admin role enforcement (`x-ms-client-principal` role check).
- Limits sync source URLs to IMDb domain patterns.
- No secrets in request payloads or persisted data.

## Out of Scope

- Fully automatic background job scheduling inside Azure Functions runtime.
- Writing ratings/reviews content beyond default localized `TBD` placeholders for recently watched imports.
- Any changes to top movies/top series curation workflow.
