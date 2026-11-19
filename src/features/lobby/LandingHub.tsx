'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GAME_IDS, GAME_META, type GameId } from '@/shared/types';
import { haptic, playUi } from '@/client/sound';
import { Avatar } from '@/ui/avatars';
import { ConsoleFieldCanvas } from '@/ui/ConsoleFieldCanvas';
import { Icon } from '@/ui/icons';
import { ViewportModal } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { PwaDualCards } from '@/ui/pwa';
import { AppShell } from '@/ui/shell';
import { GameExplainerVideo } from './GameExplainerVideo';
import { JoinForm } from './Join';
import { GAME_SHOWCASE } from './gameShowcaseData';

interface SavedSession {
  code: string;
  role: 'player' | 'mc';
  gameName: string;
}

export function LandingHub() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<GameId>('what-came-first');
  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'featured' | 'all'>('featured');
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const found: { code: string; role: 'player' | 'mc' }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('arkade:host:')) {
        const code = k.slice('arkade:host:'.length);
        if (code.length === 4) found.push({ code, role: 'mc' });
      } else if (k.startsWith('arkade:player:')) {
        const code = k.slice('arkade:player:'.length);
        if (code.length === 4) found.push({ code, role: 'player' });
      }
    }
    if (!found.length) return;
    let live = true;
    Promise.all(
      found.slice(0, 4).map(async (item) => {
        try {
          const r = await fetch(`/api/rooms/${item.code}`, { cache: 'no-store' });
          if (!r.ok) return null;
          const j = await r.json();
          return { code: item.code, role: item.role, gameName: j.gameName as string };
        } catch {
          return null;
        }
      }),
    ).then((res) => {
      if (!live) return;
      setSessions(res.filter((x): x is SavedSession => x !== null));
    });
    return () => {
      live = false;
    };
  }, []);

  const selectGame = (id: GameId, pan = 0, openPageIfCenter = false) => {
    if (id === selectedGame && openPageIfCenter) {
      playUi('ui-sheet');
      haptic('press');
      router.push(`/games/${id}`);
      return;
    }
    setSelectedGame(id);
    playUi('ui-snap', pan);
    haptic('snap');
  };

  const selectedIdx = GAME_IDS.indexOf(selectedGame);
  const activeMeta = GAME_META[selectedGame];
  const activeSpec = GAME_SHOWCASE[selectedGame];

  // Keyboard arrow + Enter navigation on the desktop 3D console arc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (joinSheetOpen) {
        if (e.key === 'Escape') {
          playUi('ui-back');
          setJoinSheetOpen(false);
        }
        return;
      }
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') {
        const next = GAME_IDS[(selectedIdx + 1) % GAME_IDS.length];
        selectGame(next, 0.4);
      } else if (e.key === 'ArrowLeft') {
        const prev = GAME_IDS[(selectedIdx - 1 + GAME_IDS.length) % GAME_IDS.length];
        selectGame(prev, -0.4);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <AppShell active="home" fullBleed>
      {/* ==================== SYS // 01 DESKTOP CONSOLE STAGE HERO (desktop-home.jpg) ==================== */}
      <section className="hidden lg:flex relative min-h-[calc(100dvh-76px)] flex-col justify-between overflow-hidden console-grid-bg px-6 pt-5 pb-6 [@media(min-height:840px)]:pt-8 [@media(min-height:840px)]:pb-8">
        {/* Algorithmic Harmonic Console Canvas seeded to active game */}
        <ConsoleFieldCanvas
          seed={activeSpec.seed}
          accent={activeSpec.accent}
          secondary={activeSpec.secondary}
          density={1}
          className="absolute inset-0 h-full w-full opacity-80"
        />

        {/* Dynamic radial spotlight tinted to focused game */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-35 transition-all duration-700 a-aurora"
          style={{
            background: `radial-gradient(ellipse 65% 55% at 50% 15%, ${activeSpec.accent}3D 0%, transparent 72%)`,
          }}
        />

        {/* Floating Left/Right Peripheral Game Tiles (machined Double-Bezel trays) */}
        <button
          type="button"
          onClick={() => selectGame('gideons-300', -0.6, selectedGame === 'gideons-300')}
          aria-label="Focus Battle Royale"
          className="cursor-pointer hidden xl:flex absolute left-10 top-16 [@media(min-height:840px)]:top-24 z-20 double-bezel -rotate-6 hover:rotate-0 transition-transform duration-500 m-float"
        >
          <div className="double-bezel-inner p-2.5 flex items-center justify-center">
            <MascotView name="jari" expression="ready" size={76} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => selectGame('spot-the-wolf', 0.6, selectedGame === 'spot-the-wolf')}
          aria-label="Focus Spot the Wolf"
          className="cursor-pointer hidden xl:flex absolute right-10 top-20 [@media(min-height:840px)]:top-28 z-20 double-bezel rotate-6 hover:rotate-0 transition-transform duration-500 m-float"
          style={{ animationDelay: '1.2s' }}
        >
          <div className="double-bezel-inner p-2.5 flex items-center justify-center">
            <MascotView name="wilf" expression="scheming" size={76} />
          </div>
        </button>

        {/* Center Hero Console Typography & Action Pill Bar */}
        <div className="relative z-20 mx-auto flex max-w-3xl flex-col items-center text-center pt-1 [@media(min-height:840px)]:pt-3">
          <div className="flex flex-wrap items-center justify-center gap-2 a-fade">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-night-2/85 px-3.5 py-1 text-xs font-semibold text-cloud/85 shadow-lg">
              <span className="h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_#FFD026]" />
              <span>5 Multiplayer Bible Games · Zero Accounts</span>
            </div>
            {sessions.map((s) => (
              <Link
                key={`${s.role}-${s.code}`}
                href={s.role === 'mc' ? `/mc/${s.code}` : `/play/${s.code}`}
                onClick={() => { playUi('ui-press'); haptic('press'); }}
                className="cursor-pointer relative press console-sheen inline-flex items-center gap-1.5 rounded-full console-pill-lime px-3.5 py-1 text-xs font-bold a-pop"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-night animate-pulse" />
                <span>{s.role === 'mc' ? 'Resume MC' : 'Rejoin'} · {s.code}</span>
              </Link>
            ))}
          </div>

          <h1 className="mt-3 [@media(min-height:840px)]:mt-4 text-[clamp(2.35rem,3.9vw,3.9rem)] font-bold tracking-tight text-white leading-[1.03] a-slide">
            Fun Bible Games
            <span className="block text-cloud/90 font-semibold mt-0.5">
              For Every <span style={{ color: activeSpec.accent, transition: 'color 400ms ease' }}>Room &amp; Screen</span>
            </span>
          </h1>

          <p className="mt-2 max-w-xl text-xs xl:text-sm text-cloud/65 leading-relaxed">
            One big TV screen, one host screen, and everyone playing together on their phones.
          </p>

          <div className="mt-4 [@media(min-height:840px)]:mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => { playUi('ui-sheet'); haptic('press'); setJoinSheetOpen(true); }}
              className="group cursor-pointer relative press console-sheen inline-flex items-center gap-2.5 rounded-full console-pill-white pl-5 pr-2 py-2 text-sm font-bold min-h-11"
            >
              <span>Join with Room Code</span>
              <span className="btn-island-icon text-night bg-night/10">
                <Icon n="phone" size={14} />
              </span>
            </button>

            <Link
              href={`/mc?game=${selectedGame}`}
              onClick={() => { playUi('ui-press'); haptic('press'); }}
              className="group cursor-pointer relative press console-sheen inline-flex items-center gap-2.5 rounded-full console-pill-lime pl-5 pr-2 py-2 text-sm font-bold min-h-11"
            >
              <span>Host {activeMeta.name}</span>
              <span className="btn-island-icon text-night bg-night/15">
                <Icon n="play" size={14} />
              </span>
            </Link>

            <Link
              href={`/games/${selectedGame}`}
              onClick={() => { playUi('ui-sheet'); haptic('press'); }}
              className="group cursor-pointer relative press console-sheen inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-night-2/90 pl-5 pr-2 py-2 text-sm font-semibold text-white hover:border-white/30 min-h-11"
            >
              <span>How to Play</span>
              <span className="btn-island-icon text-white bg-white/12">
                <Icon n="arrowRight" size={14} />
              </span>
            </Link>
          </div>
        </div>

        {/* Fixed Centered 5-Card 3D Fanned Arc (desktop-home.jpg) */}
        <div className="relative z-20 mx-auto mt-auto w-full max-w-[1180px] pt-3 [@media(min-height:840px)]:pt-6" style={{ perspective: '1400px' }}>
          <div className="relative h-[260px] [@media(min-height:840px)]:h-[308px]" role="region" aria-label="Arkade Game Deck">
            {GAME_IDS.map((id, idx) => {
              const g = GAME_META[id];
              const spec = GAME_SHOWCASE[id];
              let rel = idx - selectedIdx;
              if (rel > 2) rel -= 5;
              if (rel < -2) rel += 5;

              const isCenter = rel === 0;
              const abs = Math.abs(rel);
              const tx = rel * 204;
              const ty = abs === 0 ? 0 : abs === 1 ? 22 : 52;
              const rot = rel * 4.2;
              const rotY = rel * -6;
              const scale = abs === 0 ? 1.04 : abs === 1 ? 0.90 : 0.79;
              const z = abs === 0 ? 30 : abs === 1 ? 20 : 10;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectGame(id, Math.max(-0.8, Math.min(0.8, rel * 0.4)), isCenter)}
                  aria-label={isCenter ? `How to Play ${g.name}` : `Select ${g.name}`}
                  aria-pressed={isCenter}
                  className="cursor-pointer console-sheen group w-[244px] h-[252px] [@media(min-height:840px)]:w-[264px] [@media(min-height:840px)]:h-[296px] rounded-[26px] p-4 [@media(min-height:840px)]:p-5 text-left flex flex-col justify-between overflow-hidden border border-white/25 transition-all duration-500"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 0,
                    background: spec.gradient,
                    transform: `translate3d(calc(-50% + ${tx}px), ${ty}px, 0) scale(${scale}) rotateY(${rotY}deg) rotate(${rot}deg)`,
                    zIndex: z,
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isCenter
                      ? `0 28px 65px -12px ${spec.accent}66, 0 0 0 2px rgba(255,255,255,0.45)`
                      : '0 22px 45px -12px rgba(0, 0, 0, 0.85)',
                    filter: isCenter ? 'brightness(1.03)' : 'brightness(0.82) saturate(0.92)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div className="min-w-0">
                      <h2 className="text-[17px] [@media(min-height:840px)]:text-[19px] font-bold text-white leading-tight drop-shadow-sm">
                        {g.name}
                      </h2>
                      <p className="text-[11px] font-semibold text-white/85 mt-0.5">{spec.badge}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-night shadow">
                      <span>{spec.rating}</span>
                      <span className="text-gold">★</span>
                    </span>
                  </div>

                  {/* Mascot Artwork */}
                  <div className="relative flex-1 flex items-end justify-center pointer-events-none">
                    <div className="transform transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-105 translate-y-2">
                      <MascotView name={g.mascot} expression={isCenter ? 'cheer' : 'happy'} size={isCenter ? 156 : 136} animate={isCenter} sticker />
                    </div>
                  </div>

                  {/* Bottom Card Hint Pill */}
                  <div className={`relative z-10 flex items-center justify-between transition-all duration-300 ${isCenter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                    <span className="rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white whitespace-nowrap">
                      {isCenter ? 'How to Play' : `${g.est[0]}-${g.est[1]} min · ${spec.players}`}
                    </span>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-night shadow group-hover:scale-110 transition-transform">
                      <Icon n="chevronRight" size={14} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination Dots + Scroll Telemetry Cue */}
          <div className="mt-3 [@media(min-height:840px)]:mt-4 flex items-center justify-between max-w-md mx-auto">
            <span className="console-telemetry-tag">← / → Select</span>
            <div className="flex items-center gap-2">
              {GAME_IDS.map((id, i) => {
                const active = id === selectedGame;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={`Focus ${GAME_META[id].name}`}
                    onClick={() => selectGame(id, (i - selectedIdx) * 0.35)}
                    className={`cursor-pointer h-2 rounded-full transition-all duration-300 ${
                      active ? 'w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.65)]' : 'w-2 bg-white/25 hover:bg-white/50'
                    }`}
                  />
                );
              })}
            </div>
            <a href="#console-showcase" className="console-telemetry-tag hover:text-white transition-colors">
              Explore ↓
            </a>
          </div>
        </div>
      </section>

      {/* ==================== MOBILE COMPANION HERO (mobile-home.jpg) ==================== */}
      <section className="lg:hidden relative flex flex-col gap-4 px-4 pt-3 pb-4 overflow-x-hidden">
        <ConsoleFieldCanvas
          seed={activeSpec.seed}
          accent={activeSpec.accent}
          secondary={activeSpec.secondary}
          density={0.65}
          className="fixed inset-x-0 top-12 h-72 -z-10 opacity-75"
        />

        {sessions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar a-slide">
            {sessions.map((s) => (
              <Link
                key={`${s.role}-${s.code}`}
                href={s.role === 'mc' ? `/mc/${s.code}` : `/play/${s.code}`}
                onClick={() => { playUi('ui-press'); haptic('press'); }}
                className="cursor-pointer relative press console-sheen shrink-0 inline-flex items-center gap-1.5 rounded-full console-pill-lime px-3.5 py-1.5 text-xs font-bold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-night animate-pulse" />
                <span>{s.role === 'mc' ? 'Resume MC' : 'Rejoin'} · {s.code}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Switch Sub-Header Row */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/games/${selectedGame}`}
            onClick={() => { playUi('ui-sheet'); haptic('press'); }}
            aria-label={`View ${activeMeta.name} How to Play`}
            className="cursor-pointer press grid h-9 w-9 place-items-center rounded-xl bg-night-2 border border-white/10 text-cloud/80"
          >
            <Icon n="gamepad" size={18} />
          </Link>

          <div className="flex items-center gap-4 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                playUi('ui-focus');
                setMobileTab('featured');
              }}
              className={`cursor-pointer flex items-center gap-1.5 transition ${mobileTab === 'featured' ? 'text-white' : 'text-cloud/45'}`}
            >
              {mobileTab === 'featured' && <span className="h-1.5 w-1.5 rounded-full bg-sky shadow-[0_0_8px_#29C5FF] a-pop" />}
              <span>Featured</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playUi('ui-focus');
                setMobileTab('all');
                document.getElementById('catalog-heading')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`cursor-pointer flex items-center gap-1.5 transition ${mobileTab === 'all' ? 'text-white' : 'text-cloud/45'}`}
            >
              {mobileTab === 'all' && <span className="h-1.5 w-1.5 rounded-full bg-sky shadow-[0_0_8px_#29C5FF] a-pop" />}
              <span>Games</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => { playUi('ui-sheet'); haptic('press'); setJoinSheetOpen(true); }}
            className="cursor-pointer relative press console-sheen inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-night-2 px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap"
          >
            <Icon n="phone" size={14} className="text-leaf" />
            <span>Code</span>
          </button>
        </div>

        {/* Horizontal Snap Carousel */}
        <div className="-mx-4 px-4 flex gap-3.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2">
          {GAME_IDS.map((id) => {
            const g = GAME_META[id];
            const spec = GAME_SHOWCASE[id];
            const isSel = id === selectedGame;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectGame(id, 0, isSel)}
                className={`cursor-pointer snap-center relative console-sheen shrink-0 w-[68vw] max-w-[258px] h-[258px] rounded-[26px] p-4 text-left flex flex-col justify-between overflow-hidden border transition-all duration-300 ${
                  isSel ? 'border-white/55 scale-100 shadow-2xl' : 'border-white/15 scale-[0.96] opacity-85'
                }`}
                style={{ background: spec.gradient }}
              >
                <div className="flex items-start justify-between gap-2 relative z-10">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white leading-tight">{g.name}</h2>
                    <p className="text-[11px] font-semibold text-white/85">{spec.badge}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-night shadow">
                    {spec.rating} <span className="text-gold">★</span>
                  </span>
                </div>

                <div className="relative flex-1 flex items-end justify-center pointer-events-none">
                  <div className="translate-y-2">
                    <MascotView name={g.mascot} expression={isSel ? 'cheer' : 'happy'} size={164} animate={isSel} sticker />
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between">
                  <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white">
                    {isSel ? 'Tap again: How to Play' : `${g.est[0]}-${g.est[1]} min`}
                  </span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-night">
                    <Icon n="chevronRight" size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ==================== MULTI-SECTION CONSOLE SHOWCASE (Shared Desktop + Mobile) ==================== */}
      <div id="console-showcase" className="mx-auto w-full max-w-[1220px] px-4 lg:px-6 space-y-12 lg:space-y-20 py-6 lg:py-16">
        {/* ---------- GAME SPOTLIGHT + ANIMATED EXPLAINER ---------- */}
        <section aria-labelledby="spotlight-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4 px-1">
            <div>
              <div className="console-telemetry-tag">FEATURED GAME · SEE HOW IT WORKS</div>
              <h2 id="spotlight-heading" className="text-2xl sm:text-3xl font-bold text-white mt-1">
                {activeMeta.name}:{' '}
                <span style={{ color: activeSpec.accent, transition: 'color 400ms ease' }}>{activeSpec.highlight}</span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {GAME_IDS.map((id) => {
                const isSel = id === selectedGame;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectGame(id, 0)}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isSel ? 'bg-white text-night shadow' : 'border border-white/12 bg-night-2 text-cloud/70 hover:text-white'
                    }`}
                  >
                    {GAME_META[id].name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <GameExplainerVideo gameId={selectedGame} />
            </div>

            <div className="lg:col-span-6 double-bezel">
              <div className="double-bezel-inner relative overflow-hidden p-5 sm:p-7 space-y-5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl transition-colors duration-700"
                  style={{ background: activeSpec.accent }}
                />

                <div className="relative z-10 flex items-center gap-3.5">
                  <div
                    className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/25 shadow-lg"
                    style={{ background: activeSpec.gradient }}
                  >
                    <MascotView name={activeMeta.mascot} expression="cheer" size={48} animate={false} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/12 bg-abyss px-2.5 py-0.5 text-[11px] font-bold text-gold tabular-nums">
                        {activeSpec.players} players
                      </span>
                      <span className="rounded-full border border-white/10 bg-abyss px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {activeMeta.est[0]}-{activeMeta.est[1]} min
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug">{activeSpec.pitch}</p>
                  </div>
                </div>

                <div className="relative z-10 space-y-2.5">
                  {activeSpec.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-abyss/80 px-3.5 py-2.5 flex items-start gap-3"
                    >
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-night mt-0.5"
                        style={{ background: activeSpec.accent }}
                      >
                        {idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm text-cloud/90 leading-snug">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href={`/games/${selectedGame}`}
                    onClick={() => { playUi('ui-sheet'); haptic('press'); }}
                    className="group cursor-pointer relative press console-sheen inline-flex items-center gap-3 rounded-full console-pill-white pl-5 pr-2 py-2 text-sm font-bold min-h-11"
                  >
                    <span>Full Game Guide</span>
                    <span className="btn-island-icon text-night bg-night/10">
                      <Icon n="arrowRight" size={14} />
                    </span>
                  </Link>
                  <Link
                    href={`/mc?game=${selectedGame}`}
                    onClick={() => { playUi('ui-press'); haptic('press'); }}
                    className="group cursor-pointer relative press console-sheen inline-flex items-center gap-3 rounded-full console-pill-lime pl-5 pr-2 py-2 text-sm font-bold min-h-11"
                  >
                    <span>Host {activeMeta.name}</span>
                    <span className="btn-island-icon text-night bg-night/15">
                      <Icon n="play" size={14} />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PLAY TOGETHER WITH ONE ROOM CODE ---------- */}
        <section aria-labelledby="architecture-heading" className="space-y-4">
          <div className="px-1">
            <div className="console-telemetry-tag">PLAY TOGETHER</div>
            <h2 id="architecture-heading" className="text-2xl sm:text-3xl font-bold text-white mt-1">
              One Room Code. Big Screen + Every Phone.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Big TV Screen Feature */}
            <div className="double-bezel lg:col-span-7">
              <div className="double-bezel-inner p-6 sm:p-8 h-full flex flex-col justify-between gap-6 relative overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-sky/18 blur-3xl"
                />
                <div className="relative z-10 space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky/35 bg-sky/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky">
                    <Icon n="tv" size={14} /> Big TV Screen
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    Show Questions &amp; Winners on the Big Screen
                  </h3>
                  <p className="text-sm text-cloud/80 leading-relaxed max-w-lg">
                    Plug a laptop into your hall TV or projector. Everyone sees timers, funny answers, live scores, and the 1st-2nd-3rd winners podium together.
                  </p>
                </div>

                {/* Winners Podium Preview */}
                <div className="relative z-10 rounded-2xl border border-white/10 bg-abyss/90 p-5 flex items-end justify-between gap-4">
                  <div className="flex items-end gap-2.5">
                    <div className="flex flex-col items-center gap-1.5">
                      <Avatar avatar={2} color={1} size={30} />
                      <div className="h-12 w-12 rounded-t-xl podium-monolith flex items-center justify-center text-xs font-bold text-cloud/80">2nd</div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <Icon n="crown" size={16} className="text-gold" />
                      <Avatar avatar={7} color={0} size={36} />
                      <div className="h-16 w-14 rounded-t-xl podium-monolith border-t-2 border-leaf flex items-center justify-center text-xs font-bold text-gold">1st</div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <Avatar avatar={9} color={4} size={28} />
                      <div className="h-9 w-12 rounded-t-xl podium-monolith flex items-center justify-center text-xs font-bold text-plank">3rd</div>
                    </div>
                  </div>

                  <Link
                    href="/screen"
                    onClick={() => { playUi('ui-focus'); haptic('press'); }}
                    className="hidden sm:inline-flex cursor-pointer relative press console-sheen items-center gap-2 rounded-full border border-sky/40 bg-sky/15 px-4 py-2 text-xs font-bold text-sky hover:bg-sky/25 whitespace-nowrap"
                  >
                    <span>Open TV Screen</span>
                    <Icon n="arrowRight" size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Stack: Host MC + Phones */}
            <div className="lg:col-span-5 grid gap-5">
              <div className="double-bezel">
                <div className="double-bezel-inner p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold">
                      <Icon n="sliders" size={13} /> Host Booth
                    </span>
                    <span className="console-telemetry-tag">HOST CONTROLS</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Easy One-Tap Hosting</h3>
                  <p className="text-xs sm:text-sm text-cloud/80 leading-relaxed">
                    Start the game, add extra time if players need more seconds, pick stage players randomly, and control TV music from one screen.
                  </p>
                  <Link
                    href="/mc"
                    onClick={() => { playUi('ui-focus'); haptic('press'); }}
                    className="inline-flex items-center gap-2 text-xs font-bold text-gold hover:underline"
                  >
                    <span>Open Host Page</span>
                    <Icon n="arrowRight" size={13} />
                  </Link>
                </div>
              </div>

              <div className="double-bezel">
                <div className="double-bezel-inner p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 rounded-full border border-leaf/35 bg-leaf/12 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-leaf">
                      <Icon n="phone" size={13} /> Your Phone
                    </span>
                    <span className="console-telemetry-tag">4-LETTER CODE</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">No Accounts. Just Tap &amp; Play.</h3>
                  <p className="text-xs sm:text-sm text-cloud/80 leading-relaxed">
                    Scan the QR code or type the 4-letter room code. Everyone picks their cute animal buddy and jumps straight into the game.
                  </p>
                  <button
                    type="button"
                    onClick={() => { playUi('ui-sheet'); haptic('press'); setJoinSheetOpen(true); }}
                    className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold text-leaf hover:underline"
                  >
                    <span>Enter 4-Letter Room Code</span>
                    <Icon n="arrowRight" size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- ALL 5 GAMES CATALOG ---------- */}
        <section aria-labelledby="catalog-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 px-1">
            <div>
              <div className="console-telemetry-tag">GAME LIBRARY</div>
              <h2 id="catalog-heading" className="text-2xl sm:text-3xl font-bold text-white mt-1">
                All 5 Party Games
              </h2>
            </div>
            <span className="text-xs font-semibold text-cloud/65">Tap any game to watch how to play</span>
          </div>

          <div className="double-bezel">
            <div className="double-bezel-inner divide-y divide-white/8 overflow-hidden">
              {GAME_IDS.map((id, i) => {
                const m = GAME_META[id];
                const sp = GAME_SHOWCASE[id];
                return (
                  <div
                    key={id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-white/[0.03]"
                  >
                    <Link
                      href={`/games/${id}`}
                      onClick={() => { playUi('ui-snap'); haptic('tick'); }}
                      className="flex items-center gap-4 min-w-0 flex-1 group"
                    >
                      <div
                        className="h-16 w-16 shrink-0 rounded-2xl grid place-items-center border border-white/20 shadow-lg transition-transform duration-300 group-hover:scale-105"
                        style={{ background: sp.gradient }}
                      >
                        <MascotView name={m.mascot} expression="happy" size={54} animate={false} />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-cloud/50 tabular-nums">
                            0{i + 1}
                          </span>
                          <h3 className="font-bold text-lg text-white group-hover:text-sky transition-colors">
                            {m.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-bold text-gold">
                            {sp.rating} ★
                          </span>
                          <span className="rounded-full border border-white/10 bg-abyss px-2.5 py-0.5 text-[11px] font-semibold text-cloud/80">
                            {sp.badge}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-cloud/75 line-clamp-1">{sp.pitch}</p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="hidden md:inline-block text-xs font-semibold text-cloud/55 mr-2 tabular-nums">
                        {m.est[0]}-{m.est[1]} min · {sp.players} players
                      </span>
                      <Link
                        href={`/games/${id}`}
                        onClick={() => { playUi('ui-sheet'); haptic('press'); }}
                        className="cursor-pointer press rounded-full border border-white/15 bg-night-3 px-4 py-2 text-xs font-bold text-white hover:border-white/35 whitespace-nowrap"
                      >
                        How to Play
                      </Link>
                      <Link
                        href={`/mc?game=${id}`}
                        onClick={() => { playUi('ui-press'); haptic('press'); }}
                        className="cursor-pointer relative press console-sheen rounded-full console-pill-lime px-4 py-2 text-xs font-bold whitespace-nowrap"
                      >
                        Host Game
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- GET THE APPS ---------- */}
        <section aria-labelledby="pwa-heading" className="space-y-4">
          <div className="px-1">
            <div className="console-telemetry-tag">INSTALL APPS</div>
            <h2 id="pwa-heading" className="text-2xl sm:text-3xl font-bold text-white mt-1">
              Get the Player &amp; Host Apps
            </h2>
          </div>

          <div className="double-bezel">
            <div className="double-bezel-inner p-4 sm:p-6">
              <PwaDualCards />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 pb-4 text-xs text-cloud/55">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-leaf" />
            <span className="font-semibold text-white">Arkade</span>
            <span>· Fun Bible party games for every room</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/join" className="hover:text-white transition-colors">Join Room</Link>
            <Link href="/mc" className="hover:text-white transition-colors">Host MC</Link>
            <Link href="/screen" className="hidden lg:inline hover:text-white transition-colors">TV Stage</Link>
          </div>
        </footer>
      </div>

      {/* ==================== VIEWPORT-CENTERED JOIN MODAL ==================== */}
      <ViewportModal
        open={joinSheetOpen}
        onClose={() => { playUi('ui-back'); setJoinSheetOpen(false); }}
        ariaLabel="Join an Arkade Room"
      >
        <button
          type="button"
          onClick={() => { playUi('ui-back'); setJoinSheetOpen(false); }}
          aria-label="Close join dialog"
          className="cursor-pointer absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <Icon n="cross" size={16} />
        </button>
        <JoinForm embedded />
      </ViewportModal>
    </AppShell>
  );
}
