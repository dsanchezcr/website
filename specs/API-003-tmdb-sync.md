# API Specification: TMDB account synchronization

| Field | Value |
|---|---|
| Spec ID | API-003 |
| Function | SyncTmdbContent |
| Route / method | `POST /api/content-admin/tmdb/sync` |
| Date / status | 2026-09-15 / Implemented and verified with bounded continuation |

## Request

`Content-Type: application/json`; SWA `admin` role **or**
`X-Tmdb-Sync-Key` matching server `TMDB_SYNC_KEY` (constant-time comparison).

```json
{ "dryRun": true, "maxItems": 250, "continuationToken": null }
```

All fields optional: dryRun defaults **true**, maxItems defaults **250**;
continuationToken defaults null (start a new snapshot).
maxItems must be an integer 1–1000 and limits each of the four feeds.
Each request processes at most **20 documents**, independent of maxItems.
To continue, send the returned opaque token with unchanged dryRun/maxItems.
Tokens are HMAC-signed, bound to server account/session/application configuration,
source fingerprint and options, and expire one hour after snapshot creation.
Reject null/non-object/invalid JSON, unknown fields and bodies larger than 4 KiB.
No account ID, credentials or source URLs are accepted from clients.

## Response

HTTP 200, camelCase JSON:

```json
{
  "dryRun": true,
  "completed": true,
  "continuationToken": null,
  "watchlistImported": 0,
  "recentlyImported": 0,
  "moviesUpdated": 0,
  "seriesUpdated": 0,
  "created": 0,
  "replaced": 0,
  "deleted": 0,
  "skipped": 0,
  "warnings": []
}
```

Imported counts are total source entries in the validated snapshot (including skipped collisions).
Created/replaced and moviesUpdated/seriesUpdated are successful operations, or
planned operations during dry run, **cumulative across the continuation chain**.
Never sum counters across responses. `deleted` is always zero.
HTTP 200 with `completed: false` requires another authenticated request using
`continuationToken`. Only `completed: true` finishes the import.
Warnings communicate retained stale content, empty feeds, translation fallback,
manual collisions and ETag conflicts; warnings never contain secrets. Warnings
are per-response (clients may accumulate them across batches).

Errors: `{ "error": "safe message" }`.

| Status | Meaning |
|---|---|
| 400 | Invalid body/maxItems, invalid/expired cursor, changed options or configuration |
| 401 / 403 | Missing authentication / authenticated non-admin |
| 409 | A sync is already running on this instance, or source changed since cursor creation (restart without cursor) |
| 502 | Upstream failure, account mismatch, incomplete/oversized feed or invalid metadata |
| 503 | TMDB/Cosmos configuration unavailable |
| 504 | Bounded sync timeout, with explicit partial progress/retry information |
| 500 | Storage/unexpected failure; successful earlier writes may remain, safe to retry |

Timeouts and storage failures expose acknowledged progress without leaking secrets:

```json
{
  "error": "TMDB sync stopped during storage. Acknowledged totals: ...",
  "retryable": true,
  "phase": "storage",
  "partialResult": {
    "dryRun": false,
    "completed": false,
    "continuationToken": "<opaque signed cursor>",
    "watchlistImported": 250,
    "recentlyImported": 0,
    "moviesUpdated": 7,
    "seriesUpdated": 0,
    "created": 7,
    "replaced": 0,
    "deleted": 0,
    "skipped": 0,
    "warnings": []
  }
}
```

Resume with `partialResult.continuationToken`. If null, source validation had not
finished: retry the original request. A write may have committed without an
acknowledgement; retrying the unacknowledged entry is safe through deterministic
IDs and ETags. Bound client retry counts; never silently mark partial success complete.

## Dependencies, safety and testing

Settings: `TMDB_READ_ACCESS_TOKEN`, `TMDB_SESSION_ID`, `TMDB_ACCOUNT_ID`,
`TMDB_SYNC_KEY` (automation only), existing Cosmos settings.
Fixed TMDB API host with bearer application authentication and account session.
One active request per instance, 10-second HTTP timeout, **35-second overall budget**,
four parallel metadata items maximum, and **20-document batches**. SWA's
[45-second API limit](https://learn.microsoft.com/azure/static-web-apps/apis-overview)
includes time for returning errors; no work continues in the background.
ETags guard updates across instances; older cursors cannot replace newer snapshots.
All four feeds are revalidated on every continuation request, with four independent
feed readers in parallel (pages within each feed stay sequential). Only the selected
batch is hydrated; all metadata and planned merges in that batch must validate
before any writes in that request. Earlier successful batches are never rolled back.
No deletion or top-category operations. Unit tests mock HTTP and Cosmos; no real
credentials/cloud writes required. Public API responses expose metadata only.
See [setup](../.github/repo-docs/tmdb-setup.md) and FEAT-022 for behavioral tests.
