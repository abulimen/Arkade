'use client';
import { t } from '@/i18n';
import type { McProps } from '../types';
import { Progress } from '../shared';

export default function WaiMc({ view }: McProps) {
  const d = view.data;
  return (
    <section className="rounded-3xl bg-night-2 p-4" aria-label={t('mc.live')}>
      <h2 className="fs-h2 mb-2">{t('mc.live')}</h2>
      <Progress n={d.locked} total={d.total} label={t('mc.lockedCount', { n: d.locked, total: d.total })} />
      <ol className="mt-3 list-decimal pl-6 fs-body">{(d.clues ?? []).map((c: string, i: number) => <li key={i}>{c}</li>)}</ol>
      {d.result && <p className="mt-2 fs-body font-semibold text-gold">{d.result.name}</p>}
    </section>
  );
}
