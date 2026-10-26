# ADR-008: TMDB per-title movie and TV metadata

- **Status:** Accepted
- **Date:** 2026-10-23

## Context

The requested TMDB replacement supersedes ADR-007's OMDb provider while retaining
explicit admin curation. Public availability must not depend on live metadata
requests, and existing Cosmos documents must remain usable without migration.

## Decision

Use admin-only `/api/content-admin/tmdb` with a positive TMDB ID and explicit
`movie`/`tv` namespace. Fetch localized details server-side using
`TMDB_READ_ACCESS_TOKEN` as a Bearer header. Fetch Data changes only the draft;
Save uses existing Cosmos CRUD and ETags. See FEAT-025 for the complete contract.

Refresh English metadata and fill missing Spanish/Portuguese translations without
overwriting curated translations, reviews, ratings or ordering. Save a TMDB source
marker, community rating, poster path/URL and optional IMDb external ID. Retain
legacy fields and rendering compatibility, including old account snapshot ordering.
Public pages use saved metadata and the approved TMDB logo/disclaimer.

## Consequences

- TMDB application read access is required only on the server. No account session,
  sync key, background import, scheduled workflow or new Azure resource is needed.
- TMDB ratings are not IMDb ratings. TV creators are distinct from film directors.
- Three localized requests share a bounded deadline; any failure leaves the draft
  unchanged. Missing translations fall back to English in the public UI.
- Old entries are not bulk-converted. Admins can enrich them individually.
- Operators configure the TMDB token and remove `OMDB_API_KEY` after rollout;
  these repository changes do not modify cloud settings or stored documents.
