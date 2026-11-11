# Arkade

Real-time Bible party games for church game nights. One projector, every phone, one MC.
Five games: **Spot the Wolf**, **Fake Verse**, **Gideon's 300**, **What Came First?**, **Who Am I?**.

## Run it
```bash
npm install
npm run dev                # http://localhost:3000   (MC at /mc)
npm run build && npm start # production
npx tsx scripts/start-local.ts   # LAN / hotspot mode: prints the LAN URL and a QR code
```
Surfaces: `/` join · `/j/:code` QR target · `/play/:code` phone · `/screen/:code` projector (1920x1080 stage, scaled) · `/mc` and `/mc/:code` host console (host key protected).

## Architecture
```
src/shared        types (client-safe) + Zod schemas (server only)
src/server
  engine/         seeded RNG, scoring, text (normalise, edit distance, word filter), phase helpers, GameModule interface
  games/          five pure-reducer game modules, each with screen / player / mc view projections
  rooms/          Room (authoritative state, timers, snapshots) and RoomManager (codes, limits, sweep, restore)
  content/        compact authoring tables -> schema-validated items, loader, seeded sampling, coverage
  net/            HTTP helpers, size limits
src/app/api       POST /api/rooms, GET /api/rooms/:code, /join, /stream (SSE), /action, /mc, /time, /metrics, /healthz
src/client        channel (zustand store, reconnect with 500 ms to 5 s backoff), clock sync (median of 5), hooks, Web Audio sound
src/features      lobby, player, screen, mc, and games/<game>/{Player,Screen,Mc}.tsx (lazy per game)
src/ui            tokens-driven kit, 7 SVG mascots with expressions + CSS animation classes, 24 avatars
tests/            Vitest "critic" suite (scoring, privacy per phase, simulations, rooms, snapshots, a11y/i18n)
scripts/          load-test.mjs, chaos-test.mjs, validate-content.ts, measure-bundle.mjs, start-local.ts
```
**Authority model.** Clients send intents; the server validates (Zod, phase, role, rate limit), stamps `receivedAt` itself, and pushes a per-audience view with a `rev`. Scores, wolf identity, correct answers and every other secret exist only in server state. `Room.viewFor` projects three pipelines (screen, player, MC) and tests assert nothing private leaks in any phase.

**Transport note (deviation from ARCHITECTURE.md).** The spec calls for Fastify + Socket.IO + pnpm workspaces. This repository is a single Next.js app that the platform runs with `next start`, which cannot host a second server process, so the same protocol is carried by **Server-Sent Events** (server to client: `view`, `kicked`, `closed`) plus validated **HTTP POST intents** with acks (`/action`, `/mc`, `/join`) and `/api/time` for clock sync. Semantics are unchanged: full views with `rev`, 250 ms coalescing, per-socket hash skip, token rejoin, exponential reconnect. Because the game modules are pure, swapping the transport for Socket.IO only touches `src/app/api/rooms/[code]/*` and `src/client/channel.ts`.

## Verification
```bash
npx vitest run                     # tests: PRD scoring numbers, privacy per phase, 50-player simulation, reconnect, snapshots, WCAG contrast, i18n, and server-side rendering of every Player/Screen/MC component in every phase
npx tsx scripts/validate-content.ts
npm run build && npm start &       # then:
node scripts/measure-bundle.mjs http://localhost:3000     # first-load JS per route (budget 180 KB gz)
node scripts/load-test.mjs --game fake-verse --bots 300   # full game with 300 bots over the real protocol
node scripts/chaos-test.mjs        # kill the server mid-game, restart, players rejoin, MC resumes
```
Measured on this build: phone routes 161 to 168 KB gz JS (nomodule polyfills excluded), fonts 32 KB, 300-bot Fake Verse and Gideon's 300 games complete with 0 failures, MC to projector phase change p95 about 50 ms, about 240 MB RSS at 300 players.

## Configuration
`PORT`, `PUBLIC_URL` (QR and short URL), `MAX_ROOMS` (10), `MAX_PLAYERS` (500), `ROOM_IDLE_MINUTES` (120), `SNAPSHOT_DIR` (`./data/snapshots`), `ALLOW_PENDING` (false), `LOG_LEVEL`.

## Content
JSON-shaped items are authored in compact tables under `src/server/content/data`, expanded and validated with Zod at server start and by `validate-content.ts` (reference and verse text required; KJV only). Run the validator to see the coverage report against the PRD launch targets.
**Honest status:** the pack sizes shipped here (17 What Came First sets, 30 Fake Verse prompts, 62 Gideon questions, 48 wolf words, 20 Who Am I subjects) are enough for complete games with no repeats but are below the PRD launch targets (50, 80, 120, 100, 50). Items carry `review: approved` from developer self-review; **a church leader still has to review every item (T-8.11)** before a public night.

## Known gaps and decisions
- Contrast: DESIGN.md asks for white text on Coral and Danger; those pairs measure 3.0 to 3.3:1, so the UI uses Night text on Coral, Danger and Violet (all above 4.5:1, enforced in `tests/a11y.test.ts`).
- Mascot and avatar SVGs are hand-written React components (stable ids, no `<text>`, under 5 KB markup each); they have not been through SVGO or a designer pass, and the PNG exports, `og-image.png` and `maskable-icon-512.png` are not produced.
- Framer Motion is not used (bundle budget); springs and reveals are CSS keyframes with a reduced-motion fallback. Lucide is replaced by an inline icon set in the same stroke style.
- The lighter "Cloud" daylight theme for phones, a Storybook gallery, Playwright and axe browser runs, Sentry and the Artillery scenarios are not included; `scripts/load-test.mjs` and the Vitest suite cover load and behaviour instead. Pino is replaced by structured JSON `console` logs.
- Ban is per device token (clearing browser storage creates a new identity); there is no IP ban because many phones share one church address.
