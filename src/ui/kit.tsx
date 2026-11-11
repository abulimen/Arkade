'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { RankEntry } from '@/shared/types';
import { RAINBOW } from '@/shared/types';
import { t } from '@/i18n';
import type { Conn } from '@/client/channel';
import { useCountdown, useReducedMotion } from '@/client/hooks';
import { Avatar } from './avatars';
import { Icon, OliveLeaf, Shape } from './icons';
import { MascotView } from './mascots';

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
// Contrast: Night on Gold/Coral/Danger/Violet and White on Indigo all pass WCAG AA (verified in tests/a11y.test.ts).
const VARIANT: Record<Variant, string> = {
  primary: 'bg-gold text-night border-night',
  secondary: 'bg-indigo text-white border-night',
  danger: 'bg-coral text-night border-night',
  ghost: 'bg-transparent text-cloud border-cloud/60 !shadow-none',
};
export function Button({ variant = 'primary', loading, small, className = '', children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      disabled={p.disabled || loading}
      aria-busy={loading || undefined}
      className={`press chunky inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] px-5 font-semibold fs-body disabled:opacity-50 ${small ? 'min-h-12' : 'min-h-14'} ${VARIANT[variant]} ${className}`}
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
  const color = secs > 5 ? '#3DD68C' : secs > 2 ? '#FFE14D' : '#FF5C6C';
  const frac = Math.min(1, ms / Math.max(1, total));
  const C = 2 * Math.PI * 44;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="timer" aria-label={t('a11y.timeLeft', { n: secs })}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="#1E1B55" stroke="#2A2670" strokeWidth="10" />
        <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <span className={`absolute font-semibold text-white ${secs <= 5 && pausedMs == null ? 'animate-pulse' : ''}`} style={{ fontSize: size * 0.42 }} aria-hidden="true">{pausedMs != null ? '⏸' : secs}</span>
    </div>
  );
}

export function PhaseBanner({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border-[3px] border-night bg-plank px-4 py-2 text-center font-semibold text-night fs-h2 chunky ${className}`}>{children}</div>;
}

/* ---------- Answers ---------- */
export type AnsState = 'idle' | 'selected' | 'locked' | 'correct' | 'wrong' | 'disabled';
const TONES = ['#FF5C6C', '#3DB8FF', '#FF9A3D', '#3DD68C', '#FFE14D', '#B15CFF'];
export function AnswerButton({ index, state = 'idle', tone, onClick, children, big, compact }: { index: number; state?: AnsState; tone?: boolean; onClick?: () => void; children: ReactNode; big?: boolean; compact?: boolean }) {
  const letter = 'ABCDEF'[index] ?? '?';
  const bg = state === 'correct' ? '#3DD68C' : state === 'wrong' ? '#FF5C6C' : tone ? TONES[index % 6] : state === 'selected' ? '#FFC83D' : '#2A2670';
  const dark = state === 'correct' || state === 'wrong' || tone || state === 'selected';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'disabled' || state === 'locked' || state === 'correct' || state === 'wrong'}
      aria-pressed={state === 'selected' || state === 'locked'}
      aria-label={`${letter}: ${typeof children === 'string' ? children : ''}${state === 'correct' ? ` ${t('state.correct')}` : state === 'wrong' ? ` ${t('state.wrong')}` : state === 'locked' ? ` ${t('state.locked')}` : ''}`}
      className={`press flex w-full items-center gap-3 rounded-2xl border-[3px] px-3 text-left font-semibold chunky ${big ? 'min-h-24' : 'min-h-14'} ${state === 'selected' || state === 'locked' ? 'border-gold ring-2 ring-white' : 'border-night'} ${state === 'disabled' ? 'opacity-50' : ''} ${dark ? 'text-night' : 'text-cloud'}`}
      style={{ background: bg }}
    >
      <span className={`grid flex-none place-items-center rounded-full border-[3px] border-night bg-white text-night fs-body ${compact ? 'h-8 w-8' : 'h-9 w-9'}`} aria-hidden="true">{letter}</span>
      {!compact && <Shape n={index} size={22} className={dark ? 'text-night' : 'text-cloud'} />}
      <span className="fs-body flex-1 leading-tight">{children}</span>
      {state === 'correct' && <span className="flex items-center gap-1 fs-small"><Icon n="check" size={22} />{t('state.correct')}</span>}
      {state === 'wrong' && <span className="flex items-center gap-1 fs-small"><Icon n="cross" size={22} />{t('state.wrong')}</span>}
      {(state === 'locked' || state === 'selected') && <Icon n="lock" size={20} />}
    </button>
  );
}

/* ---------- People ---------- */
export function PlayerChip({ p, score, size = 40, big }: { p: { nickname: string; avatar: number; color: number; kind?: string }; score?: number; size?: number; big?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full bg-night-3 py-1 pl-1 pr-3 ${big ? 'fs-body' : 'fs-small'} font-semibold text-cloud`}>
      <Avatar avatar={p.avatar} color={p.color} size={size} />
      {p.kind === 'team' && <Shape n={p.color} size={big ? 36 : 18} className="text-cloud" />}
      <span className="max-w-[10ch] truncate">{p.nickname}</span>
      {score != null && <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 text-night"><OliveLeaf size={big ? 28 : 14} />{score}</span>}
    </span>
  );
}

