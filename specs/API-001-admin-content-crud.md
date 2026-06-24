# API-001: Admin Content CRUD Endpoints

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | API-001 |
| **Function Name** | `AdminContent`, `GetRoles` |
| **Route** | `/api/content-admin/*`, `/api/auth/roles` |
| **Method(s)** | GET / POST / PUT / DELETE |
| **Author** | David Sanchez |
| **Date** | 2026-06-24 |
| **Status** | Approved |

## Purpose

Provide authenticated CRUD over the 5 Cosmos content containers for the `/admin` web app,
replacing the WPF desktop tool. Operates on raw JSON to preserve unknown fields and validates
writes to protect production data. See [FEAT-016](FEAT-016-web-admin-cosmos-crud.md).

## Request

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes (POST/PUT) | `application/json` |
| `x-ms-client-principal` | Yes | Injected by SWA after Entra auth; must contain the `admin` role |
| `If-Match` | No (PUT) | Cosmos ETag for optimistic concurrency |

### Path/Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | One of `movies`, `series`, `gaming`, `parks`, `monthly-updates` |
| `id` | string | Yes (GET one/PUT/DELETE) | Document id |
| `pk` | string | Yes (GET one/DELETE) | Partition-key value of the document |

### Request Body (POST/PUT)
Full JSON document. Must include the partition-key field for `type`
(`category`/`platform`/`provider`/`month`). `id` is generated on POST if omitted.

## Response

### Success Responses
```json
// GET list  -> 200 OK            [ { "id": "...", ... }, ... ]
// GET one   -> 200 OK            { "id": "...", ... }
// sample    -> 200 OK            { "id": "...", ... }      (one document for schema reference)
// partitions-> 200 OK            [ "action", "drama", ... ]
// POST      -> 201 Created       { "id": "...", ... }
// PUT       -> 200 OK            { "id": "...", ... }
// DELETE    -> 204 No Content
```

### Error Responses
| Status Code | Condition | Response Body |
|-------------|-----------|---------------|
| 400 Bad Request | Unknown `type`, invalid JSON, validation failure, missing partition key | `{ "error": "...", "details": [ ... ] }` |
| 401 Unauthorized | No client principal | `{ "error": "..." }` |
| 403 Forbidden | Authenticated but not `admin` | `{ "error": "..." }` |
| 404 Not Found | Document not found | `{ "error": "..." }` |
| 409 Conflict | ETag mismatch / id exists | `{ "error": "..." }` |
| 503 Service Unavailable | Cosmos not configured | `{ "error": "..." }` |

## Security

- [x] Input validation at function boundary (type allow-list, JSON parse guard, schema validation)
- [x] Authentication required — Entra ID via SWA; `admin` role enforced from `x-ms-client-principal`
- [x] Route-level protection in `staticwebapp.config.json` (`allowedRoles: ["admin"]`)
- [x] Secrets via environment variables only (reuses `AZURE_COSMOS_KEY`)
- [x] Parameterized Cosmos queries; no string concatenation
- [x] `GetRoles` is the `rolesSource`; not externally callable once configured

## Dependencies

| Dependency | Type | Environment Variable |
|------------|------|---------------------|
| Azure Cosmos DB | Azure | `AZURE_COSMOS_ENDPOINT`, `AZURE_COSMOS_KEY`, `AZURE_COSMOS_DATABASE_NAME` |
| Entra ID app | Azure | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| Admin allow-list | Config | `ADMIN_ALLOWED_EMAILS` (comma-separated) |

## Implementation Notes

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `api/AdminContent.cs` | Create | CRUD + sample + partitions endpoints |
| `api/GetRoles.cs` | Create | Allow-list → `admin` role |
| `api/ClientPrincipal.cs` | Create | Parse `x-ms-client-principal`, role checks |
| `api/Services/CosmosAdminService.cs` | Create | Generic JSON CRUD with container/partition map |
| `api/Program.cs` | Modify | Register `ICosmosAdminService` |
| `src/config/environment.js` | Modify | Add `admin*` routes |

## Testing

- [x] Unit tests: type allow-list, partition-key extraction, validation rules
- [x] Unit tests: client-principal parsing + `admin` role enforcement
- [x] Unit tests: unknown-field preservation (round-trip)

## Acceptance Criteria

- [ ] Valid requests succeed for all 5 types; invalid `type` → 400
- [ ] Missing/!admin principal → 401/403
- [ ] Unknown JSON fields preserved on update
- [ ] Validation failures return 400 with details and do not write
- [ ] Routes added to `src/config/environment.js`
