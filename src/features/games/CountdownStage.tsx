'use client';

import type { CSSProperties } from 'react';
import { GAME_META, type GameId, type View } from '@/shared/types';
import { t } from '@/i18n';
import { useCountdown, useReducedMotion } from '@/client/hooks';
import { Icon } from '@/ui/icons';
import { useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';

export interface CountdownStageProps {
  view: View;
  surface: 'screen' | 'player' | 'mc';
  mobile?: boolean;
  preview?: boolean;
}

interface CountdownViewData {
  countdownSec?: number;
  totalPlayers?: number;
  stageCount?: number;
}

const GAME_TIPS: Record<GameId, string> = {
  'spot-the-wolf': 'Give clever 1-word clues to prove you know the secret word — and spot who is bluffing!',
  'fake-verse': 'Write a believable fake answer to fool the room, then vote for the real Bible truth!',
  'gideons-300': 'Answer fast to survive each cut and race to the crown in the final showdown!',
  'what-came-first': 'Study the five Bible moments, then tap them in order from earliest to latest!',
  'who-am-i': 'Watch the clues unlock one by one — lock in your guess early for maximum points!',
};

function CountdownRing({
  displaySecs,
  frac,
  accentColor,
  isPaused,
  isUrgent,
  isGo,
  reduced,
  size,
}: {
  displaySecs: number;
  frac: number;
  accentColor: string;
  isPaused: boolean;
  isUrgent: boolean;
  isGo: boolean;
  reduced: boolean;
  size: number;
}) {
  const r = 52;
  const C = 2 * Math.PI * r;
  const strokeWidth = size >= 240 ? 7.5 : 9;
  const digitFontSize = isGo
    ? Math.round(size * 0.3)
    : displaySecs >= 10
      ? Math.round(size * 0.38)
      : Math.round(size * 0.45);

  return (
    <div
      className="relative inline-grid place-items-center shrink-0 select-none"
      style={{ width: size, height: size }}
      role="timer"
      aria-label={t('a11y.timeLeft', { n: displaySecs })}
    >
      {/* Pulsing ambient stadium halo */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-full blur-2xl transition-colors duration-300 ${
          !reduced && !isPaused ? 'animate-pulse' : ''
        }`}
        style={{
          background: `radial-gradient(circle, ${accentColor}${isUrgent ? '55' : '33'} 0%, transparent 72%)`,
          transform: isUrgent ? 'scale(1.16)' : 'scale(1.06)',
        }}
      />

      {/* Outer pulsing ring halo on urgent final 3 seconds */}
      {isUrgent && !reduced && size >= 140 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2 rounded-full border-2 animate-ping opacity-45"
          style={{ borderColor: accentColor }}
        />
      )}

      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="-rotate-90 relative z-10 drop-shadow-[0_14px_34px_rgba(0,0,0,0.75)]"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r={r} fill="#0C0E14" stroke="#1C2230" strokeWidth={strokeWidth} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{
            filter: `drop-shadow(0 0 10px ${accentColor}99)`,
            transition: 'stroke-dashoffset 110ms linear, stroke 240ms ease',
          }}
        />
      </svg>

      <div className="relative z-10 col-start-1 row-start-1 flex flex-col items-center justify-center text-center leading-none">
        <span
          key={isPaused ? 'paused' : isGo ? 'go' : displaySecs}
          className={`font-bold tabular-nums tracking-tight ${
            !reduced && !isPaused ? 'chamber-pop' : ''
          } ${isGo ? 'text-leaf' : isPaused ? 'text-gold' : isUrgent ? 'text-coral' : 'text-white'}`}
          style={{
            fontSize: digitFontSize,
            textShadow: `0 0 28px ${accentColor}66`,
          }}
        >
          {isGo ? 'GO!' : displaySecs}
        </span>
        {size >= 140 && (
          <span
            className="mt-1 font-bold uppercase tracking-[0.22em] text-cloud/75"
            style={{ fontSize: Math.max(10, Math.round(size * 0.068)) }}
          >
            {isPaused ? 'Paused' : isGo ? 'Starting' : 'Seconds'}
          </span>
        )}
      </div>
    </div>
  );
}

function CountdownBar({
  frac,
  isUrgent,
  isGo,
  isPaused,
  heightClass = 'h-3',
}: {
  frac: number;
  isUrgent: boolean;
  isGo: boolean;
  isPaused: boolean;
  heightClass?: string;
}) {
  const pct = isGo ? 100 : Math.max(3, Math.round(frac * 1000) / 10);
  const bg = isPaused
    ? 'linear-gradient(90deg, #E2A83B 0%, #FFD026 100%)'
    : isUrgent
      ? 'linear-gradient(90deg, #FF9A3D 0%, #FF5C6C 100%)'
      : 'linear-gradient(90deg, #38EC82 0%, #29C5FF 55%, #FFD026 100%)';

  return (
    <div
      className={`w-full overflow-hidden rounded-full border border-white/12 bg-night-3/95 p-0.5 ${heightClass}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(frac * 100)}
      aria-label="Game launch countdown progress"
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: bg,
          transition: 'width 110ms linear',
          boxShadow: isUrgent ? '0 0 16px rgba(255, 92, 108, 0.55)' : '0 0 14px rgba(56, 236, 130, 0.4)',
        }}
      />
    </div>
  );
}

