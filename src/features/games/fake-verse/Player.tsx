'use client';
import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import { AnswerButton, Button } from '@/ui/kit';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, Verse, Waiting } from '../shared';

export default function FvPlayer({ view, send }: PlayerProps) {
  const d = view.data;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(''), [view.round]);
  const dbl = d.mult === 2 ? <p className="rounded-xl bg-violet px-3 py-1 text-center fs-small font-semibold text-night">{t('fv.double')}</p> : null;

  if (view.phase === 'prompt') return <><Waiting game="fake-verse" expr="scheming" title={t('fv.read')} body={t('fv.readBody')} />{dbl}</>;

  if (view.phase === 'write') {
    return (
      <>
        {dbl}
        <p className="fs-verse rounded-2xl bg-cloud p-3 text-night">{d.text}</p>
        {d.submitted ? <><LockedIn /><Waiting game="fake-verse" expr="writing" title={t('fv.waitOthers')} /></> : (
          <form className="flex flex-1 flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; setBusy(true); await send('WRITE', { text }); setBusy(false); }}>
            <label htmlFor="lie" className="fs-body font-semibold">{t('fv.writeFake')}</label>
            <input id="lie" value={text} maxLength={40} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="sentences" enterKeyHint="done"
              className="min-h-14 rounded-xl border-[3px] border-night bg-night-3 px-4 text-white placeholder:text-cloud/60" placeholder={t('fv.placeholder')} aria-describedby="count" />
            <p id="count" className="text-right fs-small text-cloud">{text.length}/40</p>
            <Button type="submit" loading={busy} disabled={!text.trim()} className="mt-auto">{t('phone.lockIt')}</Button>
          </form>
        )}
      </>
    );
  }

  if (view.phase === 'vote') {
    const opts: { id: string; text: string }[] = d.options ?? [];
    return (
      <>
        {dbl}
        <p className="fs-verse rounded-2xl bg-cloud p-3 text-night">{d.text}</p>
        <p className="fs-body font-semibold">{d.voted ? t('phone.lockedIn') : t('fv.pickTruth')}</p>
        <div className="flex flex-col gap-2" role="group" aria-label={t('fv.pickTruth')}>
          {opts.map((o, i) => <AnswerButton key={o.id} index={i} state={d.voted ? (d.voted === o.id ? 'locked' : 'disabled') : 'idle'} onClick={() => void send('VOTE', { target: o.id })}>{o.text}</AnswerButton>)}
        </div>
      </>
    );
  }

  if (view.phase === 'reveal' && d.result) {
    const r = d.result;
    return (
      <>
        {d.voted ? <Feedback ok={r.pickedTruth} gain={r.gain}>{r.pickedTruth ? t('fv.gotTruth') : t('fv.fooled')}</Feedback> : <Feedback ok={r.gain > 0} gain={r.gain}>{r.gain > 0 ? t('fv.youFooled') : t('fv.noVote')}</Feedback>}
        <div className="rounded-2xl bg-leaf p-3 text-night"><div className="fs-small font-semibold">{t('fv.truth')}</div><div className="fs-h2">{r.truth} <span className="fs-small">({r.ref})</span></div></div>
        <ul className="flex flex-col gap-1">{r.fakes.map((f: { text: string; authors: string[]; votes: number }, i: number) => <li key={i} className="flex justify-between rounded-xl bg-night-2 px-3 py-2 fs-small"><span>“{f.text}” · {f.authors.join(', ')}</span><span>{t('fv.fooledN', { n: f.votes })}</span></li>)}</ul>
        <Verse text={r.verse} refText={r.ref} />
      </>
    );
  }
  return <Waiting game="fake-verse" title={t('common.loading')} />;
}
