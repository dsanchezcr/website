# Feature Specification: 404 Memory Reboot

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-026 |
| **Title** | Playable 404 page |
| **Author** | GitHub Copilot |
| **Date** | 2026-11-03 |
| **Status** | Implemented |
| **Related ADR** | N/A - existing static React architecture |

## Problem Statement

A missing page is a dead end. Offer a short, optional game that makes getting lost
enjoyable without hiding the error or preventing visitors from returning home.

## Expected Behavior

The 404 page clearly identifies the missing page, offers home/blog links, and
contains **Memory Reboot**, a twelve-card game with six pairs of code symbols.
Start shuffles a new board. Select two cards using touch, mouse, or Tab and
Enter/Space. Matching pairs stay revealed; mismatches stay visible until the next
selection, allowing everyone to read them without a timer. Finish all six pairs
and replay with a fresh board.

Each match earns 100 points plus 25 for each preceding consecutive match.
Mismatches reset the streak. Display score, completed moves, pairs, and the best
completed-round score (maximum 975). Persist only the personal best in this
browser; no account, leaderboard, API, or game analytics.

## Constraints

- All visible text and accessible names support English, Spanish, and Portuguese.
- Preserve Docusaurus NotFound metadata, layout, and routing; mark the error page noindex.
- No dependencies, external images, Azure resources, global keyboard listeners,
  animations requiring a render loop, or forced time limits.
- Responsive layout, visible keyboard focus, non-color-only card states,
  polite status announcements, and reduced-motion support.
- No random boards or browser-storage access during static rendering.

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `src/theme/NotFound/Content/index.js` | Create | Replace default 404 content while retaining the Docusaurus wrapper |
| `src/components/NotFoundGame/index.js` | Create | Page content, game controls, score persistence and focus handling |
| `src/components/NotFoundGame/game.js` | Create | Pure shuffle and game-state rules |
| `src/components/NotFoundGame/translations.js` | Create | Shared en/es/pt copy, including accessible card labels |
| `src/components/NotFoundGame/styles.module.css` | Create | Responsive, theme-aware game presentation |
| `src/components/NotFoundGame/__tests__/*.test.*` | Create | Deterministic game, storage, locale and interaction coverage |
| `src/__tests__/mocks/Head.js`, `vitest.config.mjs` | Create / Modify | Resolve Docusaurus Head in integration tests |
| `tests/e2e/not-found.spec.js` | Create | Real 404 routes, keyboard/touch, replay and persistence |
| `src/pages/privacy.mdx` | Modify | Explain browser-only best-score storage |
| `i18n/{es,pt}/docusaurus-plugin-content-pages/privacy.mdx` | Modify | Translate storage disclosure |
| `.specify/memory/decisions.md` | Modify | Record integration and gameplay decisions |

### Component Design

Override `@theme/NotFound/Content`, not `src/pages/404`, so both generated
`404.html` and unmatched client routes use the game. Use the existing locale hook,
with a narrowly scoped URL-prefix override on this page: SWA may deliver the
English fallback document for a missing `/es/` or `/pt/` URL. Apply that override
after hydration to keep static markup consistent. Recovery links use native anchors
with explicit locale paths so navigation loads the correct locale application,
instead of routing a Spanish/Portuguese destination inside the English fallback.
The game component receives the resolved locale.

Use native buttons and a reducer for atomic selection, matching, scoring, and
restart. Matched cards remain readable but cannot score again. Focus the first
card on start/restart and the replay button on completion.

### Data Model and API

No API changes. State contains shuffled card symbols, selected indices, matched
indices, moves, streak, score and the latest result. Local storage key
`dsanchezcr.404-memory.best.v1` contains one integer from 0 through 975. Validate
stored values; malformed data and storage failures produce a localized notice
without disabling gameplay. Save only completed rounds, never lower a valid best,
and read the existing best again before writing.

## Edge Cases

1. Repeated clicks on one card or a matched card must not count as a move.
2. Rapid input must not reveal extra cards or award points twice.
3. Restart during a mismatch resets all round state, not the personal best.
4. Storage may be denied, corrupt, or full: show an explicit notice and retain an
   in-memory best for the visit.
5. Unknown locales fall back to English; locale-prefixed missing routes still
   show localized game content when served through the root fallback.
6. Without JavaScript, the missing-page message and navigation remain usable.
7. Page navigation requires no game timer, event-listener, or animation cleanup.

## i18n Requirements

- Inline en/es/pt translation dictionaries cover the game and 404 copy.
- Privacy disclosures are mirrored in the existing translated MDX pages.
- Screen-reader card names identify position, concealed/revealed/matched state,
  and revealed symbol; concealed names must not reveal the answer.

## Acceptance Criteria

- [x] Generated 404 pages and unmatched routes display the game and recovery links.
- [x] Every new board has exactly two of each of six symbols.
- [x] Matches, mismatch persistence, streak bonuses, moves and replay follow the rules.
- [x] A perfect six-move round scores 975 and cannot score further.
- [x] Best completed score survives reload; lower/incomplete games do not overwrite it.
- [x] Missing, malformed and inaccessible storage are handled explicitly and safely.
- [x] All copy, status updates and navigation work in en/es/pt, including SWA fallback URLs.
- [x] Keyboard and touch play work; mobile layout does not overflow.
- [x] Static build succeeds in all locales and behavior tests pass.

## Security Considerations

Only a bounded numeric score is stored locally. No user identifiers, inputs sent
to servers, new analytics events, or trusted competitive rankings. Browser-edited
scores are not authoritative. No new public API or authentication surface.

## Out of Scope

Global leaderboards, cross-device sync, timed difficulty modes, sounds, game
telemetry, new backend resources, and unrelated changes to existing easter eggs.

## Review

Reviewed against the constitution before implementation: static-first, existing
React/Docusaurus boundaries, complete i18n, measurable scoring and accessibility
criteria, no new services. Approved for implementation.

## Verification

- 39 focused Vitest cases cover rules, static rendering, translations, storage,
  focus, restarting, completed-round scoring and locale fallback.
- All 377 frontend tests passed.
- All five Playwright cases passed against the production build: generated and
  missing URLs in all locales, real home/blog recovery, keyboard completion and
  reload persistence, 320px touch targets, both themes, and reduced motion.
- `npm run build` generated all three locales successfully; `git diff --check`
  passed. Desktop and narrow-screen layouts were also visually inspected.
