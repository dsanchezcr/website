# Gaming Content Specification Template

> Copy this template when adding new games, platforms, or gaming section features.

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | GAME-XXX |
| **Type** | New Game / New Platform / Feature |
| **Platform** | Xbox / PlayStation / Nintendo Switch / Meta Quest / Phone-Mobile / Board Games / Chess |
| **Date** | _YYYY-MM-DD_ |
| **Status** | Draft / In Review / Approved / Implemented |

## Content Details

### New Game Entry (if adding a game)

| Field | Value |
|-------|-------|
| **Title** | _Game title_ |
| **Platform** | _Platform name_ |
| **Status** | `completed` / `playing` / `backlog` / `dropped` |
| **Recommendation** | _Emoji + short text (e.g., "⭐ Highly recommended")_ |
| **Image** | _Filename for `static/img/gaming/<platform>/`_ |
| **Entry Type** | `card` / `group` |

### JSON Entry Shape

- `card` entry:
	- `{"type":"card","title":"...","platform":"...","status":"...","imageUrl":"https://dsanchezcrwebsite.blob.core.windows.net/images/gaming/...","recommendation":{"en":"...","es":"...","pt":"..."},"url":"...","coOp":true,"online":false}`
- `group` entry:
	- `{"type":"group","title":{"en":"...","es":"...","pt":"..."},"platform":"...","status":"...","recommendation":{"en":"...","es":"...","pt":"..."},"games":[{...cardProps}]}`

### New Platform (if adding a platform)

| Field | Value |
|-------|-------|
| **Platform Name** | _Name_ |
| **Platform Slug** | _URL-friendly slug_ |
| **Platform Color** | _Hex color for badge_ |

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/data/gaming/<platform>.json` | Modify | Add or update platform game entries |
| `gaming/<platform>/index.mdx` | Modify | Update sections/layout only when needed (data remains in JSON) |
| `i18n/es/docusaurus-plugin-content-docs-gaming/current/<platform>/index.mdx` | Modify | Spanish translation |
| `i18n/pt/docusaurus-plugin-content-docs-gaming/current/<platform>/index.mdx` | Modify | Portuguese translation |
| `static/img/gaming/<platform>/<image>.jpg` | Create | Game cover image |
| `src/components/Gaming/gameCardConstants.js` | Modify | Only if adding new platform |

## i18n Checklist

- [ ] If user-facing page copy changes, translations are updated in all 3 languages
- [ ] `gaming/<platform>/index.mdx`, `i18n/es/.../gaming/...`, and `i18n/pt/.../gaming/...` use the same JSON-driven renderer structure
- [ ] JSON data entries use canonical status values and do not localize status tokens
- [ ] Status value uses one of: `completed`, `playing`, `backlog`, `dropped`

## Image Requirements

- [ ] Image placed in `static/img/gaming/<platform>/`
- [ ] Filename follows slug convention (lowercase, hyphens)
- [ ] Reasonable file size (< 500KB)
- [ ] JPG or WebP format preferred
