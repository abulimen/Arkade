'use client';
import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import type { McProps } from '../types';
import { Progress } from '../shared';

export default function FvMc({ view, mc }: McProps) {
  const d = view.data;
  return (
    <section className="rounded-3xl bg-night-2 p-4" aria-label={t('mc.live')}>
      <h2 className="fs-h2 mb-2">{t('mc.live')}</h2>
      {view.phase === 'write' && <Progress n={d.submitted} total={d.total} label={t('screen.submitted', { n: d.submitted, total: d.total })} />}
      {view.phase === 'vote' && <Progress n={d.voted} total={d.total} label={t('screen.voted', { n: d.voted, total: d.total })} />}
      <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
        {(d.submissions ?? []).map((s: { pid: string; nick: string; text: string; hidden: boolean }) => (
          <li key={s.pid} className="flex items-center gap-2 rounded-xl bg-night-3 px-3 py-1 fs-body"><span className="flex-1 truncate">{s.hidden ? <s>{s.text}</s> : s.text} <span className="fs-small text-cloud">· {s.nick}</span></span>
            <button type="button" disabled={s.hidden} onClick={() => void mc('HIDE_ANSWER', { playerId: s.pid })} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-coral px-3 font-semibold text-night disabled:opacity-50"><Icon n="eyeoff" size={20} />{s.hidden ? t('mc.hidden') : t('mc.hide')}</button></li>
        ))}
        {(d.options ?? []).map((o: { id: string; text: string; by: string[] }) => (
          <li key={o.id} className="flex items-center gap-2 rounded-xl bg-night-3 px-3 py-1 fs-body"><span className="flex-1 truncate">{o.text} <span className="fs-small text-cloud">· {o.by.join(', ')}</span></span>
            <button type="button" onClick={() => void mc('HIDE_ANSWER', { optionId: o.id })} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-coral px-3 font-semibold text-night"><Icon n="eyeoff" size={20} />{t('mc.hide')}</button></li>
        ))}
      </ul>
    </section>
  );
}
