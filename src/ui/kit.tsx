'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { RankEntry } from '@/shared/types';
import { RAINBOW } from '@/shared/types';
import { t } from '@/i18n';
import type { Conn } from '@/client/channel';
import { useCountdown, useReducedMotion } from '@/client/hooks';
import { haptic, play, playDrumroll, playUi } from '@/client/sound';
import { Avatar } from './avatars';
import { Icon, OliveLeaf, Shape } from './icons';
import { MascotView } from './mascots';

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
// Contrast: Night on Gold/Coral/Danger/Violet and White on Indigo all pass WCAG AA (verified in tests/a11y.test.ts).
const VARIANT: Record<Variant, string> = {
  primary: 'bg-gold text-night border-white/25 shadow-[0_10px_28px_-6px_rgba(255,208,38,0.45),inset_0_1px_0_rgba(255,255,255,0.6)]',
  secondary: 'bg-indigo text-white border-white/20 shadow-[0_10px_28px_-6px_rgba(88,86,214,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]',
  danger: 'bg-coral text-night border-white/20 shadow-[0_10px_28px_-6px_rgba(255,92,108,0.42),inset_0_1px_0_rgba(255,255,255,0.4)]',
  ghost: 'bg-night-3/90 text-cloud border-white/12 !shadow-none hover:bg-white/12 hover:border-white/25',
};

