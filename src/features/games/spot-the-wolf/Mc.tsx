'use client';
import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import type { McProps } from '../types';

export default function WolfMc({ view, mc }: McProps) {
  const d = view.data;
  const clues = (d.mcClues ?? []) as { i: number; nick: string; text: string; hidden: boolean }[];
  return (
    <section className="rounded-3xl bg-night-2 p-4" aria-label={t('mc.live')}>
      <h2 className="fs-h2 mb-2">{t('mc.live')}</h2>
      {d.currentTurn && <p className="fs-body">{t('wolf.turnOf', { name: d.currentTurn })}</p>}
      <ul className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto">
        {clues.map((c) => (
          <li key={c.i} className="flex items-center gap-2 rounded-xl bg-night-3 px-3 py-1 fs-body"><span className="flex-1 truncate"><b>{c.nick}</b>: {c.hidden ? <s>{c.text}</s> : c.text}</span>
            <button type="button" disabled={c.hidden} onClick={() => void mc('HIDE_ANSWER', { index: c.i })} className="inline-flex min-h-12 items-center gap-1 rounded-xl bg-coral px-3 font-semibold text-night disabled:opacity-50"><Icon n="eyeoff" size={20} />{c.hidden ? t('mc.hidden') : t('mc.hide')}</button></li>
        ))}
      </ul>
      {(d.log as string[]).length > 0 && <ul className="mt-3 fs-small text-cloud">{(d.log as string[]).map((l, i) => <li key={i}>{l}</li>)}</ul>}
    </section>
  );
}
