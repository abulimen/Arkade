'use client';

import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import { MascotView, type MascotName } from '@/ui/mascots';

export function Waiting({ mascot = 'arky', title, body }: { mascot?: MascotName; title: string; body?: string }) {
  return (
    <div className="arcade-panel p-6 sm:p-7 text-center space-y-4 a-pop relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-56 rounded-full bg-sky/18 blur-3xl"
      />
      <div className="relative z-10 mx-auto w-fit rounded-3xl border border-white/12 bg-night-3/90 p-3.5 shadow-lg">
        <MascotView name={mascot} expression="happy" size={100} animate decorative />
      </div>
      <div className="relative z-10 space-y-1.5">
        <h2 className="font-bold text-white fs-h2 leading-tight">{title}</h2>
        {body && <p className="text-sm text-slate max-w-sm mx-auto leading-relaxed">{body}</p>}
      </div>
    </div>
  );
}

export function LockedIn({ sub }: { sub?: string }) {
  return (
    <div className="arcade-panel border-leaf/45 bg-leaf/10 p-6 sm:p-7 text-center space-y-4 a-pop shadow-[0_0_36px_-10px_rgba(56,236,130,0.45)]">
      <div className="mx-auto w-fit rounded-3xl border border-leaf/35 bg-night-2/90 p-3.5">
        <MascotView name="arky" expression="happy" size={88} animate decorative />
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-leaf px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-night shadow">
        <Icon n="check" size={16} />
        <span>{t('phone.lockedIn')}</span>
      </div>
      {sub && <p className="text-sm text-cloud leading-relaxed">{sub}</p>}
    </div>
  );
}

export function Feedback({ ok, gain, title, sub }: { ok: boolean; gain: number; title?: string; sub?: string }) {
  return (
    <div
      className={`arcade-panel p-5 sm:p-6 flex items-center gap-4 a-pop ${
        ok
          ? 'border-leaf/50 bg-leaf/12 shadow-[0_0_36px_-10px_rgba(56,236,130,0.42)]'
          : 'border-coral/50 bg-coral/12 shadow-[0_0_36px_-10px_rgba(255,92,108,0.35)]'
      }`}
    >
      <div className="rounded-2xl border border-white/12 bg-night-2/90 p-2 shrink-0">
        <MascotView name="arky" expression={ok ? 'cheer' : 'oops'} size={68} animate decorative />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-bold fs-h3 ${ok ? 'text-leaf' : 'text-coral'}`}>
            {title ?? t(ok ? 'state.correct' : 'state.wrong')}
          </span>
          {gain > 0 && (
            <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-extrabold text-night tabular-nums shadow">
              +{gain}
            </span>
          )}
        </div>
        {sub && <p className="text-sm text-cloud leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

export function Verse({ verse, refText, big = false }: { verse: string; refText: string; big?: boolean }) {
  return (
    <blockquote
      className={`rounded-3xl border border-gold/30 bg-night-2/95 space-y-3 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.8)] ${
        big ? 'p-8' : 'p-5'
      }`}
    >
      <p className={`font-serif italic text-cloud leading-relaxed ${big ? 'text-[30px]' : 'text-base sm:text-lg'}`}>
        “{verse}”
      </p>
      <footer>
        <span
          className={`inline-block rounded-full bg-gold font-bold text-night ${
            big ? 'px-5 py-1.5 text-[20px]' : 'px-3 py-1 text-xs'
          }`}
        >
          {refText}
        </span>
      </footer>
    </blockquote>
  );
}

export function ScrollCard({ children, big = false, className = '' }: { children: ReactNode; big?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-3xl border-2 border-gold/65 bg-plank text-night shadow-[0_24px_60px_-16px_rgba(0,0,0,0.9)] ${
        big ? 'p-9 text-[36px] leading-snug' : 'p-5 text-lg sm:text-xl leading-snug'
      } font-semibold ${className}`}
    >
      {children}
    </div>
  );
}

export function Pips({ n, total, label }: { n: number; total: number; label?: string }) {
  const safeTotal = Math.max(1, total);
  const segs = Math.min(safeTotal, 14);
  const filled = Math.round((Math.min(n, safeTotal) / safeTotal) * segs);
  return (
    <div className="rounded-2xl border border-white/10 bg-night-2/85 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-slate">
        <span>{label ?? t('screen.locked', { n, total })}</span>
        <span className="text-leaf tabular-nums">
          {n}/{total}
        </span>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${segs}, minmax(0, 1fr))` }} aria-hidden="true">
        {Array.from({ length: segs }, (_, idx) => (
          <span
            key={idx}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              idx < filled ? 'bg-leaf shadow-[0_0_8px_rgba(56,236,130,0.6)]' : 'bg-white/12'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function Progress({ n, total, label, big = false }: { n: number; total: number; label?: string; big?: boolean }) {
  const pct = total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 0;
  return (
    <div className={`rounded-2xl border border-white/10 bg-night-2/85 space-y-2.5 ${big ? 'px-6 py-4' : 'px-4 py-3'}`}>
      <div className={`flex items-center justify-between gap-3 font-bold text-cloud ${big ? 'text-[22px]' : 'text-xs uppercase tracking-wider'}`}>
        <span>{label ?? t('screen.locked', { n, total })}</span>
        <span className="text-gold tabular-nums">{pct}%</span>
      </div>
      <div className={`w-full overflow-hidden rounded-full bg-night-3 border border-white/8 ${big ? 'h-4' : 'h-2.5'}`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #38EC82 0%, #29C5FF 100%)' }}
        />
      </div>
    </div>
  );
}
