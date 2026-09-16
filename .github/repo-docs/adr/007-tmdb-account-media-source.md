# ADR-007: Media metadata source — TMDB sync superseded by OMDb auto-fill

- **Status:** TMDB account-sync decision superseded; OMDb replacement accepted
- **Date:** 2026-09-16 (original decision: 2026-09-15)

## Context

Media entry is moving from account-wide imports to explicit per-title editing in
the existing admin SPA. Existing Cosmos documents, curated reviews/ratings,
translations and public TMDB rendering must remain compatible. FEAT-022 and API-003
now define OMDb lookup as the replacement; their older TMDB sections are historical.

## Decision

Use admin-only `GET /api/content-admin/omdb?imdbId=...` behind SWA authorization
and an independent function role check. The server validates the IMDb ID and calls
fixed HTTPS OMDb with server-only `OMDB_API_KEY`, no redirects, bounded requests
and safe errors. There is no automation key, browser provider call or image download.

The movie/series editor's **Fetch Data** fills a draft's title, first release year,
plot, director, media type, poster URL, genres and IMDb rating. Missing optional
metadata does not erase existing values. Preserve curated fields, unknown fields,
identity/order and existing es/pt translations; use English title/plot fallback
rather than fabricated translations. Persist only on explicit **Save**, using
existing admin CRUD/ETags; `imageUrl` stores a URL string, never binary data.

Remove the TMDB sync endpoint/service, admin sync panel/client and scheduled
workflow rather than migrating them to OMDb. Retain stored TMDB metadata,
compatibility ordering, links/posters and attribution. Keep this ADR and
`tmdb-setup.md` at their existing paths to preserve links. See
[setup/rollout details](../tmdb-setup.md) for configuration verification.

## Consequences

- Enrichment is an intentional single-title action; no account import, automatic
  metadata refresh, background write or database migration is introduced.
- Public pages use saved Cosmos metadata during provider outages. Poster hotlinks
  still depend on external availability; the site does not archive images.
- OMDb does not provide the former trilingual metadata flow. Existing translations
  survive; editors curate missing translations separately. The admin UI remains
  English-only under ADR-006, without changing public en/es/pt requirements.
- Invalid IDs/results, access failures, quota limits and timeouts leave the draft
  unchanged. Provider configuration is server-only, not a frontend build setting.
- After rollout, operators remove/revoke unused `TMDB_READ_ACCESS_TOKEN`,
  `TMDB_SESSION_ID`, `TMDB_ACCOUNT_ID`, `TMDB_SYNC_KEY`, and GitHub
  `TMDB_SYNC_KEY` / `TMDB_SYNC_MAX_ITEMS`. Documentation/code changes do not perform
  cloud configuration writes or content migrations.

## Historical decision — 2026-09-15 (superseded)

The following records the former design, not current setup or deployment instructions.

### Context

IMDb scraping cannot reliably classify media, and its former third-party metadata
API is discontinued. The owner wants to curate watchlists and ratings on TMDB,
while preserving site reviews and manually ordered top lists.

### Decision

Use official TMDB v3 account watchlist/rated movie/TV endpoints with the server's
application read token and explicitly authorized account session. Verify the
session's account ID against configuration on every run. Resolve localized details
server-side, embed metadata in the existing Cosmos media documents, and render
public cards without calling a metadata API. Follow API-003 and FEAT-022.

Keep existing isolated Functions hosting and shared Cosmos client. Fully validate
all source feeds and each selected batch's metadata before its writes; use deterministic IDs and optimistic
ETag replacement on sync-owned documents. Default dry run and never delete or
adopt manual/IMDb/top documents. No browser account authorization flow or secrets.

SWA API requests are limited to 45 seconds. Each invocation has a 35-second budget,
validates all account feeds, and processes only 20 documents. HMAC-signed stateless
continuations bind offsets/cumulative counters to account configuration, source
fingerprint, options and one snapshot timestamp. They expire after one hour and
grant no authorization. Every continuation remains authenticated and revalidates
the complete source. Return explicit partial progress on timeouts/storage failures;
no fire-and-forget work or in-memory job ownership is required.

### Consequences

- An empty database can be populated with correctly classified, localized cards.
- Public pages work during TMDB outages and require no API credentials.
- Account removals/unratings are intentionally not mirrored as deletion; admin
  cleanup is explicit. Retained older snapshots sort after the newest snapshot.
- Metadata has English/original fallback where TMDB has no translation.
- Sync uses bounded batches, not a monolithic initial metadata import. Oversized
  feeds still fail the safety ceiling rather than silently truncate. Clients must
  follow continuations, and restart if account lists change during the chain.
- Cross-partition writes are not atomic; storage failures can leave partial safe
  updates, with deterministic retries and ETags preventing lost editor changes.
- TMDB attribution/logo/credits and terms compliance are required.
- Historical IMDb specs/manual titleId records remain compatible and unchanged.
