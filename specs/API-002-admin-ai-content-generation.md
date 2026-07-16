# API-002: Admin AI content generation (Foundry) for localized fields

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | API-002 |
| **Title** | Admin-only Foundry endpoint to expand a brief prompt into localized (en/es/pt) content |
| **Author** | David Sanchez |
| **Date** | 2026-07-16 |
| **Status** | Approved |
| **Related ADR** | [ADR-003](../.github/repo-docs/adr/003-rag-chatbot.md), [ADR-006](../.github/repo-docs/adr/006-web-admin-cosmos-crud.md) |

## Problem Statement

When adding or editing content (movies, series, gaming, parks, monthly-updates) in the `/admin`
app, localized text fields (`review`, `description`, `recommendation`, `name`, `title`,
`introText`) must be written manually in three languages (en/es/pt), in a consistent personal
tone. This is slow and repetitive. We want to type a **brief prompt** and have Foundry expand it
into a polished description in the site's tone and translate it into all three locales in one step.

## Expected Behavior

- On every new/edit form, localized fields (`localized` and `localizedOrString`) show a
  **"Generate with AI"** control.
- The admin types a short brief (e.g. "co-op looter shooter, loved the endgame grind, great with
  friends") and clicks Generate.
- The endpoint returns `{ en, es, pt }` written in David's tone, which pre-fills the field's three
  locale inputs. The admin can review/edit before saving.
- The feature is callable **only** from the authenticated admin console (Entra ID + `admin` role).

## Constraints

- [x] Reuses the existing Foundry configuration (`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`,
      `AZURE_OPENAI_DEPLOYMENT`) — **no new Azure resources**.
- [x] Admin-only: gated by the existing SWA `/api/content-admin/*` role rule **and** an in-function
      `x-ms-client-principal` `admin` check (defense in depth).
- [x] Must not weaken the existing Content-Security-Policy (the SPA already calls same-origin `/api`).
- [x] Admin UI stays English-only; the **generated content** covers en/es/pt.
- [x] Endpoint returns 503 when Foundry is not configured (local dev), consistent with other services.

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `api/Services/ContentGenerationService.cs` | Create | Foundry call + system prompt + strict-JSON parsing into `{en,es,pt}` |
| `api/AdminContentGeneration.cs` | Create | `POST /api/content-admin/ai/generate` (admin-gated) |
| `api/Program.cs` | Modify | Register `IContentGenerationService` |
| `admin/src/api.ts` | Modify | `generateLocalizedText()` client helper |
| `admin/src/components/FormEditor.tsx` | Modify | "Generate with AI" control on localized fields |
| `admin/src/components/fields.tsx` | Modify | Accept optional AI-generate affordance on localized inputs |
| `admin/src/index.css` | Modify | Styles for the generate control |
| `src/config/environment.js` | Modify | Add `adminGenerate` route note |
| `api.tests/ContentGenerationTests.cs` | Create | Prompt-building + JSON-parsing unit tests |

### API Contracts

```
POST /api/content-admin/ai/generate
Request:
{
  "contentType": "gaming",          // movies|series|gaming|parks|monthly-updates
  "field": "description",           // logical field name (review|description|recommendation|name|title|introText)
  "prompt": "brief text",           // required, 1..1000 chars
  "title": "Helldivers 2"           // optional context (item title / IMDb id)
}
Response 200:
{ "en": "…", "es": "…", "pt": "…" }
Status: 200 | 400 (validation) | 401 (unauth) | 403 (not admin) | 429 (rate limit) | 502 (model error) | 503 (unconfigured)
```

### Component Design (SPA)

`FormEditor` renders a small "Generate with AI" affordance next to each localized field. It opens
an inline prompt input; on submit it calls `generateLocalizedText(contentType, field, prompt, title)`
and merges the returned `{en,es,pt}` into that field's value. Existing manual editing is unchanged.

### Data Model

No new containers or persisted data. The endpoint is stateless — it only transforms a prompt into a
localized object that the admin can then save through the existing CRUD endpoints.

## Edge Cases

1. Foundry unconfigured (local dev) → 503 with a clear message; UI shows the error inline.
2. Model returns non-JSON / fenced JSON → service strips fences and validates; on failure returns 502.
3. Empty/oversized prompt → 400 before calling the model.
4. Missing/unknown `contentType` or `field` → 400.
5. Per-admin rate limiting to avoid runaway spend (in-memory, IP-based).
6. Model returns a missing locale → service fills it from `en` as a safe fallback and flags nothing.

## i18n Requirements

- [x] **N/A for UI** — admin is an internal English-only tool.
- [x] The **generated content** must include en/es/pt (that is the feature's purpose).

## Acceptance Criteria

- [ ] `POST /api/content-admin/ai/generate` returns `{en,es,pt}` for a valid admin request.
- [ ] Non-admin/anonymous callers receive 403/401.
- [ ] Localized fields in new/edit forms can be filled from a brief prompt with one click.
- [ ] Oversized/empty prompts are rejected with 400 before any model call.
- [ ] `dotnet test` and `npm test` pass; no new lint errors.

## Security Considerations

- Admin-only (SWA role rule + in-function `admin` check). Input length-capped; prompt is treated as
  untrusted (the system prompt instructs the model to ignore embedded instructions).
- Reuses server-side Foundry key; no key exposed to the browser.
- In-memory IP rate limiting (reuses `IRateLimitService`) to cap cost/abuse.
- Generated text is returned to the admin for review before it is ever persisted.

## Out of Scope

- Auto-saving generated content without review.
- Generating non-text fields (images, ratings, IDs).
- Newsletter or blog content generation.
- Streaming responses.