export function Button({ variant = 'primary', loading, small, className = '', children, onClick, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      disabled={p.disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        playUi(variant === 'ghost' ? 'ui-focus' : 'ui-press');
        haptic('press');
        onClick?.(e);
      }}
      className={`relative cursor-pointer press console-sheen inline-flex items-center justify-center gap-2 rounded-full border px-5 font-semibold fs-body whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${small ? 'min-h-12' : 'min-h-14'} ${VARIANT[variant]} ${className}`}
    >
      {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/* ---------- Timer ---------- */
export function TimerRing({ endsAt, pausedMs, size = 72 }: { endsAt: number | null; pausedMs?: number | null; size?: number }) {
  const { secs, ms, total } = useCountdown(endsAt, pausedMs ?? null);
  if (endsAt == null && pausedMs == null) return null;
  const color = secs > 5 ? '#38EC82' : secs > 2 ? '#FFD026' : '#FF5C6C';
  const frac = Math.min(1, ms / Math.max(1, total));
  const C = 2 * Math.PI * 44;
  return (
    <div
      className="relative inline-grid place-items-center rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
      style={{ width: size, height: size }}
      role="timer"
      aria-label={t('a11y.timeLeft', { n: secs })}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="#0C0E14" stroke="#1C2230" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke 240ms ease' }}
        />
      </svg>
      <span
        className={`absolute font-semibold text-white tabular-nums ${secs <= 5 && pausedMs == null ? 'animate-pulse text-coral' : ''}`}
        style={{ fontSize: size * 0.4 }}
        aria-hidden="true"
      >
        {pausedMs != null ? '⏸' : secs}
      </span>
    </div>
  );
}

export function PhaseBanner({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center gap-3 rounded-full border border-white/15 bg-night-2/95 px-6 py-2.5 text-center font-semibold text-white fs-h2 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl ${className}`}>
      <span className="h-2.5 w-2.5 rounded-full bg-leaf shadow-[0_0_10px_#38EC82] shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/* ---------- Answers (69c339f396b0707c3d3f99db5c39f985.jpg Attack-Card style) ---------- */
export type AnsState = 'idle' | 'selected' | 'locked' | 'correct' | 'wrong' | 'disabled';
const TONES = ['#FF5C6C', '#29C5FF', '#FF9A3D', '#38EC82', '#FFE14D', '#B56BFF'];

export function AnswerButton({ index, state = 'idle', tone, onClick, children, big, compact }: { index: number; state?: AnsState; tone?: boolean; onClick?: () => void; children: ReactNode; big?: boolean; compact?: boolean }) {
  const letter = 'ABCDEF'[index] ?? '?';
  const accent = TONES[index % 6];
  const bg =
    state === 'correct'
      ? '#38EC82'
      : state === 'wrong'
        ? '#FF5C6C'
        : tone
          ? accent
          : state === 'selected' || state === 'locked'
            ? '#FFD026'
            : '#141925';
  const dark = state === 'correct' || state === 'wrong' || tone || state === 'selected' || state === 'locked';
  const isLocked = state === 'locked' || state === 'selected';

  return (
    <button
      type="button"
      onClick={() => {
        playUi('ui-lock');
        haptic('lock');
        onClick?.();
      }}
      disabled={state === 'disabled' || state === 'locked' || state === 'correct' || state === 'wrong'}
      aria-pressed={isLocked}
      aria-label={`${letter}: ${typeof children === 'string' ? children : ''}${state === 'correct' ? ` ${t('state.correct')}` : state === 'wrong' ? ` ${t('state.wrong')}` : state === 'locked' ? ` ${t('state.locked')}` : ''}`}
      className={`relative cursor-pointer press console-sheen flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left font-semibold transition-all ${big ? 'min-h-24' : 'min-h-14'} ${
        isLocked
          ? 'border-white ring-2 ring-gold/80 shadow-[0_12px_30px_-6px_rgba(255,208,38,0.45)]'
          : state === 'correct'
            ? 'border-white/40 shadow-[0_12px_30px_-6px_rgba(56,236,130,0.45)]'
            : 'border-white/12 shadow-[0_10px_26px_-10px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.14)]'
      } ${state === 'disabled' ? 'opacity-45' : ''} ${dark ? 'text-night' : 'text-cloud'}`}
      style={{ background: bg }}
    >
      <span
        className={`grid flex-none place-items-center rounded-xl font-bold fs-body leading-none ${compact ? 'h-8 w-8' : big ? 'h-14 w-14' : 'h-9 w-9'} ${
          dark ? 'bg-night text-white' : 'bg-white/10 text-gold border border-white/15'
        }`}
        aria-hidden="true"
      >
        {letter}
      </span>
      {!compact && <Shape n={index} size={big ? 30 : 20} className={dark ? 'text-night' : 'text-cloud/85'} />}
      <span className="fs-body flex-1 leading-tight">{children}</span>
      {state === 'correct' && <span className="flex items-center gap-1 fs-small font-bold"><Icon n="check" size={20} />{t('state.correct')}</span>}
      {state === 'wrong' && <span className="flex items-center gap-1 fs-small font-bold"><Icon n="cross" size={20} />{t('state.wrong')}</span>}
      {isLocked && <Icon n="lock" size={18} />}
    </button>
  );
}

/* ---------- People ---------- */
export function PlayerChip({ p, score, size = 38, big }: { p: { nickname: string; avatar: number; color: number; kind?: string }; score?: number; size?: number; big?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-white/12 bg-night-2/95 py-1 pl-1 pr-3 ${big ? 'fs-body' : 'fs-small'} font-semibold text-cloud shadow-[0_6px_16px_rgba(0,0,0,0.45)]`}>
      <Avatar avatar={p.avatar} color={p.color} size={size} />
      {p.kind === 'team' && <Shape n={p.color} size={big ? 32 : 16} className="text-cloud" />}
      <span className="max-w-[11ch] truncate">{p.nickname}</span>
      {score != null && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-0.5 text-night font-bold tabular-nums">
          <OliveLeaf size={big ? 24 : 14} />{score}
        </span>
      )}
    </span>
  );
}

