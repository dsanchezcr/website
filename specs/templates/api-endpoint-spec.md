# API Endpoint Specification Template

> Copy this template when specifying a new Azure Functions API endpoint.

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | API-XXX |
| **Function Name** | _C# function name_ |
| **Route** | `/api/<route>` |
| **Method(s)** | GET / POST / PUT / DELETE |
| **Author** | _Who wrote this spec_ |
| **Date** | _YYYY-MM-DD_ |
| **Status** | Draft / In Review / Approved / Implemented |

## Purpose

_What does this endpoint do? Why is it needed?_

## Request

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| _Custom header_ | _Yes/No_ | _Description_ |

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| _param_ | _string_ | _Yes/No_ | _Description_ |

### Request Body (if applicable)
```json
{
  "field1": "string",
  "field2": 0
}
```

## Response

### Success Response
```json
// Status: 200 OK
{
  "result": "..."
}
```

### Error Responses
| Status Code | Condition | Response Body |
|-------------|-----------|---------------|
| 400 Bad Request | Invalid input | `{ "error": "..." }` |
| 429 Too Many Requests | Rate limit exceeded | `{ "error": "..." }` |
| 500 Internal Server Error | Unexpected failure | `{ "error": "..." }` |

## Security

- [ ] Input validation at function boundary
- [ ] Rate limiting (specify: _N requests per IP per hour_)
- [ ] Authentication required? (specify method)
- [ ] Secrets via environment variables only

## Dependencies

_External services, packages, or environment variables required:_

| Dependency | Type | Environment Variable |
|------------|------|---------------------|
| _Service_ | _Azure/External_ | `ENV_VAR_NAME` |

## Implementation Notes

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `api/<FunctionName>.cs` | Create | Function implementation |
| `api/Program.cs` | Modify | Register new dependencies (if any) |
| `src/config/environment.js` | Modify | Add route to `config.routes` |

## Testing

- [ ] Unit tests for input validation
- [ ] Unit tests for business logic
- [ ] Integration test with mocked dependencies
- [ ] Rate limiting verified
- [ ] Error responses verified

## Acceptance Criteria

- [ ] Endpoint responds correctly for valid requests
- [ ] Invalid inputs return appropriate error codes
- [ ] Rate limiting enforced
- [ ] Route added to `src/config/environment.js`
- [ ] Health check includes new service (if applicable)
