# Arkade — Product Context

- **register**: product

## Product Purpose
Arkade is a real-time multiplayer Bible party game platform built for church youth nights, family gatherings, small groups, and projector-led events. One projector (or shared TV/tablet) acts as the broadcast game-show stage, one phone/laptop acts as the Host (MC) console, and up to 500 players join instantly from their phones via QR code or 4-letter room code with zero accounts required.

## Target Users & Physical Scenes
1. **Players on Phones (`/` Hub, `/join`, `/j/:code`, `/play/:code`)**: Kids, youth, and adults holding phones one-handed in a dimly lit youth hall, living room, or auditorium while glancing up at a projector screen. Needs a Sony PS5 / Switch console-grade mobile controller feel with zero-glare matte obsidian surfaces, thumb-zone action cards, and pattern-graded audio + haptic feedback.
2. **The MC / Host (`/mc`, `/mc/:code`)**: A youth leader, pastor, or game-night host standing on stage with a phone or tablet in one hand (or laptop at a podium). Needs a rock-solid, zero-scroll broadcast director deck with 1-tap phase transport (`Start`, `Pause`, `Skip`, `+15s`), live secret answer key, player moderation, and Casting Lots.
3. **The Audience / Projector View (`/screen/:code`)**: 10 to 500 people reading a projector or TV from 10–40 feet away, OR a small group viewing the shared screen on a tablet/phone. Needs adaptive broadcast staging: 1920x1080 widescreen console arena on TVs/projectors and clean vertical reflow on mobile/portrait screens.

## Brand Tone & Aesthetic Direction
- **Console Showtime OS (Sony PS5 / Switch Obsidian Edition)**: Matte obsidian-carbon surfaces (`#07080C` to `#131722`) lit by 1px specular glass rims, electric neon-emerald (`#38EC82`), solar gold (`#FFD026`), crisp white pill CTAs (`#FFFFFF`), and vibrant saturated full-bleed game cards with 3D breakout character mascots.
- **Sensory Console Feedback**: Biquad-filtered Web Audio crystal UI micro-sounds (`ui-focus`, `ui-snap`, `ui-press`, `ui-lock`, `ui-sheet`) paired with pattern-graded `navigator.vibrate` haptics and exponential spring-like choreography.
- **Mobile-First Native App & Dual PWA**: Installable as both a Player App PWA and a dedicated Host MC Console PWA with offline shell caching and console-style navigation.

## Anti-References
- No cartoon purple screens, wooden-plank chrome, or chunky 3px comic borders.
- No bare web forms dumped on a flat background.
- No programmer-art flat geometric circle SVGs posing as characters.
- No browser `window.confirm()` dialogs or unstyled native range/checkbox inputs.
- No desktop-only fixed layouts that break or require endless scrolling on mobile phones.
