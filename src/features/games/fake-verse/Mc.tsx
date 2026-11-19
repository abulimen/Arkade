'use client';

import { t } from '@/i18n';
import { Button } from '@/ui/kit';
import type { McProps } from '../types';

interface FakeMcData {
  text?: string;
  submitted?: number;
  voted?: number;
  total: number;
  submissions?: { pid: string; nick: string; text: string; hidden: boolean }[];
  options?: { id: string; text: string; by?: string[] }[];
  result?: { truth: string; ref: string; correct: number };
}

export default function FakeVerseMc({ view, mc }: McProps) {
  const d = view.data as FakeMcData;
  const p = view.phase;

  if (p === 'prompt') {
    return (
      <div className="rounded-2xl border border-sky/35 bg-sky/10 px-4 py-3 text-sm text-cloud">
        <span className="text-xs font-bold uppercase tracking-widest text-sky block mb-1">{t('fv.read')}</span>
        <span>{d.text}</span>
      </div>
    );
  }

  if (p === 'write') {
    const subs = d.submissions ?? [];
    return (
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-widest text-leaf">
          {t('screen.submitted', { n: d.submitted ?? 0, total: d.total })}
        </div>
        {subs.map((s) => (
          <div
            key={s.pid}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-3/80 px-3.5 py-2"
          >
            <div className="min-w-0">
              <span className="text-xs font-bold text-gold mr-2">{s.nick}</span>
              <span className={`text-sm ${s.hidden ? 'line-through text-slate' : 'text-white font-medium'}`}>
                {s.text}
              </span>
            </div>
            <Button variant="ghost" small onClick={() => mc('HIDE_ANSWER', { playerId: s.pid })}>
              {s.hidden ? t('mc.hidden') : t('mc.hide')}
            </Button>
          </div>
        ))}
      </div>
    );
  }

  if (p === 'vote') {
    const opts = d.options ?? [];
    return (
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-widest text-sky">
          {t('screen.voted', { n: d.voted ?? 0, total: d.total })}
        </div>
        {opts.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-3/80 px-3.5 py-2"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{o.text}</div>
              {o.by && <div className="text-xs text-slate">{t('fv.by', { name: o.by.join(', ') })}</div>}
            </div>
            <Button variant="ghost" small onClick={() => mc('HIDE_ANSWER', { optionId: o.id })}>
              {t('mc.hide')}
            </Button>
          </div>
        ))}
      </div>
    );
  }

  if (p === 'reveal' && d.result) {
    return (
      <div className="rounded-2xl border border-leaf/35 bg-leaf/10 px-4 py-3 space-y-1 text-sm">
        <div className="text-xs font-bold uppercase tracking-widest text-leaf">{t('fv.truth')}</div>
        <div className="font-bold text-white">{d.result.truth}</div>
        <div className="text-xs text-slate">{d.result.ref} · {t('fv.gotItRight', { n: d.result.correct })}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-night-3/70 px-4 py-3 text-sm font-semibold text-cloud">
      {t('ph.end')}
    </div>
  );
}
