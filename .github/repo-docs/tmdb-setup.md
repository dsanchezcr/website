# OMDb media auto-fill setup and operations

This guide replaces TMDB account-sync instructions on **2026-09-16**. Its filename
remains `tmdb-setup.md` to preserve links. OMDb is an **admin-only, per-title lookup**,
not an account importer or scheduled refresh. Existing TMDB documents are retained.
See the replacement sections of [FEAT-022](../../specs/FEAT-022-tmdb-account-sync.md)
and [API-003](../../specs/API-003-tmdb-sync.md).

Deploy the API and admin editor together before using this flow. Configuration and
limits below reflect `OmdbSettings`, `OmdbLookupService` and `GetOmdbMetadata`;
deployment and live-provider verification are separate operator tasks.

## 1. Configure the server

Use your OMDb API key as **`OMDB_API_KEY`**. It belongs only in the Functions
server configuration, never an admin credential field, `VITE_*` variable,
Docusaurus/Vite build setting, public JSON, browser OMDb request or GitHub sync secret.

| Environment | Configuration |
|---|---|
| Local Functions | `OMDB_API_KEY` in ignored `api/local.settings.json` → `Values`, or the Functions process environment |
| Local `.env` fallback | `OMDB_API_KEY` in ignored `api/.env`; existing environment/Functions settings take precedence |
| Production | `OMDB_API_KEY` as an Azure Static Web Apps **application setting** for the managed API |

Keep real values untracked and restart the local Functions host after changes.
Use a simple `OMDB_API_KEY=<your-key>` assignment. `OmdbSettings` uses DotNetEnv
without exporting other settings into the process. It searches from the working
directory and application base directory, walking ancestors to locate `api.csproj`
or `api/api.csproj`, then reads only that API project's `.env`, not root/admin files.
An existing environment value wins even when empty. Local fallback is disabled
when `WEBSITE_INSTANCE_ID` is set or `AZURE_FUNCTIONS_ENVIRONMENT=Production`.
Missing/unreadable/malformed local configuration leaves lookup unconfigured (503).
The project excludes `.env` files from build/publish output.

From the repository root, the direct-host local workflow is:

```sh
cd api
dotnet build
func start
```

Start the admin dev server separately using the existing
[admin development instructions](../../admin/README.md). Local mock auth is for
development only; production requires SWA sign-in and the `admin` role.

Lookup does not need Cosmos. **Saving** still uses the existing admin CRUD and
`AZURE_COSMOS_ENDPOINT`, `AZURE_COSMOS_KEY`, `AZURE_COSMOS_DATABASE_NAME` settings.
No new Azure resources or database migration are required. Local Save can affect
live data if the configured database is production; use a scratch database for trials.

## 2. Fetch, review, then Save

1. Sign into `/admin` as an admin and open **Movies** or **Series**. Add or edit a title.
2. Enter one IMDb ID (`tt` plus 6–12 ASCII digits, for example `tt0111161`),
   not a title URL, and click **Fetch Data**.
3. Review the draft fields populated from OMDb:

   | Field | Normalization |
   |---|---|
   | `title` | English title fallback |
   | `year` | Integer; first year of a series range |
   | `plot`, `director` | Optional text; full plot requested |
   | `mediaType` | OMDb `movie` → `movie`; `series` → `tv` |
   | `imageUrl` | Poster URL string only; no binary image download/storage |
   | `genres`, `imdbRating` | Genre list and community score, not your personal rating |

   Missing/`N/A` optional values normalize to null (genres to an empty array) and
   do **not** erase existing form values. Episodes, malformed results and
   movie/series mismatches are rejected without changing the draft.
4. Curate your `review`, `myRating`, category and order separately. Lookup preserves
   these, identity, unknown fields, legacy metadata and existing es/pt translations.
   It supplies English title/plot fallback and updates existing English
   `titleTranslations.en` / `overview.en` values, not Spanish/Portuguese text.
   Review or add translations separately; **Fetch Data** is not **Generate with AI**.
5. Click **Save** explicitly to persist through the existing Cosmos admin API.
   Fetching, previewing or closing the editor does not save. Editing/saving is
   disabled during lookup; closing cancels it and stale responses are ignored.
   Failures retain entered values.

The internal admin UI remains **English-only** (ADR-006 exemption). Public
en/es/pt UI remains supported, using stored translations or English fallback.

## 3. API safety and troubleshooting

The browser calls only `GET /api/content-admin/omdb?imdbId=tt0111161` on the site's
API. SWA protects `/api/content-admin/*`, and the function independently checks the
`admin` role. There is **no automation key**, anonymous metadata access, client API
key or configurable provider URL.

