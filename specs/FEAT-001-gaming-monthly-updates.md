# Feature Specification: Gaming Monthly Updates

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-001 |
| **Title** | Gaming Monthly Updates section |
| **Author** | @dsanchezcr |
| **Date** | 2026-04-03 |
| **Status** | Implemented |
| **Related ADR** | — |

## Problem Statement

The gaming section of the site needed a dedicated area for monthly roundup posts covering upcoming releases, trailers, and announcements. Without a structured section and a reusable component for video embeds, adding these recurring posts would require duplicating verbose iframe markup in every locale file.

## Expected Behavior

- A **Gaming → Monthly Updates** subsection appears in the sidebar, localized in English, Spanish, and Portuguese.
- Each monthly post (e.g., `april-2026.mdx`) is written once per locale with trailers embedded via a reusable `YouTubeEmbed` component.
- A Copilot agent (`gaming-monthly-updates`) can draft new monthly posts based on the established template.

## Constraints

- [x] Must support i18n (en/es/pt)
- [x] Must work with existing Docusaurus build
- [x] Must not require new Azure resources
- [x] Sidebar uses `generated-index` via `_category_.json` (no manual `index.mdx` needed)
- [x] YouTube embeds must use `youtube-nocookie.com` and `loading="lazy"`
- [x] `videoId` must be validated before interpolation into embed URL

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `gaming/monthly-updates/_category_.json` | Create | Sidebar category (generated-index, sidebar_position 2) |
| `gaming/monthly-updates/april-2026.mdx` | Create | First monthly update post in English |
| `i18n/es/docusaurus-plugin-content-docs-gaming/current/monthly-updates/_category_.json` | Create | Localized category label in Spanish |
| `i18n/es/docusaurus-plugin-content-docs-gaming/current/monthly-updates/april-2026.mdx` | Create | April 2026 post in Spanish |
| `i18n/pt/docusaurus-plugin-content-docs-gaming/current/monthly-updates/_category_.json` | Create | Localized category label in Portuguese |
| `i18n/pt/docusaurus-plugin-content-docs-gaming/current/monthly-updates/april-2026.mdx` | Create | April 2026 post in Portuguese |
| `src/components/YouTubeEmbed/index.js` | Create | Reusable responsive YouTube embed component |
| `src/components/YouTubeEmbed/YouTubeEmbed.module.css` | Create | CSS module for 16:9 responsive wrapper |
| `.github/agents/gaming-monthly-updates.agent.md` | Create | Copilot agent for drafting monthly posts |

### Component Design

**`YouTubeEmbed`** (`src/components/YouTubeEmbed/`):
- Props: `videoId` (string, YouTube video ID), `title` (string, iframe title for accessibility)
- Validates `videoId` against `/^[a-zA-Z0-9_-]{11}$/` before rendering — returns `null` (with a dev-mode `console.warn`) for invalid IDs
- Renders a responsive 16:9 `<div>` wrapper with an `<iframe>` using `youtube-nocookie.com`
- Sets `loading="lazy"` on the iframe to avoid eagerly loading multiple videos

Usage:
```jsx
import YouTubeEmbed from '@site/src/components/YouTubeEmbed';
<YouTubeEmbed videoId="qpcreDiiVhs" title="Darwin's Paradox! Trailer" />
```

### Sidebar Ordering

Monthly posts use descending `sidebar_position` values (April 2026 = `999`) so newer months sort to the top as lower positions are assigned to newer entries.

## Edge Cases

1. **Invalid videoId** — component returns `null` rather than embedding a malformed URL.
2. **Missing trailer** — agent instructions include a placeholder pattern with a `TODO` comment.
3. **New month creation** — agent instructions document the exact file paths and `sidebar_position` decrement pattern.

## i18n Requirements

- [x] Category labels translated in all 3 locales via `_category_.json` files
- [x] Full MDX content translated in ES and PT
- [x] Agent instructions specify translation guidelines for each locale
- [x] Game titles kept in original language (not translated)

## Acceptance Criteria

- [x] Gaming sidebar shows "📰 Monthly Updates" (EN), "📰 Actualizaciones Mensuales" (ES), "📰 Atualizações Mensais" (PT)
- [x] April 2026 post renders in all 3 locales with 5 trailer embeds
- [x] All trailers load lazily (not on initial page load)
- [x] Invalid `videoId` values do not produce broken iframes
- [x] Docusaurus production build succeeds for all 3 locales
- [x] No new lint errors

## Security Considerations

- `videoId` is validated against a strict 11-character allowlist pattern (`[a-zA-Z0-9_-]{11}`, matching the exact YouTube video ID format) before interpolation into the iframe `src` URL, preventing URL injection. A `console.warn` is emitted in development mode for easier debugging.

## Out of Scope

- Automated fetching of release dates or trailer URLs from external APIs
- Comments/discussion per individual monthly post (uses the shared Giscus discussion)
- Video thumbnails or preview images in the post
