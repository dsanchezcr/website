# ADR-005: Azure Cosmos DB as Read-Only Content Source of Truth

## Status
Accepted

## Date
2026-04-13

## Context
Content data for gaming, movies, series, and theme parks is currently stored in static JSON files committed to the repository (`src/data/gaming/*.json`, `src/data/movies.json`, `src/data/series.json`, `src/data/disney-parks.json`, `src/data/universal-parks.json`). This approach has limitations:

- Content changes require a code commit and full site rebuild/deploy.
- JSON files grow over time, increasing bundle size for client-side imports.
- No audit trail or versioning beyond Git history.
- No query capabilities (filtering, pagination) without shipping all data to the client.
- Localized text fields in JSON create large, deeply nested structures.

The site already uses Azure Functions (managed by Azure Static Web Apps) for live data (Xbox/PlayStation profiles, weather, chat). Extending this pattern to serve content from a database is a natural evolution.

## Decision
Adopt **Azure Cosmos DB for NoSQL** as the sole runtime source of truth for curated content:

### Architecture
- **Cosmos containers**: `content-movies`, `content-series`, `content-gaming`, `content-parks`.
- **Partition keys**: `/category` (movies/series), `/platform` (gaming), `/provider` (parks).
- **API layer**: New read-only Azure Functions endpoints under `/api/content/*`.
- **No local fallback**: When Cosmos DB is unavailable, the API returns an appropriate error response.
- **Data seeding**: Existing JSON files are used once to populate Cosmos via a seed script, then removed from the repository.
- **Data updates**: Performed manually via Azure Cosmos DB Data Explorer or future admin endpoints.

### Containers and Models
| Container | Partition Key | Content |
|-----------|--------------|---------|
| `content-movies` | `/category` | Movie entries with localized reviews |
| `content-series` | `/category` | TV series entries with localized reviews |
| `content-gaming` | `/platform` | Gaming entries (cards/groups) with localized text |
| `content-parks` | `/provider` | Disney/Universal park items with localized text |

### API Endpoints
| Endpoint | Method | Query Params |
|----------|--------|-------------|
| `/api/content/movies` | GET | `category` (optional) |
| `/api/content/series` | GET | `category` (optional) |
| `/api/content/gaming` | GET | `platform` (required), `section` (optional) |
| `/api/content/parks` | GET | `provider` (required), `parkId` (optional) |

## Consequences

### Positive
- Content updates don't require code changes or deployments.
- Server-side filtering reduces data transferred to clients.
- Cosmos DB provides automatic indexing, global distribution options, and SLA guarantees.
- Consistent data access pattern across all content domains.
- Removes large JSON files from the repository, reducing clone/build size.

### Negative
- Runtime dependency on Cosmos DB availability (no fallback).
- Additional Azure cost (mitigated by serverless/autoscale throughput).
- Content updates require Azure portal access or admin tooling.
- Seed script is a one-time operation that must be validated carefully.

## Notes
- Prefer managed identity over key-based auth once SWA managed identity support is stable.
- Consider adding write/admin endpoints in a future phase for content management.
- Monitor RU consumption and adjust throughput based on actual usage patterns.
