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

Monthly posts use decreasing `sidebar_position` values (for example, April 2026 = `999`, then newer entries use lower values such as `998`) so newer months sort to the top.

## Edge Cases

1. **Invalid videoId** — component returns `null` rather than embedding a malformed URL.
2. **Missing trailer** — agent instructions include a placeholder pattern with a `TODO` comment.
3. **New month creation** — agent instructions document the exact file paths and `sidebar_position` decrement pattern.

## i18n Requirements

- [x] Category labels translated in all 3 locales via `_category_.json` files
- [x] Full MDX content translated in ES and PT
- [x] Agent instructions specify translation guidelines for each locale
- [x] Game titles kept in original language (not translated)
- [x] `YouTubeEmbed` `title` prop localized for accessibility (e.g., "Tráiler de ..." in ES, "Trailer de ..." in PT)

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

## November 2026 Content Update

Use the current Cosmos-backed monthly format: one `meta` document and exactly
three `upcoming` documents in `scripts/monthly-updates/2026-11.json`, with thin
MDX shells rendering `ApiMonthlyReleases` for `month="2026-11"`.

### Content and Sources

- **The Legend of Zelda: Ocarina of Time**: interpret the requested "Zelda" as the
  November 5 Nintendo Switch 2 release described by
  [Nintendo](https://www.nintendo.com/ph/news/article/3Uvp2H1iPLLLSnR4MJgmq1).
  Use the supplied trailer ID `rz1B4B2yBZY`.
- **Don Memo**: the [Steam listing](https://store.steampowered.com/app/3934180/Don_Memo/)
  announces November 6, 2026 for PC. Describe its Costa Rican setting and
  development, and the owner's stated support, NPC appearance, credits mention,
  and pride in contributing. Use the supplied trailer ID `6qUMXhnnSrQ`, matched
  to Bear Sneeze's "Don Memo - Trailer Oficial".
- **Grand Theft Auto VI**: [Rockstar's announcement](https://www.rockstargames.com/newswire/article/5171972o3ak5oa/pre-order-grand-theft-auto-vi-on-june-25)
  gives November 19 for PlayStation 5 and Xbox Series X|S. Use the supplied
  trailer ID `8v8eDMh1o3g`.

Sources checked November 3, 2026. Direct YouTube metadata retrieval was unavailable;
the Zelda and GTA video titles could not be independently matched. Preserve the
user's game-to-video mapping without claiming these embeds are official trailers.
Phrase launch dates as scheduled, not guaranteed.

### Affected Files

- `scripts/monthly-updates/2026-11.json`: import-ready Cosmos document array.
- `gaming/monthly-updates/november-2026.mdx`: English shell.
- `i18n/es/docusaurus-plugin-content-docs-gaming/current/monthly-updates/november-2026.mdx`: Spanish shell.
- `i18n/pt/docusaurus-plugin-content-docs-gaming/current/monthly-updates/november-2026.mdx`: Portuguese shell.

### Acceptance Criteria

- Exactly three games with the supplied video IDs; no event or playing sections.
- One `meta` document at order `0`, followed by unique game orders `1` through `3`.
- All localized titles, descriptions, trailer labels, and intro text include
  nonempty `en`, `es`, and `pt` strings; game titles remain untranslated.
- Intro humor suggests other releases might be avoiding GTA 6, without presenting
  that joke as a factual claim about publishers' scheduling.
- Don Memo's description includes the personal story in all three languages.
- The shells share `sidebar_position: 992`, the November partition, and localized
  comments prompts. The hub intro and each shell intro match.
- No fabricated hero image URL or unrequested image generation.
- Validate the JSON shape, locale parity, video IDs, and production MDX build.

### Publishing

The seed file is not imported by the site build. After deployment, upload the JSON
array through Cosmos Data Explorer to `content-monthly-updates` (partition key
`/month`), or save each document through `/admin` → Monthly Updates using the raw
JSON editor. Review existing `2026-11` documents before writing to avoid replacing
curated content.

The importer mentioned in the agent guide is not implemented in this checkout.
Use local read-only validation for this content change; do not add import tooling,
modify older months, or write to Cosmos without an explicit import request.
