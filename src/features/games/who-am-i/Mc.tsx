'use client';

import { t } from '@/i18n';
import type { McProps } from '../types';

interface WaiMcData {
  clueIndex?: number;
  clues?: string[];
  locked?: number;
  total?: number;
  result?: { name: string; ref: string };
}

export default function WhoAmIMc({ view }: McProps) {
  const d = view.data as WaiMcData;
  return (
    <div className="space-y-3">
      {d.result ? (
        <div className="rounded-2xl border border-leaf/40 bg-leaf/12 px-4 py-3 text-sm font-bold text-leaf">
          {t('wai.answerWas')}: {d.result.name} ({d.result.ref})
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-leaf/35 bg-leaf/10 px-4 py-3 text-sm font-bold text-white">
          <span>{t('wai.clueCount', { n: Math.max(1, (d.clueIndex ?? 0) + 1) })}</span>
          <span className="text-leaf">{t('mc.lockedCount', { n: d.locked ?? 0, total: d.total ?? 0 })}</span>
        </div>
      )}
    </div>
  );
}
