'use client';
import { t } from '@/i18n';
import type { McProps } from '../types';
import { Progress } from '../shared';

export default function G3Mc({ view }: McProps) {
  const d = view.data;
  return (
    <section className="rounded-3xl bg-night-2 p-4" aria-label={t('mc.live')}>
      <h2 className="fs-h2 mb-2">{t('mc.live')}</h2>
      <p className="fs-body">{t('g3.mcStage', { stage: d.stage, alive: d.counts.alive, started: d.counts.started, fin: d.counts.finalists })}</p>
      {d.total != null && <Progress n={d.answered ?? 0} total={d.total} label={t('screen.answered', { n: d.answered ?? 0, total: d.total })} />}
      {(d.board ?? []).length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{d.board.map((f: { id: string; nickname: string; points: number }) => <li key={f.id} className="rounded-full bg-night-3 px-3 py-1 fs-small">{f.nickname}: {f.points}</li>)}</ul>}
      {view.phase.startsWith('s3') && <p className="mt-2 fs-small text-cloud">{t('g3.reaskHint')}</p>}
    </section>
  );
}
