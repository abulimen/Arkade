'use client';
import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import { Button } from '@/ui/kit';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, Verse, Waiting } from '../shared';

interface Card { id: string; text: string }

export default function WcfPlayer({ view, send }: PlayerProps) {
  const d = view.data;
  const [taps, setTaps] = useState<string[]>([]); // UI-only state: sent to the server only on lock-in
  const [busy, setBusy] = useState(false);
  useEffect(() => setTaps([]), [view.round]);

  if (view.phase === 'prompt') return <Waiting game="what-came-first" expr="thinking" title={t('wcf.look')} body={t('wcf.lookBody')} />;

  if (view.phase === 'order') {
    const cards: Card[] = d.cards ?? [];
    const seq: string[] = d.locked ? d.mine : taps;
    const text = (id: string) => cards.find((c) => c.id === id)?.text ?? '';
    return (
      <>
        <p className="fs-body">{d.locked ? t('wcf.yourOrder') : t('wcf.tapInOrder')}</p>
        <ul className="flex flex-col gap-2">
          {cards.map((c) => {
            const n = seq.indexOf(c.id);
            const on = n >= 0;
            return (
              <li key={c.id}>
                <button
                  type="button" aria-pressed={on} disabled={d.locked}
                  aria-label={`${c.text}${on ? `, ${t('wcf.position', { n: n + 1 })}` : ''}`}
                  onClick={() => setTaps(on ? taps.filter((x) => x !== c.id) : [...taps, c.id])}
                  className={`press chunky flex min-h-14 w-full items-center gap-3 rounded-2xl border-[3px] px-3 py-1 text-left fs-body font-semibold ${on ? 'border-white bg-gold text-night' : 'border-night bg-night-3 text-cloud'}`}
                >
                  <span className={`grid h-9 w-9 flex-none place-items-center rounded-full border-[3px] border-night fs-body ${on ? 'bg-white text-night' : 'bg-night-2 text-cloud'}`} aria-hidden="true">{on ? n + 1 : ''}</span>
                  <span className="flex-1 leading-tight">{c.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {d.locked ? <LockedIn /> : (
          <div className="mt-auto grid grid-cols-[auto_1fr] gap-2">
            <Button variant="ghost" disabled={!taps.length} onClick={() => setTaps(taps.slice(0, -1))}>{t('wcf.undo')}</Button>
            <Button disabled={taps.length !== cards.length} loading={busy} onClick={async () => { setBusy(true); await send('LOCK', { order: taps }); setBusy(false); }}>{t('phone.lockIt')}</Button>
          </div>
        )}
      </>
    );
  }

  if (view.phase === 'reveal' && d.reveal) {
    const r = d.reveal;
    const ok = r.correct === r.timeline.length;
    return (
      <>
        {d.locked ? <Feedback ok={r.gain > 0 && r.correct >= 3} gain={r.gain}>{t('wcf.rightPlace', { n: r.correct, of: r.timeline.length })}</Feedback> : <Feedback ok={false}>{t('wcf.noLock')}</Feedback>}
        <ol className="flex flex-col gap-1.5" aria-label={t('wcf.correctOrder')}>
          {r.timeline.map((e: { id: string; text: string; ref: string }, i: number) => (
            <li key={e.id} className="flex items-center gap-2 rounded-xl bg-night-2 px-3 py-2 fs-small"><span className="grid h-7 w-7 place-items-center rounded-full bg-gold font-semibold text-night">{i + 1}</span><span className="flex-1 font-semibold">{e.text}</span><span className="text-gold">{e.ref}</span></li>
          ))}
        </ol>
        <p className="fs-small text-cloud">{ok ? t('wcf.perfect') : t('wcf.close')}</p>
        <Verse text={r.verse} refText={r.ref} />
      </>
    );
  }
  return <Waiting game="what-came-first" expr="idle" title={t('common.loading')} />;
}
