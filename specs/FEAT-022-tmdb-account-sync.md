# Feature Specification: OMDb media auto-fill (replaces TMDB sync)

## Replacement contract — 2026-09-16

The current implementation replaces account synchronization with explicit, admin-only
IMDb lookup while adding or editing a movie/series. The TMDB specification below is
historical; existing imported documents, localized metadata, attribution and ordering
remain supported without further automatic imports or database migration.

### Acceptance criteria

- An authenticated admin enters an IMDb ID (`tt` plus 6–12 ASCII digits) and clicks
  **Fetch Data**. Invalid input does not contact OMDb.
- The browser calls only `GET /api/content-admin/omdb?imdbId=...`. A .NET managed
  function validates identity and input, rate-limits requests, and uses a fixed HTTPS
  OMDb host with redirects disabled and bounded timeout/response size.
- `OMDB_API_KEY` comes only from server configuration (local ignored `api/.env`,
  environment/Functions settings, or deployed SWA settings). Never include credentials,
  upstream URLs, raw provider errors or response bodies in browser responses or logs.
- Populate Title, Year (first year for series), Plot, Director, Type, genres, IMDb
  rating and Poster Image URL. Unsupported episodes and movie/series mismatches
  produce an actionable error without modifying the form.
- Store the returned poster URL string in `imageUrl`; never fetch or store binary
  images. Missing/N/A optional values do not overwrite existing form data.
- Preserve identity, category, order, personal ratings/reviews, unknown fields and
  existing translations. Imported English metadata uses English fallback; never
  present it as Spanish/Portuguese translation. No writes until the admin saves.
- Successful lookup marks `metadataSource: omdb`, so IMDb links/ratings and the
  saved hotlinked poster take precedence without deleting historical TMDB fields.
- Disable editing/saving during lookup, show accessible loading/success/error feedback,
  cancel on close and ignore stale responses. Failures retain all entered values.
- Admin remains English-only under its existing internal-tool exemption. Public
  en/es/pt UI and legacy cards remain compatible.
- Remove active TMDB endpoint/service, sync panel/client and scheduled workflow;
  retain only compatibility code/tests and historical documentation.
- Deterministic mocked API/form tests cover auth, validation, errors, quotas/timeouts,
  metadata normalization, secrets, URL-only posters, safe merging and legacy records.

### Affected files and verification

API endpoint/service/registration, server environment configuration and health checks;
admin API client/editor/media field definitions and tests; media metadata model and
public card fallback if needed; TMDB-specific automation/routes/tests; existing setup,
architecture and API-003 documentation. Use existing xUnit, Vitest, admin typecheck/build,
and public site build; no live API keys or cloud writes are required.

### Replacement verification

- Existing xUnit suite and focused media-model tests pass with mocked provider calls.
  Release API build/publish passes; published Functions metadata includes the OMDb
  route and excludes the retired TMDB endpoint and dotenv files.
- Root Vitest suite, admin TypeScript check and production build pass. Public media
  regression tests cover hotlinked posters, English plot fallback, preserved localized
  overviews and IMDb links/ratings after auto-fill on legacy TMDB records.
- Docusaurus production build succeeds for English, Spanish and Portuguese.
- No live OMDb requests, database migrations or cloud configuration changes performed.
  Operators must configure the server key and retire unused TMDB credentials after rollout.

## Historical TMDB specification (superseded)

| Field | Value |
|---|---|
| Spec ID | FEAT-022 |
| Date | 2026-09-15 |
| Status | Implemented; full frontend/backend tests and admin integration verified |
| Related API / ADR | API-003 / ADR-007 |

## Problem and expected behavior

The discontinued IMDb metadata service leaves account imports unclassified and
public cards without useful metadata. The owner will add movies/TV to their TMDB
watchlist and rate them on TMDB. A server-side sync imports the four account feeds
into Cosmos; public rendering uses only stored metadata, never a browser API token.
FEAT-021 remains an implemented historical record, not the current sync contract.

## Design and boundaries

- Follow .NET isolated Azure Functions, existing singleton Cosmos client and raw JSON admin service.
- Fetch authenticated account details, verify configured account ID, then fetch all
  pages of movie/TV watchlists and ratings with `sort_by=created_at.desc`.
- Validate pagination, IDs, ratings and each batch's metadata before its writes. `maxItems`
  is a per-feed safety ceiling, not permission to silently truncate.
- Import movie watchlist/recently-watched and TV watchlist/completed only.
  Ratings preserve 0.5–10 half-step values; unrated watchlist entries store null.
- Store TMDB ID/type, poster path, community rating, localized title/overview/genres
  in en/es/pt, plus legacy-compatible English title/image/year/genres fields.
  Empty translations fall back to English/original titles with warnings.
