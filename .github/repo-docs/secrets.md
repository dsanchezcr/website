# 🥚 Easter Eggs — Secret Features

This document lists all hidden interactive features on dsanchezcr.com.

## Configuration

All easter eggs can be toggled individually via the config file:
- **File:** `src/components/EasterEggs/easterEggConfig.js`
- Set any egg to `false` to disable it.

---

## 1. Konami Code → Space Shooter Game

| Property | Value |
|----------|-------|
| **Trigger** | Type the Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A |
| **Behavior** | Full-screen canvas space shooter with player ship, enemies, bullets, and score |
| **Exit** | Press Escape or click ✕ |
| **File** | `src/components/EasterEggs/KonamiSpaceShooter.js` |

**Test checklist:**
- [ ] Type the Konami sequence on any page — game overlay appears
- [ ] Arrow keys / WASD move the ship, Space fires bullets
- [ ] Score increments when enemies are destroyed
- [ ] Game Over screen shows on collision
- [ ] Escape key and ✕ button close the overlay

---

## 2. Secret Terminal

| Property | Value |
|----------|-------|
| **Trigger** | Navigate to `/terminal` OR press backtick (`` ` ``) on any page |
| **Behavior** | Retro green-on-black CLI terminal overlay with interactive commands |
| **Exit** | Type `exit`, press Escape, or click outside |
| **Files** | `src/components/EasterEggs/SecretTerminal.js`, `src/pages/terminal.js` |

**Supported commands:** `help`, `whoami`, `projects`, `blog`, `contact`, `clear`, `exit`

**Test checklist:**
- [ ] Press backtick key — terminal appears
- [ ] Navigate to `/terminal` — terminal appears in a layout page
- [ ] Type `help` — command list displays
- [ ] Type `whoami` — bio information shows
- [ ] Type `exit` — terminal closes
- [ ] Click outside the terminal box — closes

---

## 3. Matrix Rain

| Property | Value |
|----------|-------|
| **Trigger** | Type the word "matrix" anywhere on the page |
| **Behavior** | Green falling katakana/number rain overlay, lasts 6 seconds then fades |
| **Exit** | Auto-closes after 6 seconds, or press Escape |
| **File** | `src/components/EasterEggs/MatrixRain.js` |

**Test checklist:**
- [ ] Type "matrix" on any page — green rain appears
- [ ] Rain fades out around 4.5s and fully closes at 6s
- [ ] Page underneath is still clickable (pointer-events: none on overlay)

---

## 4. Console Easter Egg (DevTools)

| Property | Value |
|----------|-------|
| **Trigger** | Automatic on every page load |
| **Behavior** | Styled ASCII art and message in browser DevTools console |
| **File** | `src/clientModules/consoleEasterEgg.js` |

**Test checklist:**
- [ ] Open browser DevTools Console on any page
- [ ] ASCII art "dsanchezcr" appears in cyan
- [ ] Links to GitHub and LinkedIn appear in green text

---

## 5. Costa Rica Confetti

| Property | Value |
|----------|-------|
| **Trigger** | Type the word "costarica" anywhere on the page |
| **Behavior** | Confetti burst in Costa Rica flag colors (blue, white, red) for 3 seconds |
| **Exit** | Auto-stops after 3 seconds |
| **File** | `src/components/EasterEggs/CostaRicaConfetti.js` |
| **Dependency** | `canvas-confetti` npm package |

**Test checklist:**
- [ ] Type "costarica" on any page — confetti burst appears
- [ ] Blue, white, and red confetti rains from both sides
- [ ] Confetti stops after ~3 seconds

---

## 6. Microsoft Clippy

| Property | Value |
|----------|-------|
| **Trigger** | Type the word "microsoft" anywhere on the page |
| **Behavior** | A Clippy-style 📎 assistant pops up in the bottom-left with a funny message |
| **Exit** | Click ✕, auto-closes after 10 seconds, or press Escape |
| **File** | `src/components/EasterEggs/ClippyAssistant.js` |

**Test checklist:**
- [ ] Type "microsoft" on any page — Clippy appears
- [ ] Click the 📎 emoji — cycles through different funny messages
- [ ] Click ✕ — Clippy dismisses
- [ ] Auto-dismisses after 10 seconds

---

## 7. Birthday Egg

| Property | Value |
|----------|-------|
| **Trigger** | Visit the website on January 10th |
| **Behavior** | Floating emoji particles + birthday celebration banner |
| **Exit** | Click "Thanks! 🎈" button |
| **File** | `src/components/EasterEggs/BirthdayEgg.js` |

**Test checklist:**
- [ ] On January 10th, open any page — celebration appears
- [ ] Emojis float upward (🎂🎈🎉🎊🥳🎁)
- [ ] Banner shows "Happy Birthday David!"
- [ ] Click dismiss button — celebration closes
- [ ] Only shows once per session (sessionStorage)

---

## 8. Flappy Bird Clone

| Property | Value |
|----------|-------|
| **Trigger** | Type the word "flappy" anywhere on the page |
| **Behavior** | Flappy Bird-style game using the site's logo.png as the bird |
| **Exit** | Press Escape or click ✕ |
| **File** | `src/components/EasterEggs/FlappyBird.js` |

**Test checklist:**
- [ ] Type "flappy" on any page — game overlay appears
- [ ] Space bar or click to flap/jump
- [ ] Pipes scroll from right to left
- [ ] Score increments when passing pipes
- [ ] Game Over shows on collision; Space/click to retry
- [ ] Site logo appears as the bird sprite

---

## 9. Snake Game

| Property | Value |
|----------|-------|
| **Trigger** | Type the word "snake" anywhere on the page |
| **Behavior** | Classic Snake game with grid, food pellets, and score counter |
| **Exit** | Press Escape or click ✕ |
| **File** | `src/components/EasterEggs/SnakeGame.js` |

**Test checklist:**
- [ ] Type "snake" on any page — game overlay appears
- [ ] Arrow keys or WASD to control direction
- [ ] Eating food grows the snake and adds 10 points
- [ ] Wall or self collision triggers Game Over
- [ ] Space to restart after Game Over
- [ ] Score is NOT persisted (resets each game)

---

## 10. Dog on Cursor

| Property | Value |
|----------|-------|
| **Trigger** | Type the word "dogs" anywhere on the page |
| **Behavior** | A pixel ASCII-art dog follows the mouse cursor around the page |
| **Exit** | Click "🐕 Dismiss dog" button |
| **File** | `src/components/EasterEggs/DogOnCursor.js` |

**Test checklist:**
- [ ] Type "dogs" on any page — dog appears near cursor
- [ ] Dog smoothly follows mouse movements with a slight lag
- [ ] Dog flips direction based on movement
- [ ] Dog animates between frames when moving
- [ ] "Dismiss dog" button in bottom-right corner closes it
- [ ] On touch-only devices, dog does not appear (graceful skip)

---

## Architecture

| File | Purpose |
|------|---------|
| `src/components/EasterEggs/easterEggConfig.js` | Toggle flags for each egg |
| `src/components/EasterEggs/EasterEggManager.js` | Global keyboard listener, activates eggs |
| `src/theme/Root.js` | Mounts EasterEggManager in Docusaurus layout |
| `src/clientModules/consoleEasterEgg.js` | Console message (loaded via clientModules) |
| `src/pages/terminal.js` | `/terminal` route for SecretTerminal |

### How to disable all easter eggs

Set all values to `false` in `easterEggConfig.js`, or remove the `<EasterEggManager />` from `src/theme/Root.js`.

### npm dependencies added

- `canvas-confetti` — for the Costa Rica Confetti effect (egg #5)
