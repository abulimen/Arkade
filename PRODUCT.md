# Arkade — Product Context

- **register**: product

## Product Purpose
Arkade is a real-time multiplayer Bible party game platform built for church youth nights, family gatherings, small groups, and projector-led events. One projector (or shared TV/tablet) acts as the broadcast game-show stage, one phone/laptop acts as the Host (MC) console, and up to 500 players join instantly from their phones via QR code or 4-letter room code with zero accounts required.

## Target Users & Physical Scenes
1. **Players on Phones (`/` Hub, `/join`, `/j/:code`, `/play/:code`)**: Kids, youth, and adults holding phones one-handed in a dimly lit youth hall, living room, or auditorium while glancing up at a projector screen. Needs a tactile, native mobile-app controller feel with thumb-zone actions, zero clutter, and instant visual/haptic feedback.
2. **The MC / Host (`/mc`, `/mc/:code`)**: A youth leader, pastor, or game-night host standing on stage with a phone or tablet in one hand (or laptop at a podium). Needs a rock-solid, zero-scroll broadcast control deck with 1-tap phase transport (`Start`, `Pause`, `Skip`, `+15s`), live secret answer key, player moderation, and Casting Lots.
3. **The Audience / Projector View (`/screen/:code`)**: 10 to 500 people reading a projector or TV from 10–40 feet away, OR a small group viewing the shared screen on a tablet/phone. Needs adaptive broadcast staging: 1920x1080 widescreen stage on TVs/projectors and clean vertical reflow on mobile/portrait screens.

## Brand Tone & Aesthetic Direction
- **Warm Arcade Showtime**: Deep obsidian-indigo stage (`#0B0A1A` to `#14123B`) lit by warm lantern gold (`#FFC83D`), electric sky cyan (`#3DB8FF`), coral (`#FF5C6C`), and emerald leaf (`#3DD68C`) radial spotlights.
- **Tactile Game-Show Hardware**: Chunky 3D physical buzzer buttons, dark glass HUD bars, collectible emblem cards, and expressive character mascots.
- **Mobile-First Native App & Dual PWA**: Installable as both a Player App PWA and a dedicated Host MC Console PWA with offline shell caching and native-like bottom navigation.

## Anti-References
- No bare web forms dumped on a flat purple screen.
- No programmer-art flat geometric circle SVGs posing as characters.
- No browser `window.confirm()` dialogs or unstyled native range/checkbox inputs.
- No desktop-only fixed layouts that break or require endless scrolling on mobile phones.
