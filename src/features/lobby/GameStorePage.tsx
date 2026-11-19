'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GAME_IDS, GAME_META, type GameId } from '@/shared/types';
import { haptic, playUi } from '@/client/sound';
import { Avatar } from '@/ui/avatars';
import { ConsoleFieldCanvas } from '@/ui/ConsoleFieldCanvas';
import { Icon } from '@/ui/icons';
import { ViewportModal } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { AppShell } from '@/ui/shell';
import { GameExplainerVideo } from './GameExplainerVideo';
import { JoinForm } from './Join';
import { GAME_SHOWCASE } from './gameShowcaseData';

export function GameStorePage({ gameId }: { gameId: GameId }) {
  const [joinOpen, setJoinOpen] = useState(false);
  const meta = GAME_META[gameId];
  const spec = GAME_SHOWCASE[gameId];
  const otherGames = GAME_IDS.filter((id) => id !== gameId);

  return (
    <AppShell active="home" maxWidth="max-w-6xl">
      <div className="space-y-8 pb-24 lg:pb-12">
        {/* ==================== HERO BANNER ==================== */}
        <section className="double-bezel relative overflow-hidden">
          <div className="double-bezel-inner relative overflow-hidden p-5 sm:p-8 lg:p-10">
            <ConsoleFieldCanvas
              seed={spec.seed}
              accent={spec.accent}
              secondary={spec.secondary}
              density={1}
              className="absolute inset-0 h-full w-full opacity-80"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-28 -right-24 h-96 w-96 rounded-full opacity-35 blur-3xl"
              style={{ background: spec.accent }}
            />

            {/* Top Navigation Row */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <Link
                href="/"
                onClick={() => { playUi('ui-back'); haptic('tick'); }}
                className="cursor-pointer press inline-flex items-center gap-2 rounded-full border border-white/15 bg-abyss/75 backdrop-blur-md px-4 py-2 text-xs font-semibold text-white hover:border-white/35"
              >
                <Icon n="chevronLeft" size={14} />
                <span>All Games</span>
              </Link>

              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-night shadow-md"
                style={{ background: spec.accent }}
              >
                <Icon n="star" size={13} />
                <span>{spec.rating}</span>
              </span>
            </div>

            {/* Game Title + Pitch + Dual CTAs */}
            <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="grid h-20 w-20 sm:h-24 sm:w-24 shrink-0 place-items-center rounded-[26px] border border-white/30 shadow-2xl"
                    style={{ background: spec.gradient }}
                  >
                    <MascotView name={meta.mascot} expression="happy" size={76} animate={false} />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                        {spec.badge}
                      </span>
                      <span className="text-xs font-semibold text-cloud/70">{spec.category}</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-none">
                      {meta.name}
                    </h1>
                    <p className="text-sm sm:text-base text-cloud/90 max-w-xl leading-snug">
                      {spec.pitch}
                    </p>
                  </div>
                </div>

                {/* Simple Info Pills */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-abyss/80 px-3.5 py-2 text-xs font-semibold text-white">
                    <Icon n="users" size={14} className="text-sky" />
                    <span>{meta.minPlayers} to {spec.players} Players</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-abyss/80 px-3.5 py-2 text-xs font-semibold text-white">
                    <Icon n="play" size={14} className="text-leaf" />
                    <span>{meta.est[0]} to {meta.est[1]} min</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-abyss/80 px-3.5 py-2 text-xs font-semibold text-white">
                    <Icon n="tv" size={14} className="text-gold" />
                    <span>TV + Phones</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-abyss/80 px-3.5 py-2 text-xs font-semibold text-cloud/85">
                    <span className="flex -space-x-1.5">
                      <Avatar avatar={1} color={0} size={18} />
                      <Avatar avatar={5} color={2} size={18} />
                      <Avatar avatar={10} color={4} size={18} />
                    </span>
                    <span>No Sign-Up Needed</span>
                  </span>
                </div>

                {/* Desktop & Tablet Actions */}
                <div className="hidden lg:flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { playUi('ui-sheet'); haptic('press'); setJoinOpen(true); }}
                    className="group cursor-pointer relative press console-sheen inline-flex items-center gap-3 rounded-full console-pill-white pl-6 pr-2.5 py-2 text-sm font-bold min-h-12"
                  >
                    <span>Join a Game</span>
                    <span className="btn-island-icon text-night bg-night/10">
                      <Icon n="phone" size={15} />
                    </span>
                  </button>

                  <Link
                    href={`/mc?game=${gameId}`}
                    onClick={() => { playUi('ui-press'); haptic('press'); }}
                    className="group cursor-pointer relative press console-sheen inline-flex items-center gap-3 rounded-full console-pill-lime pl-6 pr-2.5 py-2 text-sm font-bold min-h-12"
                  >
                    <span>Host {meta.name}</span>
                    <span className="btn-island-icon text-night bg-night/15">
                      <Icon n="arrowRight" size={15} />
                    </span>
                  </Link>
                </div>
              </div>

              {/* Mascot Showcase */}
              <div className="hidden md:flex justify-center lg:justify-end pointer-events-none">
                <div className="relative flex items-center justify-center rounded-[28px] border border-white/15 bg-abyss/45 px-6 pt-4 pb-2 backdrop-blur-sm">
                  <MascotView name={meta.mascot} expression="cheer" size={184} animate sticker />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== WATCH HOW TO PLAY (ANIMATED VIDEO + 3 SIMPLE STEPS) ==================== */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Watch How to Play</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <GameExplainerVideo gameId={gameId} />
            </div>

            <div className="lg:col-span-5 double-bezel">
              <div className="double-bezel-inner p-5 sm:p-6 space-y-5">
                <h3 className="text-lg font-bold text-white">3 Easy Steps</h3>

                <div className="space-y-3 a-stagger">
                  {spec.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-abyss/80 px-4 py-3.5 flex items-start gap-3.5"
                    >
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-night shadow"
                        style={{ background: spec.accent }}
                      >
                        {idx + 1}
                      </span>
                      <p className="text-sm text-cloud/95 leading-snug font-medium">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
                    <Icon n="sparkle" size={13} />
                    <span>Good to Know</span>
                  </div>
                  <div className="space-y-2">
                    {spec.hostNotes.map((note, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-xs text-cloud/80 leading-relaxed"
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== HOW EVERYONE PLAYS TOGETHER ==================== */}
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">How Everyone Plays Together</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 a-stagger">
            {spec.surfaces.map((card, i) => (
              <div key={card.role} className="double-bezel">
                <div className="double-bezel-inner p-4 sm:p-5 h-full flex flex-col justify-between gap-3 relative overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-2xl"
                    style={{ background: card.accent }}
                  />
                  <div className="relative z-10 flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-abyss"
                      style={{ color: card.accent }}
                    >
                      <Icon n={card.icon} size={20} />
                    </span>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: card.accent }}>
                        {i + 1}. {card.role}
                      </div>
                      <h3 className="font-bold text-base text-white leading-tight">{card.title}</h3>
                    </div>
                  </div>
                  <p className="relative z-10 text-sm text-cloud/80 leading-relaxed">{card.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== MORE FUN GAMES ==================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg sm:text-xl font-bold text-white">More Fun Games</h2>
            <Link
              href="/"
              onClick={() => { playUi('ui-focus'); haptic('tick'); }}
              className="cursor-pointer text-xs font-semibold text-sky hover:underline"
            >
              See All Games
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {otherGames.map((otherId) => {
              const om = GAME_META[otherId];
              const os = GAME_SHOWCASE[otherId];
              return (
                <Link
                  key={otherId}
                  href={`/games/${otherId}`}
                  onClick={() => { playUi('ui-snap'); haptic('tick'); }}
                  className="group cursor-pointer relative press console-sheen rounded-[24px] p-4 border border-white/15 flex flex-col justify-between min-h-[168px] transition-all hover:-translate-y-1 hover:border-white/35"
                  style={{ background: os.gradient }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/85">{os.badge}</div>
                      <h3 className="text-base font-bold text-white leading-tight mt-0.5">{om.name}</h3>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-night">
                      {os.rating} <span className="text-gold">★</span>
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-2 pt-2">
                    <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold text-white">
                      {om.est[0]}-{om.est[1]} min · {os.players}
                    </span>
                    <div className="transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                      <MascotView name={om.mascot} expression="happy" size={62} animate={false} sticker />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* ==================== STICKY MOBILE BOTTOM BAR ==================== */}
      <div className="fixed bottom-16 inset-x-0 z-30 lg:hidden px-4 py-2.5 bg-gradient-to-t from-abyss via-abyss/95 to-transparent">
        <div className="mx-auto max-w-md grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => { playUi('ui-sheet'); haptic('press'); setJoinOpen(true); }}
            className="cursor-pointer relative press console-sheen inline-flex items-center justify-center gap-2 rounded-full border border-white/18 bg-night-2 px-4 py-3 text-sm font-bold text-white min-h-12 shadow-xl"
          >
            <Icon n="phone" size={16} />
            <span>Join Room</span>
          </button>
          <Link
            href={`/mc?game=${gameId}`}
            onClick={() => { playUi('ui-press'); haptic('press'); }}
            className="cursor-pointer relative press console-sheen inline-flex items-center justify-center gap-2 rounded-full console-pill-white px-4 py-3 text-sm font-bold min-h-12 shadow-xl"
          >
            <Icon n="play" size={16} />
            <span>Host Game</span>
          </Link>
        </div>
      </div>

      {/* ==================== VIEWPORT-CENTERED JOIN MODAL ==================== */}
      <ViewportModal
        open={joinOpen}
        onClose={() => { playUi('ui-back'); setJoinOpen(false); }}
        ariaLabel={`Join ${meta.name}`}
      >
        <button
          type="button"
          onClick={() => { playUi('ui-back'); setJoinOpen(false); }}
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
