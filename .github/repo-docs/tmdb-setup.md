# TMDB movie and TV metadata setup

TMDB replaces OMDb for admin **Fetch Data** as of 2026-10-23. This is per-title
enrichment, not account synchronization. Deploy the API, admin and public UI
together. See [FEAT-025](../../specs/FEAT-025-tmdb-media-lookup.md),
[API-003](../../specs/API-003-tmdb-sync.md) and [ADR-008](adr/008-tmdb-media-lookup.md).

## Server configuration

Obtain the **API Read Access Token** from your TMDB account's API settings.
Set **`TMDB_READ_ACCESS_TOKEN`**, not the v3 API key, in the managed API's Azure
Static Web Apps application settings. The server sends it as a Bearer authorization
header to `https://api.themoviedb.org/3/`; it never appears in a query string.
No account session, account ID, automation key or GitHub sync secret is needed.

For local Functions, set `TMDB_READ_ACCESS_TOKEN` in ignored
`api/local.settings.json` under `Values`, or in the Functions process environment.
Ignored `api/.env` supports `TMDB_READ_ACCESS_TOKEN=<your-read-access-token>` as
a local fallback. Never put it in `admin/.env`, `VITE_*`, frontend build settings,
public content, browser requests, logs or source control.

`TmdbSettings` locates the API project from the working/application base directory
and parses only that project's `.env` using DotNetEnv, without exporting unrelated
settings. Environment/Functions values win, even when blank. Local fallback is
disabled for `WEBSITE_INSTANCE_ID` or `AZURE_FUNCTIONS_ENVIRONMENT=Production`.
Missing configuration yields 503; malformed/unreadable local files also emit a
fixed warning without file contents. Dotenv and local settings are excluded from
publish. Restart the Functions host after configuration changes.

```sh
cd api
dotnet build
func start
```

Run the admin separately using its [development instructions](../../admin/README.md).
`/api/health` and `/api/health/config` report **token presence only**, using the
same settings instance as lookup. They do not validate the token or provider quota.

Lookup works without Cosmos; **Save** still requires the existing Cosmos settings.
Use a scratch database for local write trials. No new Azure resources are required.

## Fetch, review and save

1. Sign into `/admin` with the `admin` role and open **Movies** or **Series**.
2. Enter the numeric **TMDB ID** from the matching TMDB URL: for example,
   `/movie/550` uses `550` in Movies; `/tv/1399` uses `1399` in Series.
   These namespaces are independent; the same number can identify different titles.
   Do not paste an IMDb ID, URL, episode ID or title name.
3. Click **Fetch Data**, review the draft, then explicitly **Save**.

| Stored field | TMDB source / behavior |
|---|---|
| `tmdbId`, `mediaType` | Requested TMDB identity, `movie` or `tv` |
| `titleId` | Optional IMDb external ID; null when TMDB has none |
| `title`, `plot`, `year` | English title/overview and release/first-air year |
| `director` | Movie directors from credits, or TV creators |
| `titleTranslations`, `overview`, `genresTranslations` | en-US, es-ES, pt-BR details normalized to en/es/pt |
| `posterPath`, `imageUrl` | Validated path and fixed HTTPS TMDB w500 image URL; no binary download |
| `tmdbRating` | Community vote average; null when there are no votes |
| `metadataSource` | `tmdb`, saved only with the rest of the draft |

English metadata refreshes, while nonempty Spanish/Portuguese translations,
personal reviews/ratings, category/order, identity, ownership and unknown fields
are preserved. Missing translations are filled where available; absent values use
empty strings/arrays and public English fallback. Missing optional display values
do not clear curated fields. The external IMDb ID and community rating reflect the
new lookup, including null, rather than retaining an unrelated identifier/rating.
TMDB does not supply IMDb ratings. Personal ratings remain independent, 0-10 or
null for unrated, including existing fractional values.

All editing/saving is disabled during lookup; closing or changing documents aborts
the request and ignores late results. Failures leave the draft intact. Lookup,
preview and close never write to Cosmos. Save uses the existing ETag-aware CRUD.
The internal admin stays English-only; public pages and credits support en/es/pt.

## API and troubleshooting

`GET /api/content-admin/tmdb?tmdbId=550&mediaType=movie` requires the SWA `admin`
role plus an independent in-function check. Exactly one of each query parameter
is required; IDs are ASCII positive integers through 2147483647. Queries are capped
at 256 characters. There is no public provider endpoint or client credential field.

Limits: **20 valid lookups/admin/minute/instance**, a **10-second overall deadline**
for the three localized detail requests including body reads, and **512 KiB per
response**. Redirects and cookies are disabled. English details append credits and
external IDs. Any localized request failure rejects the whole lookup.
Factory HTTP logging and provider telemetry are suppressed; errors are fixed safe
JSON messages with `Cache-Control: no-store`, never raw provider bodies.

| Status | Action |
|---|---|
| 400 | Check the numeric ID and matching Movies/Series section |
| 401 / 403 | Sign in again / verify the account has the admin role |
| 404 | Check TMDB ID and media namespace; no title was found |
| 429 | Wait before retrying; check provider quota if persistent |
| 502 | Provider/network failure or invalid payload; retry later |
| 503 | Configure/correct the server read access token and restart locally |
| 504 | Overall lookup timed out; retry later |

## Rollout and compatibility

After deploying, configure `TMDB_READ_ACCESS_TOKEN`, verify a movie and TV lookup
and explicit Save against a safe database, then check public en/es/pt pages.
Remove/revoke unused **`OMDB_API_KEY`**. The `/api/content-admin/omdb` route is
retired; API and admin must be deployed together.

The old account sync remains retired: no `/tmdb/sync`, connection panel, scheduled
workflow or automatic content import. Remove any leftover `TMDB_SESSION_ID`,
`TMDB_ACCOUNT_ID`, `TMDB_SYNC_KEY`, GitHub `TMDB_SYNC_KEY`/`TMDB_SYNC_MAX_ITEMS`
and external sync callers. **Keep `TMDB_READ_ACCESS_TOKEN`**, which now powers
lookup, and shared `WEBSITE_URL` used by other jobs.

Existing IMDb-only records and historical provider-marked documents still render
without conversion. Explicit TMDB enrichment selects TMDB links/ratings. Unmarked
TMDB imports retain their old links/ratings. Cards prefer `imageUrl` over
`posterPath`, and localized `overview` over English `plot`. Public content comes
only from saved Cosmos documents, never live metadata requests. Posters remain
external hotlinks; availability depends on the TMDB CDN.

Retain legacy sync ownership and snapshot ordering. Top lists remain ascending by
manual order; other imports keep their stored snapshot/descending ordering.
There is no automatic deletion, bulk conversion or cloud write in this replacement.

Retain the approved logo and notice in `TmdbAttribution`:
“This product uses the TMDB API but is not endorsed or certified by TMDB.”
Provider terms and attribution still apply.

## Provider references

- [Application authentication](https://developer.themoviedb.org/docs/authentication-application)
- [Movie details](https://developer.themoviedb.org/reference/movie-details)
- [TV details](https://developer.themoviedb.org/reference/tv-series-details)
- [Append to response](https://developer.themoviedb.org/docs/append-to-response)
- [Images](https://developer.themoviedb.org/docs/image-basics)
- [Attribution](https://www.themoviedb.org/about/logos-attribution)