The backend uses fixed **`https://www.omdbapi.com/`**, not HTTP, with redirects
disabled. Current limits are **20 valid lookups per admin per minute per instance**
(in-memory), a **10-second** provider request/body-read budget and **128 KiB**
maximum response. The query must contain only one `imdbId` and be at most 256
characters. These are code limits, not a guarantee of provider quota availability.
OMDb query credentials must not appear in URI logs, telemetry, browser responses or support reports;
never enable query-string/body capture. Responses are `Cache-Control: no-store`;
errors use `{ "error": "safe message" }`, not raw upstream errors or payloads.
HTTP client registration removes factory URI logging; the lookup service suppresses
OpenTelemetry instrumentation for the credential-bearing provider call.

| Status | Meaning / operator action |
|---|---|
| 400 | Invalid IMDb ID or unsupported title type. Use a movie/series IMDb ID in the correct editor; do not submit a URL or episode |
| 401 | Not authenticated. Sign in again |
| 403 | Authenticated without `admin`. Check the SWA role/allow-list; a provider key cannot grant access |
| 404 | No matching title. Verify the IMDb ID; this is not a missing API-key error |
| 429 | Local rate limit or OMDb quota exhausted. Wait before retrying; check the provider account quota if persistent. Do not repeatedly click Fetch Data |
| 502 | Provider/network failure or invalid/mismatched payload. Retry later; investigate persistent failures without logging provider bodies or credentials |
| 503 | Missing or rejected **server** `OMDB_API_KEY`. Configure/correct the key and restart the local host; in production check the SWA application setting. Do not put a key in the browser |
| 504 | Bounded lookup timeout. Retry later; the draft and database remain unchanged |

Successful metadata lookup does not guarantee a working poster. `imageUrl` points
to an external host; availability, hotlink restrictions and browser HTTPS/CSP rules
can prevent display. There is no image archive/proxy or binary asset migration.
Public pages read saved Cosmos metadata, never live OMDb/TMDB metadata.

## 4. Rollout and retirement of TMDB automation

The replacement removes the TMDB sync service and endpoint
(`/api/content-admin/tmdb/sync`), admin connection panel/client, and
`.github/workflows/tmdb-sync.yml`. There is no OMDb cron, batch import, dry-run
chain or continuation workflow. Do not recreate the old deployment configuration.

After rollout, the operator must:

- Remove unused SWA `TMDB_READ_ACCESS_TOKEN`, `TMDB_SESSION_ID`, `TMDB_ACCOUNT_ID`
  and `TMDB_SYNC_KEY`; revoke unused TMDB application/session credentials at the provider.
- Remove GitHub secret `TMDB_SYNC_KEY` and variable `TMDB_SYNC_MAX_ITEMS`, including
  copies in the `Production` environment. Keep shared `WEBSITE_URL` used by other jobs.
- Disable any external callers of the removed sync endpoint.
- Check movie/series editing and public en/es/pt legacy cards without mass-writing
  or converting existing documents.

These are **operator actions**, not cloud writes or migrations performed by this
documentation change or by lookup.

## Legacy metadata, ordering and attribution

Retain imported `tmdbId`, `mediaType`, `posterPath`, `tmdbRating`,
`titleTranslations`, `overview`, `genresTranslations`, `syncSource`,
`syncAccountId`, `syncedAt` and other unknown fields. Existing IMDb-only records
also remain valid. No account removals/unratings are mirrored automatically.
Non-top TMDB records retain stored snapshot/descending ordering ahead of manual
entries; top-movies/top-series/top-tv retain manual ascending order. Never invent
creation dates from sync timestamps.

Public TMDB posters/links, community ratings and localized credits remain supported.
`TmdbAttribution` retains the approved logo and required notice:
“This product uses the TMDB API but is not endorsed or certified by TMDB.”
Review the provider's terms when changing use; image/attribution availability is external.
Historical design details remain in [ADR-007](adr/007-tmdb-account-media-source.md)
and the superseded spec sections, not operational sync instructions.

## Historical references (not OMDb setup)

The retired TMDB API examples linked
below use `Authorization: Bearer <API Read Access Token>`.

These references describe the superseded integration, not deployment steps for OMDb.

Official documentation researched on 2026-09-15:

- [Application auth](https://developer.themoviedb.org/docs/authentication-application)
  and [user auth](https://developer.themoviedb.org/docs/authentication-user)
- [Account details](https://developer.themoviedb.org/reference/account-details)
- [Movie watchlist](https://developer.themoviedb.org/reference/account-watchlist-movies)
  and [TV watchlist](https://developer.themoviedb.org/reference/account-watchlist-tv)
- [Rated movies](https://developer.themoviedb.org/reference/account-rated-movies)
  and [rated TV](https://developer.themoviedb.org/reference/account-rated-tv)
- [Movie ratings](https://developer.themoviedb.org/reference/movie-add-rating)
  and [TV ratings](https://developer.themoviedb.org/reference/tv-series-add-rating)
- [Images](https://developer.themoviedb.org/docs/image-basics),
  [attribution FAQ](https://developer.themoviedb.org/docs/faq),
  [approved logos](https://www.themoviedb.org/about/logos-attribution)
