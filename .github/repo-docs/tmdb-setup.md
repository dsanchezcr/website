# TMDB account sync setup and operations

The owner manages watchlist additions and movie/TV ratings **on TMDB**, not on
IMDb. The website reads the authorized account and stores metadata in Cosmos.
It never writes ratings or watchlist changes back to TMDB. No admin/browser
credential fields or browser metadata API calls are needed.

## 1. Obtain application authentication

1. Sign in to your own [TMDB account](https://www.themoviedb.org).
2. Open [Settings → API](https://www.themoviedb.org/settings/api), request developer
   API access and accept the applicable terms. Supply the website details TMDB requests.
3. Copy **API Read Access Token** (the bearer token), **not** the v3 API key.
   Store it securely as `TMDB_READ_ACCESS_TOKEN` in the server's app settings.
   Do not prefix the value with `Bearer`.

## 2. Authorize that account for the application

Do these steps on a trusted workstation using a private API client/terminal.
Do not use a browser-based third-party API explorer, commit credentials, enable
PowerShell transcripts, or paste tokens into support tickets. All API requests
below use `Authorization: Bearer <API Read Access Token>`.

1. `GET https://api.themoviedb.org/3/authentication/token/new`.
   Require `success: true`; hold the returned `request_token` privately.
2. In your browser, while signed in to **the intended TMDB account**, open
   `https://www.themoviedb.org/authenticate/<request_token>` and approve the request.
   This temporary request token is the only authorization value that needs to
   visit the browser; never send the read token or final session ID to the browser.
   Request tokens expire after 60 minutes if unused.
3. `POST https://api.themoviedb.org/3/authentication/session/new` with
   `Content-Type: application/json` and `{ "request_token": "<approved request token>" }`.
   Require `success: true`; keep the returned `session_id` secret as `TMDB_SESSION_ID`.
   Use a normal authorized session, **not** a guest session.
4. `GET https://api.themoviedb.org/3/account?session_id=<session_id>` using the same
   bearer application token. Verify the returned username is yours. Save its
   numeric `id` as `TMDB_ACCOUNT_ID` (not the username or a v4 account identifier).
   Do not copy the full response or URL into logs.
5. The sync repeats this account lookup each run. TMDB validates the application
   token/session pair, and the endpoint rejects any account ID mismatch **before
   reading or writing content**. Changing `TMDB_ACCOUNT_ID` alone does not authorize
   a different user. Reauthorize the intended account if credentials are rotated.

You can also follow TMDB's official
[session guide](https://developer.themoviedb.org/reference/authentication-how-do-i-generate-a-session-id).
To revoke access, delete the session through TMDB's
`DELETE /3/authentication/session` with `{ "session_id": "..." }`, or revoke the
application in account settings, and remove/rotate server credentials.

## 3. Configure the server

These are **Azure Static Web Apps application settings**, not Vite/Docusaurus
build variables. For local development use the untracked `api/local.settings.json`
`Values` object; never commit actual values. Existing Cosmos containers must exist.
The sync creates no Azure resources.

| Setting | Value / purpose |
|---|---|
| `TMDB_READ_ACCESS_TOKEN` | Application API Read Access Token |
| `TMDB_SESSION_ID` | Authorized v3 session for the owner |
| `TMDB_ACCOUNT_ID` | Positive numeric v3 account ID verified above |
| `TMDB_SYNC_KEY` | Independent random automation secret (recommend 32 random bytes, base64); optional for admin-only use |
| `AZURE_COSMOS_ENDPOINT` | Existing Cosmos account endpoint |
| `AZURE_COSMOS_KEY` | Existing Cosmos content access key |
| `AZURE_COSMOS_DATABASE_NAME` | Existing database, default `dsanchezcr-website` |

Keep the application token/session in one server configuration; do not put them
in GitHub variables, `VITE_*`, public environment.js, content JSON or admin SPA.
The sync's named HttpClient disables URI logging and redirects. Do not enable
HTTP query-string/body capture in telemetry: TMDB v3 uses `session_id` in URLs.
.NET 9's default HTTP tracing query redaction must remain enabled.

## 4. Populate and preview

1. Add a few movies and TV series to your account's watchlist on TMDB.
2. Rate movies/TV on TMDB. Its API uses **0.5–10 in 0.5 increments**, even if
   a TMDB UI presents a percentage. The website stores these values unchanged.
3. Sign into the site's admin app with the SWA `admin` role, then request a preview:
   `POST /api/content-admin/tmdb/sync` with `{ "dryRun": true, "maxItems": 250 }`.
   Automation can use `X-Tmdb-Sync-Key` instead of an interactive admin session.
4. Each request processes at most **20 documents**. If HTTP 200 returns
   `completed: false`, repeat with its `continuationToken` and unchanged
   `dryRun`/`maxItems` until `completed: true`. Counts are cumulative; warnings
   are per response. Review the complete preview, then start a **new chain**
   with `dryRun: false` and no token to persist. Preview tokens cannot be used
   for writes. An omitted `dryRun` defaults true. Account settings or source URLs
   are not accepted in the request. See [API-003](../../specs/API-003-tmdb-sync.md).
5. Open the movies/series pages in English, Spanish and Portuguese to verify
   posters, titles, reviews and ordering. The public content API supplies all
   metadata; the browser only fetches poster/logo images from the provider CDN.

No live TMDB/Cosmos calls or configuration writes were performed as part of the
code migration. These setup steps are an operator task, not an automatic migration.

## 5. Daily automation

`.github/workflows/tmdb-sync.yml` runs at 1 AM America/New_York using two UTC
slots plus a timezone gate. GitHub schedules can be delayed; this is not a strict
real-time scheduler. Its job uses the `Production` GitHub environment:

- Secret `TMDB_SYNC_KEY`: exactly the same independent key as the server setting.
- Variable `WEBSITE_URL`: HTTPS origin, default `https://dsanchezcr.com`.
- Optional variable `TMDB_SYNC_MAX_ITEMS`: 1–1000, default 250 **per feed**.
- No TMDB read token/session in GitHub; the job only invokes the configured server.

Scheduled runs explicitly persist; manual workflow dispatch defaults to preview.
The workflow follows continuations automatically, with concurrency protection,
redirect refusal, a 20-minute job limit and bounded retries for explicit retryable
500/504 responses. It uses the returned partial-progress cursor when available.
Unrecoverable HTTP/source changes fail the job without echoing credentials.
Opaque signed cursors contain no credentials and grant no authorization; the
last cursor in job output can be used for an authorized manual resume within an hour.
After deploying the migration separately, remove obsolete `IMDB_*` settings/secrets
and disable any externally configured calls to the removed IMDb endpoint.

## Sync rules and metadata

| TMDB endpoint suffix (`/3/account/{account_id}/…`) | Container / category |
|---|---|
| `watchlist/movies` | content-movies / watchlist |
| `rated/movies` | content-movies / recently-watched |
| `watchlist/tv` | content-series / watchlist |
| `rated/tv` | content-series / completed |

All use `session_id`, `page`, `language=en-US`, and `sort_by=created_at.desc`.
`page`, `total_pages`, `total_results`, duplicate IDs and rated values are validated.
TMDB list responses do not provide a reliable per-item addition timestamp;
**never fabricate `createdAt` from the sync time**. Store descending `order` from
the returned sequence and `syncedAt` for the refresh snapshot. Current snapshots
sort before retained old ones; manual non-top entries follow in their existing
descending order. Top-movies/top-series/top-tv always keep manual ascending order.
All batches share one snapshot timestamp. An older continuation skips a document
already refreshed by a newer snapshot instead of demoting it.
TV ratings map to completed; episode progress/currently-watching is not inferred.

Details are fetched for `en-US`, `es-ES`, `pt-BR`. A synced document contains:

- `id`: `tmdb-movie-watch-<id>`, `tmdb-movie-rated-<id>`,
  `tmdb-tv-watch-<id>` or `tmdb-tv-rated-<id>`.
- `tmdbId`, `mediaType` (`movie` or `tv`), optional `titleId` (IMDb external ID).
- `titleTranslations: { en, es, pt }`, `overview: { en, es, pt }`,
  `genresTranslations: { en: [], es: [], pt: [] }`.
- `posterPath` or null, `tmdbRating`; English fallback `title`, `imageUrl`,
  `year`, `genres`. The public image size is TMDB `w500`.
- `myRating`: account rating for rated entries and matching watchlist entries;
  null for watchlist entries with no account rating.
- `review: { en: "", es: "", pt: "" }` on creation (never invented reviews).
- `syncSource: "tmdb"`, `syncAccountId`, `syncedAt`, `category`, `order`.

Missing translations use English/original fallback with warnings; missing posters
render placeholders. Existing raw JSON is cloned and ETag-replaced; reviews and
unknown fields survive. Existing manual/IMDb records are neither adopted nor
converted. Same-category matching manual IDs win and are reported as skipped.
Their stored title/poster data continues to render, or falls back to the IMDb ID
when metadata is missing; there is no live IMDb enrichment.

## Non-destructive safety and limits

- **No deletes**, including empty lists, removals, unratings, account switches,
  maxItems limits or failures. Clean up retained entries explicitly in admin.
- No top-category queries/writes; `currently-watching` also stays manual.
- All four feeds are fully validated on **every** continuation request. Only the
  next 20 documents are hydrated; all metadata/merges in that selected batch
  validate before its first Cosmos write. Prior batches are retained if a later
  batch fails. Oversized feeds fail explicitly rather than silently truncating.
  Four independent feed readers run in parallel; each feed's pages remain sequential.
- 10-second HTTP request timeout; **35-second overall budget**; four concurrent
  metadata items maximum; **20-document batches**. This leaves response headroom
  below [SWA's 45-second API limit](https://learn.microsoft.com/azure/static-web-apps/apis-overview).
  No background processing continues after return. Hundreds of localized details
  are not fetched in a single initial request.
- Continuations are stateless, HMAC-signed and bound to account/session/application
  settings, source order/ratings, maxItems, dryRun and snapshot timestamp. They
  expire after an hour and work across server instances without new Azure resources.
  Changing options/configuration invalidates a token; changed source feeds return
  409. Restart without the token in either case; no previous imports are deleted.
- A 504 timeout or storage failure returns `retryable: true`, a `phase` and
  `partialResult` containing cumulative acknowledged counts and a resume cursor.
  If the cursor is null, source validation had not completed; retry the original
  request. Bound retries and inspect persistent provider errors. Account-feed
  collection itself can still exceed the budget on an unusually slow provider;
  it fails explicitly without writing incomplete source data.
- Repeat runs use stable IDs. Create collisions or ETag conflicts are skipped
  with warnings, never unconditional upserts.
- Cross-partition storage writes are not transactional. A failed write may have
  committed without acknowledgement. Resume from the returned cursor; stable IDs
  and ETags make retrying that entry safe. There is no deletion or rollback that
  could erase an editor's work. Do not sum cumulative counters across batches.
- The instance semaphore blocks overlapping local runs; workflow concurrency and
  Cosmos ETags protect other callers. There is no distributed sync lease.

## Attribution and official references

Public media credits show an approved, unmodified TMDB logo and the required notice:
“This product uses the TMDB API but is not endorsed or certified by TMDB.”
Spanish and Portuguese explanations accompany the exact English notice. The
approved external logo was verified reachable (HTTP 200, 2,065 bytes); no new
local images or game assets are needed. API commercial use may require separate
licensing; review TMDB's current terms before changing the site's use.

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