export function ConnectionPill({ conn }: { conn: Conn }) {
  const ok = conn === 'connected';
  const off = conn === 'offline' || conn === 'closed' || conn === 'kicked';
  const dotColor = ok ? '#38EC82' : off ? '#FF5C6C' : '#FFD026';
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/12 bg-night-2/90 px-3 text-cloud fs-small font-semibold" role="status">
      <span className={`h-2 w-2 rounded-full ${ok ? 'animate-pulse' : ''}`} style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}` }} aria-hidden="true" />
      <Icon n={off ? 'wifioff' : 'wifi'} size={14} style={{ color: dotColor }} />
      <span>{ok ? t('conn.connected') : off ? t('conn.offline') : t('conn.reconnecting')}</span>
    </span>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" className="a-slide fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/18 bg-night-2/95 px-4 py-3 text-white shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
      <MascotView name="olive" expression="worried" size={40} />
      <span className="fs-body font-semibold">{text}</span>
    </div>
  );
}

export function LiveRegion({ text }: { text: string }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{text}</div>;
}

/* ---------- Scores (leaderboard.jpg + Gold League III) ---------- */
export function Top5({
  entries,
  meId,
  big,
  suspense = false,
  endsAt = null,
  prevRanks,
}: {
  entries: RankEntry[];
  meId?: string;
  big?: boolean;
  /** Staged reveal on the TV: count up from the bottom, hold on 1st place, then reveal it. */
  suspense?: boolean;
  /** Phase end time, used to fit the reveal inside short result phases. */
  endsAt?: number | null;
  prevRanks?: Record<string, number>;
}) {
  const max = Math.max(1, ...entries.map((e) => e.score));
  const n = entries.length;
  // step 0: counting · 1..n-1: rows revealed bottom-up · n: holding on 1st place · n+1: everything shown
  const done = n + 1;
  const [step, setStep] = useState(suspense ? 0 : done);
  const endsAtRef = useRef(endsAt);

  useEffect(() => {
    if (!suspense) return;
    const COUNT = 1900;
    const ROW = 1250;
    const HOLD = 3400;
    const full = COUNT + Math.max(0, n - 1) * ROW + HOLD;
    const budget = endsAtRef.current ? endsAtRef.current - Date.now() - 1800 : full;
    const s = Math.min(1, Math.max(0.35, budget / full));
    const timers: number[] = [];
    let stopRoll: () => void = () => undefined;
    play('heartbeat');
    let at = COUNT * s;
    for (let k = 1; k < n; k++) {
      const kk = k;
      timers.push(window.setTimeout(() => { setStep(kk); play('thud'); }, at));
      at += ROW * s;
    }
    timers.push(window.setTimeout(() => { setStep(n); stopRoll = playDrumroll(HOLD * s / 1000 - 0.35); }, at));
    at += HOLD * s;
    timers.push(window.setTimeout(() => { stopRoll(); }, at - 350));
    timers.push(window.setTimeout(() => { setStep(done); play('hit'); }, at));
    timers.push(window.setTimeout(() => play('sparkle'), at + 260));
    return () => { timers.forEach((id) => window.clearTimeout(id)); stopRoll(); };
  }, [suspense, n, done]);

  const isRevealed = (idx: number) => {
    if (!suspense) return true;
    if (idx === 0) return step >= done;
    return step >= n - idx;
  };
  const holdingFirst = suspense && step === n;

  return (
    <div className="space-y-2.5">
      {suspense && step < done && (
        <div className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2 font-bold uppercase tracking-[0.22em] transition-colors ${holdingFirst ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/12 bg-night-3/80 text-cloud'} ${big ? 'text-base' : 'text-[11px]'}`}>
          <span key={step === 0 ? 'count' : holdingFirst ? 'first' : 'board'} className="rv-text">
            {step === 0 ? 'Counting the scores' : holdingFirst ? 'And in first place' : `This round's Top ${n}`}
          </span>
          {(step === 0 || holdingFirst) && (
            <span aria-hidden="true" className="inline-flex gap-0.5">
              <span className="rv-dot">.</span><span className="rv-dot">.</span><span className="rv-dot">.</span>
            </span>
          )}
        </div>
      )}
      <ol className={`flex flex-col ${big ? 'gap-3' : 'gap-2'}`} aria-label={t('score.top5')} aria-busy={suspense && step < done}>
        {entries.map((e, i) => {
          const shown = isRevealed(i);
          const isMe = e.id === meId;
          const rankStr = String(i + 1).padStart(2, '0');
          const prev = prevRanks?.[e.id];
          const delta = prev !== undefined ? prev - i : null;

          if (!shown) {
            const firstHold = i === 0 && holdingFirst;
            return (
              <li
                key={e.id}
                className={`relative overflow-hidden flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${
                  firstHold ? 'rv-throb border-gold/70 bg-gold/15' : 'border-white/8 bg-night-3/45'
                }`}
                style={firstHold ? ({ ['--rv-throb' as string]: '0.75s' } as React.CSSProperties) : undefined}
              >
                <span className={`font-semibold tabular-nums ${i === 0 ? 'text-gold' : 'text-cloud/40'} ${big ? 'text-2xl w-9' : 'text-sm w-6'}`}>
                  {rankStr}
                </span>
                <div className={`rounded-full grid place-items-center font-bold ${firstHold ? 'bg-gold/25 text-gold' : 'bg-white/6 text-cloud/30'} ${big ? 'h-[52px] w-[52px] text-2xl' : 'h-9 w-9 text-sm'}`}>
                  ?
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className={`rounded-full ${firstHold ? 'bg-gold/30' : 'bg-white/8'} ${big ? 'h-3.5 w-2/3' : 'h-2.5 w-1/2'} animate-pulse`} />
                  <div className={`rounded-full bg-white/5 ${big ? 'h-2.5' : 'h-1.5'}`} />
                </div>
                <span className={`rounded-full bg-night/70 border border-white/10 px-3 py-1 font-bold ${firstHold ? 'text-gold' : 'text-cloud/30'} ${big ? 'text-base' : 'text-xs'}`}>
                  ???
                </span>
              </li>
            );
          }

          return (
            <li
              key={e.id}
              className={`${suspense ? 'rv-row' : 'a-slide'} relative flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition ${
                i === 0 && suspense ? 'border-gold/60 bg-gold/12 shadow-[0_0_34px_-6px_rgba(255,208,38,0.55)]'
                : isMe ? 'border-leaf/45 bg-leaf/10'
                : 'border-white/8 bg-night-3/70'
              }`}
              style={suspense ? undefined : { animationDelay: `${i * 90}ms` }}
            >
              <span className={`font-semibold tabular-nums ${i === 0 ? 'text-gold' : i === 1 ? 'text-sky' : i === 2 ? 'text-plank' : 'text-cloud/65'} ${big ? 'text-2xl w-9' : 'text-sm w-6'}`}>
                {rankStr}
              </span>
              <Avatar avatar={e.avatar} color={e.color} size={big ? 52 : 36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`truncate font-semibold ${isMe ? 'text-leaf' : 'text-white'} ${big ? 'fs-body' : 'fs-small'}`}>
                    {e.nickname}
                    {isMe ? ` (${t('score.you')})` : ''}
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${delta > 0 ? 'bg-leaf/20 text-leaf' : 'bg-coral/20 text-coral'}`}>
                      {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`}
                    </span>
                  )}
                </div>
                <div className={`rounded-full bg-night/90 ${big ? 'h-2.5' : 'h-1.5'} mt-1.5 overflow-hidden`}>
                  <div
                    className="a-grow h-full rounded-full"
                    style={{
                      width: `${Math.max(8, (e.score / max) * 100)}%`,
                      background: i === 0 ? 'linear-gradient(90deg, #FFD026, #38EC82)' : 'linear-gradient(90deg, #29C5FF, #38EC82)',
                      animationDuration: suspense ? '1100ms' : undefined,
                    }}
                  />
                </div>
              </div>
              <span className={`flex shrink-0 items-center gap-1.5 rounded-full bg-night/80 border border-white/10 px-3 py-1 font-semibold text-white tabular-nums ${big ? 'fs-body' : 'fs-small'}`}>
                <OliveLeaf size={big ? 24 : 16} />{e.score}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** 3D Monolith Podium with optional staged #3 -> #2 -> #1 reveal. */
export function Podium({ entries, big, revealedUpTo = 3 }: { entries: RankEntry[]; big?: boolean; revealedUpTo?: number }) {
  const order = [entries[1], entries[0], entries[2]];
  const heights = big ? [220, 310, 165] : [76, 108, 56];
  const place = [2, 1, 3];
  const crownColors = ['#D0D7E2', '#FFD026', '#E2A83B'];

  return (
    <div className={`flex items-end justify-center ${big ? 'gap-6' : 'gap-2.5'}`}>
      {order.map((e, i) => {
        if (!e) return null;
        const p = place[i];
        // Reveal order: #3 (step 1), #2 (step 2), #1 (step 3)
        const shown = p === 3 ? revealedUpTo >= 1 : p === 2 ? revealedUpTo >= 2 : revealedUpTo >= 3;
        return (
          <div key={e.id} className="flex flex-col items-center">
            <div
              className={`mb-1.5 inline-flex items-center justify-center rounded-full border border-white/15 bg-night-2 px-2.5 py-0.5 text-xs font-bold ${big ? 'text-xl px-3.5 py-1' : ''}`}
              style={{ color: crownColors[i] }}
            >
              <Icon n="crown" size={big ? 28 : 14} className="mr-1" />
              #{p}
            </div>

            {shown ? (
              <div className="a-pop flex flex-col items-center">
                <div className={`rounded-full p-1 ${p === 1 ? 'ring-2 ring-leaf shadow-[0_0_24px_rgba(56,236,130,0.45)]' : 'ring-1 ring-white/20'}`}>
                  <Avatar avatar={e.avatar} color={e.color} size={big ? (p === 1 ? 136 : 112) : (p === 1 ? 64 : 52)} label={e.nickname} />
                </div>
                <div className={`max-w-[10ch] truncate font-semibold text-white mt-2 ${big ? 'fs-h2' : 'fs-small'}`}>{e.nickname}</div>
                <span className={`mb-3 mt-1 inline-flex items-center gap-1 rounded-full bg-night-2 border border-white/12 px-3 py-0.5 font-semibold text-gold tabular-nums ${big ? 'fs-body px-4 py-1' : 'text-xs'}`}>
                  <OliveLeaf size={big ? 24 : 14} />{e.score}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className={`rounded-full border-2 border-dashed grid place-items-center font-bold animate-pulse ${
                    p === 1 ? 'border-gold/70 bg-gold/15 text-gold' : 'border-white/25 bg-night-3/80 text-cloud/60'
                  }`}
                  style={{
                    width: big ? (p === 1 ? 144 : 120) : (p === 1 ? 72 : 60),
                    height: big ? (p === 1 ? 144 : 120) : (p === 1 ? 72 : 60),
                    fontSize: big ? 44 : 22,
                  }}
                >
                  ?
                </div>
                <div className={`font-semibold text-gold/80 mt-2 ${big ? 'fs-h2' : 'fs-small'}`}>
                  ???
                </div>
                <span className={`mb-3 mt-1 inline-flex items-center gap-1 rounded-full bg-night-2 border border-white/10 px-3 py-0.5 font-semibold text-cloud/50 ${big ? 'fs-body px-4 py-1' : 'text-xs'}`}>
                  •••
                </span>
              </div>
            )}

            <div className={`flex flex-col items-stretch overflow-hidden rounded-t-2xl ${big ? 'w-[260px]' : 'w-[96px]'}`}>
              <div className={`podium-bevel ${big ? 'h-5' : 'h-2.5'} w-full`} style={{ clipPath: 'polygon(6% 0%, 94% 0%, 100% 100%, 0% 100%)' }} aria-hidden="true" />
              <div className="podium-monolith grid place-items-center relative overflow-hidden" style={{ height: heights[i] }}>
                <span
                  className={`font-bold tabular-nums select-none ${big ? 'text-[148px]' : 'text-[46px]'} leading-none text-leaf/15`}
                  aria-hidden="true"
                >
                  {p}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VoteBars({ items, big }: { items: { id: string; label: string; sub?: string; votes: number; color?: string }[]; big?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.votes));
  return (
    <ul className={`flex flex-col ${big ? 'gap-5' : 'gap-2.5'}`}>
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-4">
          <div className={`flex-none ${big ? 'w-[460px]' : 'w-32'} truncate font-semibold text-white ${big ? 'fs-body' : 'fs-small'}`}>
            {it.label}
            {it.sub && <span className="block fs-small text-cloud/70">{it.sub}</span>}
          </div>
          <div className={`flex-1 rounded-full bg-night-3 border border-white/8 p-0.5 ${big ? 'h-12' : 'h-5'}`}>
            <div className="a-grow h-full rounded-full" style={{ width: `${Math.max(it.votes ? 8 : 0, (it.votes / max) * 100)}%`, background: it.color ?? RAINBOW[i % 6], animationDelay: `${i * 280}ms` }} />
          </div>
          <span className={`w-16 flex-none text-right font-semibold text-white tabular-nums ${big ? 'fs-h2' : 'fs-body'}`}>{it.votes}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Brand pieces ---------- */
export function Waves({ className = '' }: { className?: string }) {
  const d = useMemo(() => 'M0 60' + 'q120 -50 240 0'.concat(' t240 0'.repeat(15)) + 'V120H0Z', []);
  return (
    <div className={`pointer-events-none overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 3840 120" preserveAspectRatio="none" className="a-wave-slow absolute bottom-0 h-full w-[200%] opacity-25"><path d={d} fill="#29C5FF" /></svg>
      <svg viewBox="0 0 3840 120" preserveAspectRatio="none" className="a-wave absolute bottom-0 h-3/4 w-[200%] opacity-30"><path d={d} fill="#38EC82" /></svg>
    </div>
  );
}

export function RainbowBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-night-3 overflow-hidden border border-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, value * 100)}%`, background: `linear-gradient(90deg, ${RAINBOW.join(',')})` }} />
    </div>
  );
}

/** Arkade main logo image (`Arkade Ark and Cross Emblem.png`). */
export function Wordmark({ size = 34, stacked = false }: { size?: number; stacked?: boolean }) {
  const height = Math.round(size * (stacked ? 1.3 : 1.35));
  return (
    <span className="inline-flex items-center select-none" aria-label="Arkade">
      <img
        src="/imgs/Arkade%20Ark%20and%20Cross%20Emblem.png"
        alt="Arkade"
        style={{ height, width: 'auto' }}
        className="object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]"
      />
    </span>
  );
}

export function RoomCodeCard({ code, big }: { code: string; big?: boolean }) {
  const chars = code.split('');
  return (
    <div className="inline-flex flex-col items-start gap-2.5" role="group" aria-label={`${t('lobby.code')} ${chars.join(' ')}`}>
      <span className={`inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3.5 py-1 font-semibold uppercase tracking-widest text-gold ${big ? 'text-2xl px-5 py-1.5' : 'text-xs'}`}>
        <span className="h-2 w-2 rounded-full bg-gold animate-pulse" aria-hidden="true" />
        {t('lobby.code')}
      </span>
      <div className={`flex items-center ${big ? 'gap-5' : 'gap-2.5'}`} aria-hidden="true">
        {chars.map((c, idx) => (
          <div
            key={idx}
            className={`grid place-items-center rounded-2xl border border-gold/40 bg-night-2/95 font-bold text-white shadow-[0_14px_34px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.16)] ${
              big ? 'h-[168px] w-[140px] text-[108px] leading-none rounded-3xl' : 'h-16 w-14 text-3xl'
            }`}
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Hold-to-peek secret card that hides the screen from neighbors until pressed. */
export function SecretCard({ children, hint }: { children: ReactNode; hint: string }) {
  const [peek, setPeek] = useState(false);

  const open = () => {
    setPeek((prev) => {
      if (!prev) {
        playUi('ui-lock');
        haptic('lock');
      }
      return true;
    });
  };
  const close = () => {
    setPeek((prev) => {
      if (prev) playUi('ui-back');
      return false;
    });
  };

  return (
    <button
      type="button"
      aria-pressed={peek}
      onPointerDown={open}
      onPointerUp={close}
      onPointerLeave={close}
      onPointerCancel={close}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') open(); }}
      onKeyUp={close}
      onBlur={close}
      className={`cursor-pointer relative flex min-h-56 w-full touch-none select-none flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border p-6 text-center transition-all duration-300 ${
        peek
          ? 'border-gold bg-cloud text-night shadow-[0_24px_60px_-10px_rgba(255,208,38,0.45)]'
          : 'border-white/15 bg-night-2/95 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.14)]'
      }`}
    >
      {peek ? (
        children
      ) : (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-24 w-12 flex-col items-center justify-between rounded-full border border-white/20 bg-white/95 p-1.5 shadow-[0_0_24px_rgba(255,255,255,0.2)]" aria-hidden="true">
              <div className="flex flex-col items-center -space-y-1.5 text-night/70 a-chevron">
                <Icon n="chevronUp" size={14} />
                <Icon n="chevronUp" size={14} />
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-coral text-white shadow-inner">
                <Icon n="eye" size={16} />
              </span>
            </div>
            <span className="fs-h2 text-white mt-1">{hint}</span>
            <span className="text-xs font-medium text-cloud/65">Press &amp; hold anywhere on card</span>
          </div>
        </>
      )}
    </button>
  );
}

/* ---------- Confetti (canvas, projector only) ---------- */
export function Confetti({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const cv = ref.current;
    if (!active || reduced || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = (cv.width = 1920), H = (cv.height = 1080);
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -Math.random() * H, s: 10 + Math.random() * 14, v: 4 + Math.random() * 6, c: RAINBOW[Math.floor(Math.random() * 6)], r: Math.random() * 6, w: Math.random() * 0.1 }));
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.y += p.v; p.r += p.w; p.x += Math.sin(p.r) * 2;
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
      if (now - start < 9000) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 h-full w-full" />;
}

/* ---------- Projector stage: 1920x1080 on widescreen/preview, portrait phone reflow ---------- */
const StageModeContext = createContext(false);
export const useStageMobile = () => useContext(StageModeContext);

export function Stage({ children, fit = 'window' }: { children: ReactNode; fit?: 'window' | 'parent' }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [mobileMode, setMobileMode] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (fit === 'window' && w < 700 && h > w * 1.05) {
        setMobileMode(true);
      } else {
        setMobileMode(false);
        setScale(Math.min(w / 1920, h / 1080));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const toggleFullscreen = () => {
    playUi('ui-press');
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  if (fit === 'window' && mobileMode) {
    return (
      <StageModeContext.Provider value={true}>
        <div ref={wrap} className="stage-mobile min-h-dvh w-full overflow-y-auto bg-abyss text-cloud p-4 pb-12">
          <div className="mx-auto max-w-xl flex flex-col gap-5">{children}</div>
        </div>
      </StageModeContext.Provider>
    );
  }

  return (
    <StageModeContext.Provider value={false}>
      <div ref={wrap} className={fit === 'window' ? 'fixed inset-0 overflow-hidden bg-abyss' : 'relative aspect-video w-full overflow-hidden rounded-2xl border border-white/12 bg-abyss'}>
        {fit === 'window' && (
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
            className="cursor-pointer fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-night-2/85 px-3.5 py-2 text-xs font-semibold text-cloud/85 opacity-50 hover:opacity-100 transition backdrop-blur-xl"
          >
            <Icon n="maximize" size={15} />
            <span>Fullscreen</span>
          </button>
        )}
        <div className="stage console-grid-bg absolute left-1/2 top-1/2 origin-center overflow-hidden bg-night text-cloud" style={{ width: 1920, height: 1080, transform: `translate(-50%,-50%) scale(${scale})` }}>
          {children}
        </div>
      </div>
    </StageModeContext.Provider>
  );
}

/* ---------- ViewportModal (Portaled to document.body so parent transforms/filters never trap fixed overlays) ---------- */
export function ViewportModal({
  open,
  onClose,
  ariaLabel,
  maxWidth = 'max-w-md',
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  maxWidth?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[120] overflow-y-auto bg-black/82 backdrop-blur-md p-4 flex items-center justify-center a-fade"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} my-auto a-pop relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
