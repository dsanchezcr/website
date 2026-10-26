# Feature Specification: TMDB movie and TV metadata

## Metadata

| Field | Value |
|-------|-------|
| Spec ID | FEAT-025 |
| Date | 2026-10-23 |
| Status | Implemented and verified |
| Related ADR | ADR-008 |

## Problem Statement

Replace the active OMDb integration with TMDB across the managed API, admin editor,
public media UI, configuration, documentation and tests. Preserve the existing
explicit lookup/review/save workflow and stored Cosmos content.

## Expected Behavior

An admin enters a positive TMDB ID in Movies or Series and clicks **Fetch Data**.
The container determines `movie` or `tv`; TMDB IDs are not interchangeable between
these namespaces. The server returns normalized English, Spanish and Portuguese
metadata. The editor reviews the draft and explicitly saves through existing
ETag-aware CRUD. Public pages render saved content, without provider API requests.

## Constraints

- Remain within Docusaurus SSG and SWA managed isolated Functions; no new resources.
- English-only internal admin; public content and attribution support en/es/pt.
- No secrets in browsers, saved content, logs, error messages or query strings.
- Existing IMDb-only and previously imported records remain editable/renderable.
- No automatic account import, scheduled workflow, deletion or cloud/data migration.

## Technical Design

### Affected Files

Replace `api/GetOmdbMetadata.cs`, `api/Services/Omdb*`, `admin/src/omdb.ts` and
provider-specific tests with TMDB equivalents. Update API registration/health,
admin API/editor/field definitions/preview/validation, public MediaCard rendering,
locale docs, README/setup/architecture/governance docs and superseded specs.

### API Contract

`GET /api/content-admin/tmdb?tmdbId=550&mediaType=movie`

- Exactly one of each parameter. ID: ASCII decimal integer, 1..2147483647.
  Type: exactly `movie` or `tv`. Admin role checked in the function and SWA.
- 20 valid requests per admin per minute per instance.
- Server-only `TMDB_READ_ACCESS_TOKEN` in the Bearer authorization header.
- Fixed `https://api.themoviedb.org/3/{movie|tv}/{id}`; en-US, es-ES, pt-BR
  detail requests. English appends credits and external IDs.
- Ten-second overall deadline including body reads; 512 KiB per response;
  redirects/cookies disabled. No poster image downloads.
- Normalized response: `tmdbId`, `mediaType`, nullable IMDb `titleId`, English
  `title`, `year`, `plot`, `director`, `posterPath`, `imageUrl`, `tmdbRating`,
  `genres`, and complete en/es/pt `titleTranslations`, `overview`,
  `genresTranslations`. Missing translations use empty strings/arrays with
  public English fallback, never invented translations.
- 200 success, 400 invalid input, 401 unauthenticated, 403 non-admin,
  404 not found, 429 quota, 502 provider/invalid payload, 503 missing/rejected
  credential, 504 timeout. Fixed safe errors; `Cache-Control: no-store`.

### Data and UI

Successful lookup sets `metadataSource: "tmdb"`, TMDB identity and the matching
optional IMDb ID. English metadata refreshes; existing nonempty es/pt translations,
personal ratings/reviews, ID/category/order, ownership and unknown fields survive.
Missing optional display values do not erase curated values. Null community
rating remains unrated rather than retaining a rating from another provider.
Movie directors come from credits; TV credits use creators, labeled accordingly.
TMDB does not supply IMDb ratings; legacy values are retained only for compatibility.
Personal ratings are independent of provider account restrictions: preserve any
valid 0-10 value (including zero and fractions), or null for unrated.
All editing/saving is disabled during lookup. Closing/changing documents aborts
and ignores stale responses. Failures do not mutate the draft.

## Edge Cases

Missing IMDb IDs, posters, release dates, translations and zero vote counts;
same numeric ID in different media namespaces; duplicate/extra query parameters;
malformed, oversized, mismatched, redirected or timed-out provider responses;
concurrent edits and late response completion.

## Acceptance Criteria

- No active OMDb service, route, client or setting remains.
- Mocked backend tests verify auth, input boundaries, localization, normalization,
  quotas, error sanitization, bounded transport and secret-safe configuration.
- Admin tests verify explicit lookup/save for movies and TV, safe merging,
  validation, cancellation, ETags and no writes on failure.
- Public tests verify TMDB ratings/links/posters, locale fallbacks/attribution,
  legacy compatibility and unchanged ordering.
- API tests/build, frontend tests, admin typecheck/build and all-locale site build pass.
- Setup documents the required server token and removal of the obsolete OMDb key.

## Security Considerations

Use existing admin authorization and rate limiting; no automation key. Do not
follow provider redirects or expose raw upstream exceptions. Bound responses and
validate identity, types, ratings, date and poster path before changing any draft.
Local dotenv remains API-project-only and excluded from publish; deployed settings
never fall back to local files.

## Verification

- `dotnet test api.tests/api.tests.csproj --no-restore --verbosity quiet`: 401 passed.
- `npm test`: 338 passed, including explicit Fetch Data/Save/ETag integration,
  movie/TV namespace validation, cancellation, preserved curation and public locales.
- `npm run build`: English, Spanish and Portuguese production builds passed.
- `npm --prefix admin run typecheck` and `npm --prefix admin run build`: passed.
- Release API publish passed. Published Functions metadata contains the TMDB
  endpoint, not OMDb or account sync; dotenv/local settings are not published.
- Provider requests are mocked. No live provider credentials, cloud settings or
  Cosmos documents were changed; deployment and token configuration are operator tasks.
