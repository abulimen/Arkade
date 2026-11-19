'use client';

import { t } from '@/i18n';
import type { McProps } from '../types';

interface WcfMcData {
  locked?: number;
  total?: number;
}

export default function WcfMc({ view }: McProps) {
  const d = view.data as WcfMcData;
  return (
    <div className="rounded-2xl border border-violet/40 bg-violet/12 px-4 py-3 text-sm font-bold text-white">
      {t('mc.lockedCount', { n: d.locked ?? 0, total: d.total ?? 0 })}
    </div>
  );
}
