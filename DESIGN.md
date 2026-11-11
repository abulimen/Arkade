# Arkade — Design System (Warm Arcade Showtime)

## 1. Color & Atmospheric Tokens
- **Stage Surfaces**:
  - `--bg-abyss`: `#0B0A1A` (deepest outer stage canvas)
  - `--night`: `#14123B` (primary app canvas, WCAG AA verified)
  - `--night-2`: `#1E1B55` (elevated card surface)
  - `--night-3`: `#2A2670` (interactive control surface / pill background)
  - `--glass-surface`: `rgba(30, 27, 85, 0.78)` with subtle top-edge highlight `rgba(255, 255, 255, 0.12)`
- **Text & Ink**:
  - `--cloud`: `#F4F1FF` (warm off-white body text)
  - `--white`: `#FFFFFF` (high-emphasis headings & numerals)
- **Showtime Accents & Game Signatures**:
  - `--ark-gold`: `#FFC83D` (Primary CTA, spotlight accent, podium gold)
  - `--plank`: `#C98A4B` / `--plank-dark`: `#A9692F` (Warm timber badges & stage banners)
  - `--coral`: `#FF5C6C` (*Spot the Wolf* signature & danger accent)
  - `--tangerine`: `#FF9A3D` (*Fake Verse* & *Gideon's 300* torchlight accent)
  - `--leaf`: `#3DD68C` (*What Came First?* signature & positive score accent)
  - `--sky`: `#3DB8FF` (Focus ring, ocean wave & info accent)
  - `--indigo`: `#6C5CE7` / `--violet`: `#B15CFF` (*Who Am I?* mystery signature)

## 2. Typography
- **Display & UI (`--font-display`)**: `"Fredoka"`, rounded, high-legibility game-show display face (`500` medium for UI, `600` semibold for headings/buttons).
- **Scripture & Story (`--font-verse`)**: `"Source Serif 4"`, editorial serif (`400` normal & italic) for KJV Bible verses and historical clues.

## 3. Elevation, Borders & Tactile Controls
- **3D Arcade Buttons**: `3px` solid `#14123B` border, top inner specular highlight (`inset 0 2px 0 rgba(255,255,255,0.28)`), and chunky bottom shadow (`0 6px 0 rgba(8, 6, 22, 0.55)`), depressing `translateY(4px)` on active tap.
- **Game Cards & Panels**: Layered radial glow backdrops matching each game's signature color, `24px–28px` border radius, crisp `2px–3px` framing.

## 4. App Shell & Responsive Architecture
- **Browse & Setup Shell (`/`, `/join`, `/mc`)**: Sticky top glass header + mobile bottom navigation bar (`Home`, `Join`, `Games`, `Host MC`) with safe-area padding; desktop switches to a top studio navigation bar.
- **Player Controller (`/play/:code`)**: Full-bleed `100dvh` mobile app controller with compact top glass HUD, scrollable center stage, and thumb-zone action dock.
- **Host MC Console (`/mc/:code`)**: Sticky top transport deck (`Start/Pause/Skip/+15s`) + segmented mobile tabs (`Stage`, `Players`, `Lots & Audio`, `Projector`) and custom confirmation bottom sheets.
- **Projector Screen (`/screen/:code`)**: 1920x1080 broadcast stage on landscape desktops/TVs (`>= 960px`) with fullscreen/sound controls; vertical responsive reflow on phones and portrait tablets.
