# ADR-007: TMDB account feeds and stored localized media metadata

- **Status:** Accepted
- **Date:** 2026-09-15

## Context

IMDb scraping cannot reliably classify media, and its former third-party metadata
API is discontinued. The owner wants to curate watchlists and ratings on TMDB,
while preserving site reviews and manually ordered top lists.

## Decision

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

## Consequences

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
