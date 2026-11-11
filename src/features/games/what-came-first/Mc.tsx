'use client';
import { t } from '@/i18n';
import type { McProps } from '../types';
import { Progress } from '../shared';

export default function WcfMc({ view }: McProps) {
  const d = view.data;
  return (
    <section className="rounded-3xl bg-night-2 p-4" aria-label={t('mc.live')}>
      <h2 className="fs-h2 mb-2">{t('mc.live')}</h2>
      <Progress n={d.locked} total={d.total} label={t('mc.lockedCount', { n: d.locked, total: d.total })} />
      {d.cards && <ol className="mt-3 list-decimal pl-6 fs-body">{d.cards.map((c: { id: string; text: string }) => <li key={c.id}>{c.text}</li>)}</ol>}
      {d.reveal && <p className="mt-2 fs-body">{t('wcf.perfectCount', { n: d.reveal.perfect })}</p>}
    </section>
  );
}
