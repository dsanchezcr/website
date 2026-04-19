# Feature Specification: Easter Eggs System

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-010 |
| **Title** | Interactive Easter Eggs |
| **Author** | David Sanchez |
| **Date** | 2026-04-19 |
| **Status** | Implemented |
| **Related ADR** | N/A |

## Problem Statement

The website lacks playful, interactive surprises that reward curious visitors. Adding hidden easter eggs increases engagement, showcases technical creativity, and gives the site personality.

## Expected Behavior

Users can discover hidden interactive features through specific keyboard sequences, navigation, or click patterns. Each easter egg is self-contained, non-intrusive, and can be individually toggled off.

### Easter Egg Triggers

| # | Name | Trigger | Behavior |
|---|------|---------|----------|
| 1 | Space Shooter | Konami Code (↑↑↓↓←→←→BA) | Full-screen canvas space shooter game |
| 2 | Secret Terminal | Backtick key or `/terminal` route | Retro CLI with interactive commands |
| 3 | Matrix Rain | Type "matrix" | Green katakana rain (6s auto-close) |
| 4 | Console Message | Automatic (DevTools) | ASCII art + links in browser console |
| 5 | Costa Rica Confetti | 5 rapid footer clicks | Flag-colored confetti burst (3s) |
| 6 | Clippy | Type "microsoft" | Clippy assistant with jokes (bottom-left) |
| 7 | Birthday | Visit on January 10th | Floating emojis + celebration banner |
| 8 | Flappy Bird | Type "flappy" | Flappy Bird clone with site logo |
| 9 | Snake | Type "snake" | Classic Snake game |
| 10 | Dog Companion | Type "dogs" | ASCII dog follows mouse cursor |

### Exit behavior
- All overlays: Escape key or close button (✕)
- Matrix Rain: auto-closes after 6 seconds
- Clippy: auto-closes after 10 seconds
- Confetti: auto-stops after 3 seconds

## Constraints

- [x] Must support i18n (en/es/pt)
- [x] Must work with existing Docusaurus build
- [x] Must not require new Azure resources
- [x] Must be non-intrusive (no effect on normal page behavior)
- [x] Must be mobile-aware (skip or adapt on touch-only devices)
- [x] Must be individually toggleable via config
- [x] No external game libraries (vanilla canvas + React only)

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/EasterEggs/easterEggConfig.js` | Create | Toggle flags for each egg |
| `src/components/EasterEggs/EasterEggManager.js` | Create | Global keyboard listener hub |
| `src/components/EasterEggs/KonamiSpaceShooter.js` | Create | Space shooter game |
| `src/components/EasterEggs/SecretTerminal.js` | Create | Retro CLI terminal |
| `src/components/EasterEggs/MatrixRain.js` | Create | Matrix rain animation |
| `src/components/EasterEggs/ClippyAssistant.js` | Create | Clippy popup with i18n jokes |
| `src/components/EasterEggs/BirthdayEgg.js` | Create | Birthday celebration |
| `src/components/EasterEggs/FlappyBird.js` | Create | Flappy Bird game |
| `src/components/EasterEggs/SnakeGame.js` | Create | Snake game |
| `src/components/EasterEggs/DogOnCursor.js` | Create | Dog cursor follower |
| `src/components/EasterEggs/CostaRicaConfetti.js` | Create | Confetti effect |
| `src/theme/Root.js` | Create | Mount EasterEggManager globally |
| `src/clientModules/consoleEasterEgg.js` | Create | Console ASCII art message |
| `src/pages/terminal.js` | Create | `/terminal` route |
| `src/pages/secrets.js` | Create | `/secrets` documentation page |
| `docusaurus.config.js` | Modify | Add consoleEasterEgg to clientModules |
| `package.json` | Modify | Add canvas-confetti dependency |

### Component Design

**EasterEggManager** — mounted in Root.js, listens to global keydown events:
- Uses `useRef` for key buffer (avoids re-renders)
- Skips pattern detection when an egg is active or event is `defaultPrevented`
- Only processes Escape key while an egg is active

**Game components** (Space Shooter, Flappy Bird, Snake):
- Pure HTML5 Canvas rendering
- Localized canvas text via `gameStrings` objects
- `preventDefault` on consumed keys to prevent page scroll

**DogOnCursor** — uses direct DOM style manipulation via refs (avoids RAF → setState re-render churn)

**CostaRicaConfetti** — `inProgressRef` guard prevents overlapping RAF loops on rapid re-triggers

## Edge Cases

1. User triggers easter egg while typing in input/textarea → ignored (tagName check)
2. Multiple rapid confetti triggers → only one loop runs at a time
3. Page navigation during animation → RAF cancelled in useEffect cleanup
4. Touch-only device → DogOnCursor returns null
5. Birthday egg → only shows once per session (sessionStorage)
6. `/terminal` Escape key → SecretTerminal has its own Escape listener

## i18n Requirements

- [x] New user-facing text has translations in all 3 locales
- [x] Canvas game text localized (GAME OVER, Score, retry prompts)
- [x] Terminal commands and messages localized
- [x] Clippy jokes translated (en/es/pt)
- [x] Birthday banner text translated
- [x] DogOnCursor dismiss button translated
- [x] All aria-labels localized
- [x] `/secrets` page fully translated (inline translations pattern)
- [x] Console message is English-only (DevTools, developer-facing)

## Acceptance Criteria

- [x] All 10 easter eggs activate via documented triggers
- [x] Each egg can be disabled individually in easterEggConfig.js
- [x] Escape key closes any active overlay
- [x] Key events ignored when typing in inputs
- [x] Pattern detection skipped while an egg is active
- [x] Games prevent default on consumed keys (no page scroll)
- [x] All user-facing text supports en/es/pt
- [x] `/secrets` page renders with card-based layout
- [x] `/terminal` route works with Escape close
- [x] Console message displays on page load
- [x] Build passes for all 3 locales
- [x] Unit tests cover EasterEggManager key logic
- [x] No new lint errors

## Dependencies

- `canvas-confetti` ^1.9.4 — for Costa Rica Confetti effect
