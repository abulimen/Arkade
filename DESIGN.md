# Arkade — Design System (Console Showtime OS)

## 1. Color & Atmospheric Tokens
- **Matte Obsidian Stage Surfaces**:
  - `--bg-abyss`: `#07080C` (deepest console void)
  - `--night`: `#0C0E14` (primary obsidian canvas, WCAG AA verified)
  - `--night-2`: `#131722` (elevated carbon card surface)
  - `--night-3`: `#1C2230` (interactive pill / control surface)
  - `--glass-surface`: `rgba(19, 23, 34, 0.84)` with `1px` specular top-edge rim `rgba(255, 255, 255, 0.10)`
- **Text & Ink**:
  - `--cloud`: `#F2F5FA` (cool high-contrast off-white body text)
  - `--white`: `#FFFFFF` (high-emphasis console headings, pill CTAs & numerals)
- **Console Accents & Game Card Gradients**:
  - `--ark-gold`: `#FFD026` (Solar Gold CTA, spotlight crown, active code chamber)
  - `--leaf`: `#38EC82` (Neon Emerald console CTA, podium top bevel, *What Came First?* signature)
  - `--sky`: `#29C5FF` (Focus ring, *Fake Verse* signature & telemetry accent)
  - `--coral`: `#FF5C6C` (*Spot the Wolf* signature & danger accent)
  - `--tangerine`: `#FF9A3D` (*Gideon's 300* torchlight accent)
  - `--indigo`: `#5856D6` / `--violet`: `#B56BFF` (*Who Am I?* mystery signature)
  - `--plank`: `#E2A83B` / `--plank-dark`: `#B8821E` (Bronze/amber medallion & badge highlights)

## 2. Typography
- **Display & UI (`--font-display`)**: `"Fredoka"`, bundled geometric rounded display face (`400`–`700`) with tight display tracking and tabular numerals.
- **Scripture & Story (`--font-verse`)**: `"Source Serif 4"`, editorial serif (`400` normal & italic) for KJV Bible verses and historical clues.

## 3. Elevation, Materiality & Tactile Controls
- **Console Pill & Action Cards**: `1px`–`2px` specular borders (`rgba(255, 255, 255, 0.12)`), radial studio lighting, soft atmospheric drop shadows (`0 20px 50px -12px rgba(0,0,0,0.75)`), and spring-like `cubic-bezier(0.16, 1, 0.3, 1)` transitions.
- **3D Fanned Cards & Pop-Out Mascots**: Saturated dual-stop vertical gradients on game showcase cards with mascots breaking past the card silhouette.
- **3D Neon-Bevel Monolith Podium**: Dark emerald-obsidian podium blocks (`#09161A`–`#102A2E`) topped with glowing neon-emerald perspective bevels, crowned avatars, and ranked league leaderboard strips.

## 4. Sensory Feedback (Audio + Haptics)
- **PS5-Style Web Audio Synth (`src/client/sound.ts`)**: Dual-layer Web Audio synthesizer with biquad-filtered crystal UI micro-sounds (`ui-focus`, `ui-snap`, `ui-press`, `ui-back`, `ui-sheet`, `ui-lock`, `ui-error`) plus multi-voice projector broadcast cues.
- **Pattern-Graded Haptics (`src/client/hooks.ts`)**: `navigator.vibrate` pulse patterns matched to carousel snaps, card locks, turn alerts, and errors, controlled via a persistent header sensory toggle.

## 5. App Shell & Responsive Architecture
- **Landing Hub (`/`)**: Desktop switches to a full-stage obsidian console dashboard with a 5-card 3D fanned perspective deck + slide-over game detail drawer; Mobile switches to a Switch/PS5 companion feed with a horizontal pop-out card carousel and live Ability/Skill spotlight panel.
- **Player Controller (`/play/:code`)**: Full-bleed `100dvh` Battleground controller with compact glass HUD, segmented energy-bar pips, 2×2 tactile attack cards, and a biometric vertical scanner card.
- **Host MC Console (`/mc`, `/mc/:code`)**: Tournament/VS Mode room builder + Sony Broadcast Director Console with sticky telemetry, transport triggers, and custom confirmation sheets.
- **Projector Screen (`/screen/:code`)**: 1920x1080 console arena on landscape desktops/TVs with 3D monolith podium and League leaderboard dock; vertical responsive reflow on phones.
