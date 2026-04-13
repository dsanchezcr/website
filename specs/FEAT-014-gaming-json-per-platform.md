# Gaming Platform Data Migration to JSON

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-014 |
| **Title** | Gaming platform pages backed by per-platform JSON files |
| **Author** | GitHub Copilot |
| **Date** | 2026-04-13 |
| **Status** | Approved |
| **Related ADR** | N/A |

## Problem Statement

Gaming platform docs currently hardcode many `GameCard` and `GameCardGroup` entries directly in MDX pages. This makes content updates noisy and inconsistent with the data-driven model already used by movies, series, and theme parks.

## Expected Behavior

Gaming pages keep the same visual layout and components while sourcing game entries from a dedicated JSON file per platform.

## Constraints

- [x] Must support i18n (en/es/pt)
- [x] Must work with existing Docusaurus build
- [x] Must not require new Azure resources
- [x] Must preserve existing look and feel

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/Gaming/GamingEntriesRenderer.js` | Create | Reusable renderer for mixed card/group entries |
| `src/data/gaming/*.json` | Create | One JSON file per gaming platform |
| `gaming/*/index.mdx` | Modify | Replace hardcoded entries with renderer + JSON imports |
| `i18n/es/docusaurus-plugin-content-docs-gaming/current/*/index.mdx` | Modify | Keep locale pages aligned with shared data strategy |
| `i18n/pt/docusaurus-plugin-content-docs-gaming/current/*/index.mdx` | Modify | Keep locale pages aligned with shared data strategy |

### Component Design

Add `GamingEntriesRenderer` with prop `items` where each item is either:
- `{"type":"card", ...GameCardProps}`
- `{"type":"group", ...GameCardGroupProps, "games":[...GameCardProps]}`

Renderer maps entries to existing `GameCard` and `GameCardGroup` components.

### Data Model

Per-platform JSON object shape:

```json
{
  "anticipated": [
    { "type": "card", "title": "..." }
  ],
  "topGames": [
    { "type": "group", "title": "...", "games": [{ "title": "..." }] }
  ],
  "games": [
    { "type": "card", "title": "..." }
  ],
  "switch2": [
    { "type": "card", "title": "..." }
  ],
  "switch": [
    { "type": "card", "title": "..." }
  ],
  "strategy": [],
  "party": []
}
```

Only keys needed by each platform are included.

## Edge Cases

1. Entries with optional flags (`coOp`, `online`) must render badges exactly as before.
2. Group items with mixed `platform` values (e.g., Xbox page includes PC groups) must preserve per-item platform labels.
3. Items missing `status` or `recommendation` must still render correctly.

## i18n Requirements

- [x] New user-facing text has translations in all 3 locales (no new visible text introduced)
- [x] Translated content files remain aligned in `i18n/es/` and `i18n/pt/`
- [x] Existing locale behavior preserved

## Acceptance Criteria

- [ ] Each gaming platform has one JSON source file in `src/data/gaming/`
- [ ] Platform MDX pages render via JSON-backed renderer, no hardcoded `GameCard` entries remain
- [ ] Existing layout and visuals remain unchanged
- [ ] `npm run build` completes successfully
- [ ] No new lint/build errors

## Security Considerations

No new external inputs or APIs are introduced. Static data only.

## Out of Scope

- Changing game card visual design
- Changing copy/text content
- Altering non-gaming sections
