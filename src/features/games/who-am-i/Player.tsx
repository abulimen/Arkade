'use client';
import { t } from '@/i18n';
import { AnswerButton } from '@/ui/kit';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, Pips, Verse, Waiting } from '../shared';

export default function WaiPlayer({ view, send }: PlayerProps) {
  const d = view.data;
  if (view.phase === 'reveal' && d.result) {
    const r = d.result;
    return (
      <>
        {d.status === 'out' ? <Feedback ok={false}>{t('wai.lockedOut')}</Feedback> : r.correct ? <Feedback ok gain={r.gain}>{t('wai.gotIt')}</Feedback> : <Feedback ok={false}>{r.answered ? t('wai.close') : t('wai.noAnswer')}</Feedback>}
        <div className="rounded-2xl bg-night-2 p-3"><div className="fs-small text-gold">{t('wai.answerWas')}</div><div className="fs-h1">{r.name}</div><div className="fs-small">{r.ref}</div></div>
        <p className="fs-body">{r.story}</p>
        <Verse text={r.verse} refText={r.ref} />
      </>
    );
  }
  const clues: string[] = d.clues ?? [];
  const opts: string[] = d.options ?? [];
  return (
    <>
      <Pips n={d.clueIndex + 1} of={5} label={t('wai.clueCount', { n: d.clueIndex + 1 })} />
      <ol className="flex max-h-44 flex-col-reverse gap-1.5 overflow-y-auto" aria-label={t('wai.clues')} aria-live="polite">
        {clues.map((c, i) => <li key={i} className={`rounded-xl px-3 py-2 fs-body ${i === clues.length - 1 ? 'a-pop bg-gold font-semibold text-night' : 'bg-night-2 text-cloud'}`}><span className="mr-1 fs-small font-semibold">{i + 1}.</span>{c}</li>)}
      </ol>
      {d.status === 'out' && <Feedback ok={false}>{t('wai.lockedOut')}</Feedback>}
      {d.status === 'locked' && <LockedIn />}
      {d.status === 'open' || d.chosen ? (
        <div className="mt-auto grid grid-cols-2 gap-2" role="group" aria-label={t('wai.pick')}>
          {opts.map((o, i) => <AnswerButton key={o} compact index={i} state={d.status === 'open' ? 'idle' : d.chosen === o ? (d.status === 'out' ? 'wrong' : 'locked') : 'disabled'} onClick={() => void send('ANSWER', { choice: o })}>{o}</AnswerButton>)}
        </div>
      ) : <Waiting game="who-am-i" title={t('common.loading')} />}
    </>
  );
}
