'use client';

import { t } from '@/i18n';
import type { McProps } from '../types';

interface G3McData {
  stage: 1 | 2 | 3;
  counts: { started: number; alive: number; finalists: number };
  answered?: number;
  total?: number;
}

export default function GideonsMc({ view }: McProps) {
  const d = view.data as G3McData;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gold/40 bg-gold/12 px-4 py-3 text-sm font-bold text-gold">
        {t('g3.mcStage', {
          stage: d.stage,
          alive: d.counts?.alive ?? 0,
          started: d.counts?.started ?? 0,
          fin: d.counts?.finalists ?? 0,
        })}
      </div>
      {d.stage === 3 && (
        <p className="text-xs text-slate">{t('g3.reaskHint')}</p>
      )}
    </div>
  );
}
