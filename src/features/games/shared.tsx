'use client';
import type { ReactNode } from 'react';
import { GAME_META } from '@/shared/types';
import type { GameId } from '@/shared/types';
import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import { MascotView } from '@/ui/mascots';
import type { Expression } from '@/ui/mascots';

export function Waiting({ game, expr = 'idle', title, body }: { game: GameId; expr?: Expression; title: string; body?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <MascotView name={GAME_META[game].mascot} expression={expr} size={128} />
      <h2 className="fs-h1">{title}</h2>
      {body && <p className="fs-body text-cloud">{body}</p>}
    </div>
  );
}

export function LockedIn() {
  return (
    <p className="a-pop flex items-center justify-center gap-2 rounded-2xl border-[3px] border-night bg-leaf px-4 py-3 fs-h2 text-night" role="status">
      <Icon n="check" size={28} />{t('phone.lockedIn')}
    </p>
  );
}

/** Correct / wrong feedback always pairs colour with an icon and a label. */
export function Feedback({ ok, gain, children }: { ok: boolean; gain?: number; children?: ReactNode }) {
  return (
    <div className={`a-pop flex items-center gap-3 rounded-2xl border-[3px] border-night px-4 py-3 text-night ${ok ? 'bg-leaf' : 'bg-coral'}`} role="status">
      <Icon n={ok ? 'check' : 'cross'} size={32} />
      <div className="flex-1"><div className="fs-h2">{ok ? t('state.correct') : t('state.wrong')}</div>{children && <div className="fs-small">{children}</div>}</div>
      {gain != null && gain !== 0 && <div className="fs-h1">{gain > 0 ? '+' : ''}{gain}</div>}
    </div>
  );
}

export function Verse({ text, refText, big }: { text: string; refText: string; big?: boolean }) {
  return (
    <blockquote className={`fs-verse italic ${big ? 'max-w-[1400px]' : ''}`}>
      “{text}”
      <footer className="fs-small not-italic text-gold">{refText} · KJV</footer>
    </blockquote>
  );
}

/** Fenn's paper scroll for Fake Verse prompts. */
export function ScrollCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-[28px] border-[6px] border-night bg-cloud px-12 py-8 text-night ${className}`}>
      <span className="absolute -left-4 top-6 bottom-6 w-6 rounded-full border-[4px] border-night bg-plank" aria-hidden="true" />
      <span className="absolute -right-4 top-6 bottom-6 w-6 rounded-full border-[4px] border-night bg-plank" aria-hidden="true" />
      {children}
    </div>
  );
}

export function Pips({ n, of, label }: { n: number; of: number; label: string }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label={label}>
      {Array.from({ length: of }, (_, i) => <span key={i} className={`h-3 flex-1 rounded-full ${i < n ? 'bg-gold' : 'bg-night-3'}`} />)}
    </div>
  );
}

export function Progress({ n, total, label }: { n: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-4" role="status" aria-label={label}>
      <div className="h-6 flex-1 rounded-full bg-night-3"><div className="h-full rounded-full bg-leaf transition-[width] duration-500" style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
      <span className="font-semibold text-white">{n}/{total}</span>
    </div>
  );
}
