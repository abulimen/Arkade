'use client';

import { t } from '@/i18n';
import { Button } from '@/ui/kit';
import type { McProps } from '../types';

interface WolfMcData {
  currentTurn?: string | null;
  mcClues?: { i: number; nick: string; text: string; hidden: boolean }[];
  log?: string[];
}

export default function SpotWolfMc({ view, mc }: McProps) {
  const d = view.data as WolfMcData;
  const clues = d.mcClues ?? [];

  return (
    <div className="space-y-3">
      {d.currentTurn && (
        <div className="rounded-2xl border border-gold/40 bg-gold/12 px-4 py-2.5 text-sm font-bold text-gold">
          {t('wolf.turnOf', { name: d.currentTurn })}
        </div>
      )}

      {clues.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-slate">{t('wolf.clues')}</div>
          {clues.map((c) => (
            <div
              key={c.i}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-3/80 px-3.5 py-2"
            >
              <div className="min-w-0">
                <span className="text-xs font-bold text-gold mr-2">{c.nick}</span>
                <span className={`text-sm ${c.hidden ? 'line-through text-slate' : 'text-white font-medium'}`}>
                  {c.text}
                </span>
              </div>
              <Button variant="ghost" small onClick={() => mc('HIDE_ANSWER', { index: c.i })}>
                {c.hidden ? t('mc.hidden') : t('mc.hide')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