export function ConnectionPill({ conn }: { conn: Conn }) {
  const ok = conn === 'connected';
  const off = conn === 'offline' || conn === 'closed' || conn === 'kicked';
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-night-3 px-3 text-cloud fs-small" role="status">
      <Icon n={off ? 'wifioff' : 'wifi'} size={16} style={{ color: ok ? '#2ED573' : off ? '#FF4757' : '#FFA502' }} />
      {ok ? t('conn.connected') : off ? t('conn.offline') : t('conn.reconnecting')}
    </span>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" className="a-slide fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border-[3px] border-night bg-cloud px-3 py-2 text-night chunky">
      <MascotView name="olive" expression="worried" size={44} />
      <span className="fs-body font-semibold">{text}</span>
    </div>
  );
}

export function LiveRegion({ text }: { text: string }) {
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{text}</div>;
}

/* ---------- Scores ---------- */
export function Top5({ entries, meId, big }: { entries: RankEntry[]; meId?: string; big?: boolean }) {
  const max = Math.max(1, ...entries.map((e) => e.score));
  return (
    <ol className={`flex flex-col ${big ? 'gap-3' : 'gap-2'}`} aria-label={t('score.top5')}>
      {entries.map((e, i) => (
        <li key={e.id} className="a-slide flex items-center gap-3" style={{ animationDelay: `${i * 120}ms` }}>
          <span className={`grid flex-none place-items-center rounded-full bg-gold font-semibold text-night ${big ? 'h-14 w-14 fs-body' : 'h-8 w-8 fs-small'}`}>{i + 1}</span>
          <Avatar avatar={e.avatar} color={e.color} size={big ? 64 : 36} />
          <div className="min-w-0 flex-1">
            <div className={`truncate font-semibold ${e.id === meId ? 'text-gold' : 'text-cloud'} ${big ? 'fs-body' : 'fs-small'}`}>{e.nickname}{e.id === meId ? ` (${t('score.you')})` : ''}</div>
            <div className={`rounded-full bg-night-3 ${big ? 'h-5' : 'h-2.5'}`}><div className="a-grow h-full rounded-full bg-leaf" style={{ width: `${(e.score / max) * 100}%`, animationDelay: `${i * 120}ms` }} /></div>
          </div>
          <span className={`flex items-center gap-1 font-semibold text-white ${big ? 'fs-body' : 'fs-small'}`}><OliveLeaf size={big ? 36 : 18} />{e.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function Podium({ entries, big }: { entries: RankEntry[]; big?: boolean }) {
  const order = [entries[1], entries[0], entries[2]];
  const heights = big ? [260, 380, 190] : [64, 96, 48];
  const place = [2, 1, 3];
  return (
    <div className={`flex items-end justify-center ${big ? 'gap-10' : 'gap-3'}`}>
      {order.map((e, i) => e && (
        <div key={e.id} className="a-pop flex flex-col items-center" style={{ animationDelay: `${(2 - i) * 500}ms` }}>
          {place[i] === 1 && <MascotView name="arky" expression="cheer" size={big ? 280 : 72} />}
          <Avatar avatar={e.avatar} color={e.color} size={big ? 180 : 56} label={e.nickname} />
          <div className={`max-w-[8ch] truncate font-semibold text-white ${big ? 'fs-h2' : 'fs-small'}`}>{e.nickname}</div>
          <div className={`grid w-full min-w-[5rem] place-items-center rounded-t-2xl border-[3px] border-night bg-plank font-semibold text-night ${big ? 'fs-h1 min-w-[320px]' : 'fs-h2'}`} style={{ height: heights[i] }}>
            <span>{place[i]}</span><span className={`flex items-center gap-1 ${big ? 'fs-body' : 'fs-small'}`}><OliveLeaf size={big ? 32 : 16} />{e.score}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VoteBars({ items, big }: { items: { id: string; label: string; sub?: string; votes: number; color?: string }[]; big?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.votes));
  return (
    <ul className={`flex flex-col ${big ? 'gap-5' : 'gap-2'}`}>
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-4">
          <div className={`flex-none ${big ? 'w-[520px]' : 'w-32'} truncate font-semibold text-white ${big ? 'fs-body' : 'fs-small'}`}>{it.label}{it.sub && <span className="block fs-small text-cloud/80">{it.sub}</span>}</div>
          <div className={`flex-1 rounded-full bg-night-3 ${big ? 'h-12' : 'h-5'}`}>
            <div className="a-grow h-full rounded-full" style={{ width: `${Math.max(it.votes ? 6 : 0, (it.votes / max) * 100)}%`, background: it.color ?? RAINBOW[i % 6], animationDelay: `${i * 450}ms` }} />
          </div>
          <span className={`w-20 flex-none text-right font-semibold text-white ${big ? 'fs-h2' : 'fs-body'}`}>{it.votes}</span>
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
      <svg viewBox="0 0 3840 120" preserveAspectRatio="none" className="a-wave-slow absolute bottom-0 h-full w-[200%] opacity-70"><path d={d} fill="#6C5CE7" /></svg>
      <svg viewBox="0 0 3840 120" preserveAspectRatio="none" className="a-wave absolute bottom-0 h-3/4 w-[200%]"><path d={d} fill="#3DB8FF" /></svg>
    </div>
  );
}

export function RainbowBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="h-3 w-full rounded-full bg-night-3" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, value * 100)}%`, background: `linear-gradient(90deg, ${RAINBOW.join(',')})` }} />
    </div>
  );
}

export function Wordmark({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-white" style={{ fontSize: size }} aria-label="Arkade">
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"><path d="M6 30H42C41 40 34 44 24 44C14 44 7 40 6 30Z" fill="#C98A4B" stroke="#14123B" strokeWidth="2.5" strokeLinejoin="round" /><path d="M10 28L24 8L38 28Z" fill="#FFC83D" stroke="#14123B" strokeWidth="2.5" strokeLinejoin="round" /></svg>
      <span aria-hidden="true">Ark<span className="relative">k<svg viewBox="0 0 24 10" width={size * 0.5} height={size * 0.2} className="absolute -top-1 left-0"><path d="M2 9a10 10 0 0 1 20 0" stroke="#FF5C6C" strokeWidth="2" fill="none" /><path d="M5 9a7 7 0 0 1 14 0" stroke="#3DB8FF" strokeWidth="2" fill="none" /></svg></span>ade</span>
    </span>
  );
}

export function RoomCodeCard({ code, big }: { code: string; big?: boolean }) {
  return (
    <div className="rounded-3xl border-[3px] border-night bg-plank px-6 py-3 text-center chunky" role="group" aria-label={`${t('lobby.code')} ${code.split('').join(' ')}`}>
      <div className={`font-semibold text-night ${big ? 'fs-small' : 'fs-small'}`}>{t('lobby.code')}</div>
      <div className={`font-semibold tracking-[0.2em] text-night ${big ? 'text-[190px] leading-none' : 'fs-display'}`} aria-hidden="true">{code}</div>
    </div>
  );
}

/** Hold to peek: the secret is only visible while the finger is down (avoids shoulder-surfing). */
export function SecretCard({ children, hint }: { children: ReactNode; hint: string }) {
  const [peek, setPeek] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={peek}
      onPointerDown={() => setPeek(true)}
      onPointerUp={() => setPeek(false)}
      onPointerLeave={() => setPeek(false)}
      onPointerCancel={() => setPeek(false)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setPeek(true); }}
      onKeyUp={() => setPeek(false)}
      onBlur={() => setPeek(false)}
      className="flex min-h-48 w-full touch-none select-none flex-col items-center justify-center gap-2 rounded-3xl border-[3px] border-night p-4 text-center chunky"
      style={{ background: peek ? '#F4F1FF' : '#6C5CE7', color: peek ? '#14123B' : '#fff', transition: 'background 220ms var(--ease)' }}
    >
      {peek ? children : (<><Icon n="eyeoff" size={40} /><span className="fs-h2">{hint}</span></>)}
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
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); // pixel-sparkle squares
      }
      if (now - start < 9000) raf = requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced]);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 h-full w-full" />;
}

/* ---------- Projector stage: fixed 1920x1080 scaled to fit ---------- */
export function Stage({ children, fit = 'window' }: { children: ReactNode; fit?: 'window' | 'parent' }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => setScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={wrap} className={fit === 'window' ? 'fixed inset-0 overflow-hidden bg-night' : 'relative aspect-video w-full overflow-hidden rounded-xl bg-night'}>
      <div className="stage absolute left-1/2 top-1/2 origin-center overflow-hidden bg-night text-cloud" style={{ width: 1920, height: 1080, transform: `translate(-50%,-50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