export function CountdownStage({
  view,
  surface,
  mobile,
  preview = false,
}: CountdownStageProps) {
  const reduced = useReducedMotion();
  const stageMobile = useStageMobile();
  const isMobile = mobile ?? stageMobile;
  const meta = GAME_META[view.gameId];
  const d = (view.data ?? {}) as CountdownViewData;

  const totalPlayers = d.totalPlayers ?? view.count?.total ?? 0;
  const stageCount = d.stageCount ?? totalPlayers;
  const hasStageSubset = stageCount > 0 && totalPlayers > 0 && stageCount !== totalPlayers;
  const crewLabel = hasStageSubset
    ? `${stageCount} on stage · ${totalPlayers} total`
    : `${stageCount || totalPlayers} ${(stageCount || totalPlayers) === 1 ? 'player' : 'players'} ready`;

  const isPaused = view.pausedMs != null || view.status === 'paused';
  const { ms, secs, total } = useCountdown(view.endsAt, view.pausedMs);
  const displaySecs = Math.max(0, secs);
  const initialMs = Math.max(1, (d.countdownSec ?? 7) * 1000);
  const denomMs = Math.max(1, initialMs, total, ms);
  const frac = Math.min(1, Math.max(0, ms / denomMs));
  const isUrgent = !isPaused && displaySecs >= 1 && displaySecs <= 3;
  const isGo = !isPaused && displaySecs === 0;

  const accentColor = isPaused
    ? '#FFD026'
    : isGo
      ? '#38EC82'
      : isUrgent
        ? '#FF5C6C'
        : displaySecs <= 5
          ? '#FFD026'
          : '#38EC82';

  const tip = GAME_TIPS[view.gameId];
  const animateMascot = !reduced;

  // Compact MC Preview Surface
  if (surface === 'mc') {
    return (
      <div className="rounded-2xl border border-gold/35 bg-night-3/90 p-4 space-y-3 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 right-0 h-28 w-40 rounded-full blur-2xl opacity-35"
          style={{ background: accentColor }}
        />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-2xl border border-white/12 bg-night-2 p-1.5 shrink-0">
              <MascotView name={meta.mascot} expression="cheer" size={52} animate={animateMascot} decorative />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${
                    isPaused ? 'bg-gold text-night' : isUrgent ? 'bg-coral text-night' : 'bg-leaf text-night'
                  }`}
                >
                  {isPaused ? 'Paused' : isGo ? 'Launching!' : 'Launch Countdown'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-cloud/80">
                  <Icon n="users" size={13} />
                  <span>{crewLabel}</span>
                </span>
              </div>
              <div className="font-bold text-white text-base truncate">{meta.name}</div>
              <div className="text-xs text-slate truncate">{meta.tagline}</div>
            </div>
          </div>

          <CountdownRing
            displaySecs={displaySecs}
            frac={frac}
            accentColor={accentColor}
            isPaused={isPaused}
            isUrgent={isUrgent}
            isGo={isGo}
            reduced={reduced}
            size={68}
          />
        </div>

        <CountdownBar frac={frac} isUrgent={isUrgent} isGo={isGo} isPaused={isPaused} heightClass="h-2.5" />

        <div className="relative z-10 flex items-start gap-2 rounded-xl border border-white/10 bg-night-2/85 px-3 py-2 text-xs text-cloud leading-snug">
          <Icon n="bolt" size={14} className="text-sky shrink-0 mt-0.5" />
          <span>{tip}</span>
        </div>
      </div>
    );
  }

  // Player Phone Surface
  if (surface === 'player') {
    return (
      <div className="space-y-4 my-auto a-pop">
        <div className="arcade-panel relative overflow-hidden p-5 sm:p-6 text-center space-y-5 border-white/15">
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-52 w-72 rounded-full blur-3xl ${
              !reduced && !isPaused ? 'animate-pulse' : ''
            }`}
            style={{ background: `${accentColor}30` }}
          />

          <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-gold/45 bg-gold/15 px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-gold">
            <Icon n="tv" size={14} />
            <span>{isGo ? 'Match Starting Now!' : 'Look up! Starting in…'}</span>
          </div>

          <div className="relative z-10 flex justify-center">
            <CountdownRing
              displaySecs={displaySecs}
              frac={frac}
              accentColor={accentColor}
              isPaused={isPaused}
              isUrgent={isUrgent}
              isGo={isGo}
              reduced={reduced}
              size={168}
            />
          </div>

          <div className="relative z-10">
            <CountdownBar frac={frac} isUrgent={isUrgent} isGo={isGo} isPaused={isPaused} heightClass="h-3" />
          </div>

          <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-white/12 bg-night-3/90 px-3.5 py-1 text-xs font-bold text-leaf">
            <Icon n="users" size={14} />
            <span>{crewLabel}</span>
          </div>
        </div>

        <div className="arcade-card p-4 flex items-center gap-3.5">
          <div className="rounded-2xl border border-white/12 bg-night-3 p-2 shrink-0">
            <MascotView name={meta.mascot} expression="cheer" size={64} animate={animateMascot} decorative />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="font-bold text-white fs-h3 leading-tight">{meta.name}</div>
            <div className="text-xs font-medium text-gold">{meta.tagline}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-sky/30 bg-night-2/95 px-4 py-3 flex items-start gap-2.5">
          <span className="rounded-lg bg-sky/15 p-1.5 text-sky shrink-0">
            <Icon n="bolt" size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-sky">How It Works</div>
            <p className="text-sm text-cloud leading-snug mt-0.5">{tip}</p>
          </div>
        </div>
      </div>
    );
  }

  // Projector Mobile Surface
  if (isMobile) {
    return (
      <div className="arcade-panel relative overflow-hidden p-5 text-center space-y-5 a-pop border-white/15">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-64 rounded-full blur-3xl ${
            !reduced && !isPaused ? 'animate-pulse' : ''
          }`}
          style={{ background: `${accentColor}30` }}
        />

        <div className="relative z-10 flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/45 bg-gold/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-gold">
            <Icon n="sparkle" size={13} />
            <span>{isPaused ? 'Countdown Paused' : 'Get Ready · Launching'}</span>
          </span>
          <h1 className="font-bold text-white text-2xl leading-tight">{meta.name}</h1>
          <p className="text-sm text-cloud/85">{meta.tagline}</p>
        </div>

        <div className="relative z-10 flex items-center justify-center gap-4">
          <CountdownRing
            displaySecs={displaySecs}
            frac={frac}
            accentColor={accentColor}
            isPaused={isPaused}
            isUrgent={isUrgent}
            isGo={isGo}
            reduced={reduced}
            size={156}
          />
          <div className="rounded-3xl border border-white/12 bg-night-3/90 p-3 shrink-0">
            <MascotView name={meta.mascot} expression="cheer" size={84} animate={animateMascot} decorative />
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <CountdownBar frac={frac} isUrgent={isUrgent} isGo={isGo} isPaused={isPaused} heightClass="h-3" />

          <div className="rounded-2xl border border-sky/30 bg-night-2/90 p-3.5 text-left flex items-start gap-2.5">
            <Icon n="bolt" size={16} className="text-sky shrink-0 mt-0.5" />
            <p className="text-sm text-cloud leading-snug">{tip}</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/35 bg-leaf/12 px-4 py-1 text-xs font-bold text-leaf">
            <Icon n="users" size={14} />
            <span>{crewLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  // Projector Desktop (1920x1080 Stadium Broadcast Stage)
  return (
    <div
      className="arcade-panel relative overflow-hidden p-12 border-white/15 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.95)] space-y-10"
      style={{ '--cd-accent': accentColor } as CSSProperties}
    >
      {/* Stadium atmospheric lighting */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-28 -right-24 h-[520px] w-[520px] rounded-full blur-3xl transition-colors duration-300 ${
          !reduced && !isPaused ? 'animate-pulse' : ''
        }`}
        style={{ background: `radial-gradient(circle, ${accentColor}38 0%, transparent 70%)` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-[440px] w-[440px] rounded-full bg-sky/18 blur-3xl"
      />

      <div className="relative z-10 grid grid-cols-[1.18fr_0.82fr] gap-12 items-center">
        {/* Left Broadcast Briefing */}
        <div className="space-y-6 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-gold/45 bg-gold/15 px-5 py-2 text-[22px] font-extrabold uppercase tracking-[0.22em] text-gold">
              <Icon n="sparkle" size={22} />
              <span>{isPaused ? 'Countdown Paused' : isGo ? 'Match Live!' : 'Get Ready · Launching'}</span>
            </span>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-leaf/40 bg-leaf/15 px-5 py-2 text-[22px] font-bold text-leaf">
              <Icon n="users" size={22} />
              <span>{crewLabel}</span>
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-bold text-white text-[76px] leading-[1.03] tracking-tight">
              {meta.name}
            </h1>
            <p className="text-[32px] font-medium text-cloud/85 leading-snug">
              {meta.tagline}
            </p>
          </div>

          <div className="arcade-card border-sky/35 p-6 flex items-start gap-5">
            <div className="rounded-2xl border border-sky/35 bg-sky/15 p-3.5 text-sky shrink-0">
              <Icon n="bolt" size={32} />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-[18px] font-bold uppercase tracking-[0.22em] text-sky">
                Get Ready · How It Works
              </div>
              <p className="text-[28px] font-semibold text-white leading-snug">
                {tip}
              </p>
            </div>
          </div>
        </div>

        {/* Right Stadium Countdown Ring + Cheering Mascot */}
        <div className="flex flex-col items-center justify-center gap-6">
          <CountdownRing
            displaySecs={displaySecs}
            frac={frac}
            accentColor={accentColor}
            isPaused={isPaused}
            isUrgent={isUrgent}
            isGo={isGo}
            reduced={reduced}
            size={340}
          />

          <div className="arcade-card px-7 py-4 flex items-center gap-5 border-white/15">
            <MascotView
              name={meta.mascot}
              expression="cheer"
              size={112}
              animate={!reduced && !preview}
              decorative
            />
            <div className="text-left">
              <div className="text-[18px] font-bold uppercase tracking-[0.2em] text-gold">
                Eyes on Your Phones
              </div>
              <div className="text-[26px] font-semibold text-white">
                {isPaused ? 'Host paused the launch' : isGo ? 'Here we go!' : 'First round starts next'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Stadium Progress Bar */}
      <div className="relative z-10 pt-1">
        <CountdownBar frac={frac} isUrgent={isUrgent} isGo={isGo} isPaused={isPaused} heightClass="h-4" />
      </div>
    </div>
  );
}

export default CountdownStage;