- Deterministic IDs include media type, feed and TMDB ID. Only replace owned
  `syncSource: tmdb` documents for the configured account, using point-read ETags.
  Preserve reviews and unknown fields; collisions/concurrency conflicts skip with warnings.
- Non-destructive refresh: no deletion, no manual/IMDb document adoption, no top
  category writes. Removed/unrated entries remain until explicitly removed in admin.
- Process at most 20 documents per HTTP invocation with a 35-second overall budget
  below SWA's 45-second request limit. Signed stateless continuations resume across
  instances with cumulative counters, one stable snapshot and source fingerprint.
  Source changes reject continuation safely; timeout/storage failures return
  explicit acknowledged progress and a retry cursor. No background work after return.
- Current sync snapshot sorts first, then source order (newest first); retained
  older snapshots follow. Manual top-movies/top-series/top-tv order stays ascending.
- Scheduled workflow replaces IMDb workflow. No commits, deployment, cloud writes,
  admin SPA, gaming, visitor tracking, or dependency changes in this workstream.

## Affected files

- New `api/Services/TmdbSyncService.cs`, `api/SyncTmdbContent.cs`, media ordering helper.
- Remove old IMDb service/function/tests; change `api/Program.cs` registrations.
- Explicit `Microsoft.Extensions.Http` 10.0.12 in `api/api.csproj` supplies
  `RemoveAllLoggers`; do not rely on unrelated transitive packages for secret-safe HTTP logging.
- Media-only model, validator and Cosmos content query changes.
- `src/components/MediaCard/` cards/lists/tests; runtime route configuration.
- TMDB workflow, backend tests, setup docs, ADR, surgical current-documentation updates.

## Acceptance criteria / verification

- [x] Account mismatch, malformed/incomplete/oversized pagination, upstream auth,
  429, timeout or metadata failure cannot initiate writes.
- [x] Dry run defaults true and performs no Cosmos writes.
- [x] Movie/TV classification, localized stored metadata and half ratings are correct.
- [x] ETags preserve concurrent edits; unknown fields/reviews and manual/top docs survive.
- [x] Repeat runs use stable IDs, never delete; empty feeds produce explicit warnings.
- [x] Bounded batches resume across instances and preserve snapshot order; changed
  source/configuration/options and tampered cursors are rejected. An old cursor
  cannot demote documents from a newer snapshot.
- [x] Public cards render TMDB links/posters/localized metadata without live metadata fetches;
  legacy IMDb-only manual docs still render/link without conversion.
- [x] en/es/pt loading, empty/error, rating labels and TMDB credits are provided.
- [x] TMDB attribution uses approved logo, required disclaimer and a credits section.
- [x] Deterministic mocked backend and focused public tests pass.
- [x] Parent runs the full backend suite.

### Verification performed

- Admin integration: typed TMDB media fields, matching validation, safe preview
  links, automatic continuation, cumulative counters and explicit partial-progress
  resume. Admin grids reuse public media ordering while preserving raw documents.
- Full frontend coverage run: 199 tests across 21 files passed. Admin TypeScript
  check and production build pass.
- Full integrated backend suite: 246 tests passed, including raw admin media
  ordering and legacy metadata preservation.
- Mocked Edge verification covers batching, interrupted-sync resume, fresh
  persistence after preview, refreshed listings and ETag-preserving media edits.
- Root/admin npm audits report zero vulnerabilities; NuGet audit reports none.

- `npx vitest run src/components/MediaCard/__tests__ src/config/__tests__/environment.test.js`: 56 passing tests, including mocked workflow continuation/retry behavior.
- All six changed en/es/pt MDX files compile in memory with `@mdx-js/mdx`.
- Workflow parsed with existing `js-yaml`; dedicated SWA route precedes admin wildcard.
- Approved logo responds HTTP 200; no local game/media assets added.
- `git diff --check` passes; obsolete active IMDb integration references removed.
- After parent paused .NET work, ran
  `dotnet test api.tests/api.tests.csproj --filter "FullyQualifiedName~Tmdb" --verbosity minimal`:
  backend and test project compile successfully; 64 focused TMDB tests pass.
  Continuation tests cover bounded hydration, cross-instance cursors, source
  fingerprint changes, older snapshot protection and partial storage recovery.

## Security and limitations

Server settings hold the application read token and authorized v3 account session.
No credentials or upstream response bodies/URLs appear in output, Cosmos or logs.
Fixed upstream host, no redirects, bounded request/run timeouts and concurrency.
Admin role or constant-time automation key; one sync per instance. Cross-instance
Cosmos concurrency uses ETags, not a distributed transaction; a storage failure after
writes start may leave partial updates. Retrying is safe, never destructive.
