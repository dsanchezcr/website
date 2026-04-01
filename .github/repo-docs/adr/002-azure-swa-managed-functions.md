# ADR-002: Azure Static Web Apps with Managed Functions

## Status
Accepted

## Date
2022-12-01

## Context
Needed a hosting solution that:
- Serves static content globally with CDN
- Hosts a .NET API without managing separate infrastructure
- Provides automatic HTTPS and custom domain support
- Handles CORS automatically between frontend and API
- Supports environment variables for secrets
- Integrates with GitHub Actions for CI/CD

## Decision
Use **Azure Static Web Apps** with **managed Azure Functions** (.NET 9 isolated worker):
- Frontend and API deployed together from the same repository
- API served under `/api` path on the same domain (no CORS complexity)
- Single GitHub Actions workflow handles both builds
- Infrastructure defined in Bicep (`infra/main.bicep`)

## Consequences
- **Positive**: Single deployment unit — frontend and API always in sync
- **Positive**: No CORS configuration needed — same-origin requests
- **Positive**: Automatic scaling, HTTPS, CDN for static content
- **Positive**: Managed functions simplify operations (no App Service plan to manage)
- **Negative**: Rate limiting is in-memory only — restarting the function app clears state
- **Negative**: Limited to Azure Functions programming model (no custom middleware stack)
- **Negative**: Managed functions have cold start latency
