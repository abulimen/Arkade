'use client';
import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import { AnswerButton, Button, PlayerChip, SecretCard } from '@/ui/kit';
import { Avatar } from '@/ui/avatars';
import { MascotView } from '@/ui/mascots';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, Waiting } from '../shared';
import { vibrate } from '@/client/hooks';

interface Pub { id: string; nickname: string; avatar: number; color: number }

export default function WolfPlayer({ view, send }: PlayerProps) {
  const d = view.data;
  const ph = view.phase;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const nick = (id: string) => (d.stage as Pub[]).find((p) => p.id === id)?.nickname ?? '?';
  useEffect(() => { if (d.myTurn) vibrate(60); setText(''); }, [d.myTurn, view.round, ph]);

  const clues = (
    <ol className="flex max-h-40 flex-col gap-1 overflow-y-auto" aria-label={t('wolf.clues')}>
      {(d.clues as { pid: string; text: string; spoken: boolean }[]).map((c, i) => <li key={i} className="rounded-xl bg-night-2 px-3 py-1 fs-body"><span className="font-semibold text-gold">{nick(c.pid)}:</span> {c.spoken ? t('wolf.spoken') : c.text}</li>)}
    </ol>
  );

  if (d.spectator) {
    return (
      <>
        <p className="rounded-xl bg-night-3 px-3 py-2 text-center fs-body" role="status">{t('lobby.spectator')}</p>
        <Waiting game="spot-the-wolf" expr="disguised" title={t(`ph.spot-the-wolf.${ph}`) === `ph.spot-the-wolf.${ph}` ? t(`ph.${ph}`) : t(`ph.spot-the-wolf.${ph}`)} body={t('wolf.watchBody', { cat: d.category })} />
        {clues}
      </>
    );
  }

  if (ph === 'reveal') {
    const c = d.card;
    return (
      <>
        <h2 className="fs-h1">{c.wolf ? t('wolf.youAre') : t('wolf.yourWord')}</h2>
        <SecretCard hint={t('wolf.hold')}>
          {c.wolf ? (<><MascotView name="wilf" expression="sneaky" size={110} /><p className="fs-h1">{t('wolf.wolfCard')}</p><p className="fs-body">{t('wolf.category', { cat: c.category })}</p></>) : (<><p className="fs-small">{c.category}</p><p className="fs-display leading-none">{c.word}</p></>)}
        </SecretCard>
        <p className="fs-body">{c.wolf ? t('wolf.wolfTip') : t('wolf.flockTip')}</p>
      </>
    );
  }

  if (ph === 'clues1' || ph === 'clues2') {
    const cur = d.turnOrder[d.turnIndex] as string;
    return (
      <>
        <p className="fs-small text-cloud">{t('wolf.clueRound', { n: d.clueRound })} · {d.category}</p>
        {d.myTurn ? (
          <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; setBusy(true); await send('CLUE', { text }); setBusy(false); }}>
            <h2 className="fs-h1">{t('wolf.yourTurn')}</h2>
            <label htmlFor="clue" className="fs-body">{t('wolf.clueLabel')}</label>
            <input id="clue" value={text} onChange={(e) => setText(e.target.value.replace(/\s/g, ''))} maxLength={24} autoComplete="off" enterKeyHint="send" className="min-h-14 rounded-xl border-[3px] border-night bg-night-3 px-4 text-white" />
            <Button type="submit" loading={busy} disabled={!text.trim()}>{t('wolf.sendClue')}</Button>
            <p className="fs-small text-cloud">{t('wolf.orAloud')}</p>
          </form>
        ) : <Waiting game="spot-the-wolf" expr="disguised" title={t('wolf.waitingFor', { name: nick(cur) })} />}
        {clues}
      </>
    );
  }

  if (ph === 'debate') return <><Waiting game="spot-the-wolf" expr="sneaky" title={t('wolf.discuss')} body={t('wolf.discussBody')} />{clues}</>;

  if (ph === 'vote') {
    return (
      <>
        <h2 className="fs-h1">{t('wolf.whoIsWolf')}</h2>
        <div className="flex flex-col gap-2" role="group" aria-label={t('wolf.whoIsWolf')}>
          {(d.suspects as Pub[]).map((p, i) => (
            <AnswerButton key={p.id} index={i} compact state={d.myVote ? (d.myVote === p.id ? 'locked' : 'disabled') : 'idle'} onClick={() => void send('VOTE', { target: p.id })}>
              <span className="flex items-center gap-2"><Avatar avatar={p.avatar} color={p.color} size={32} />{p.nickname}</span>
            </AnswerButton>
          ))}
        </div>
        {d.myVote && <LockedIn />}
      </>
    );
  }

  if (ph === 'accuse') {
    const acc = (d.accused ?? []) as { id: string; wolf: boolean }[];
    return (
      <>
        <Waiting game="spot-the-wolf" expr={acc.some((a) => a.wolf) ? 'caught' : 'disguised'} title={acc.length ? t('wolf.accusedIs', { names: acc.map((a) => nick(a.id)).join(', ') }) : t('wolf.noOne')} body={acc.some((a) => a.wolf) ? t('wolf.wolfOut') : t('wolf.notWolf')} />
      </>
    );
  }

  if (ph === 'guess') {
    return d.canGuess ? (
      <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; setBusy(true); await send('GUESS', { text }); setBusy(false); }}>
        <MascotView name="wilf" expression="caught" size={110} />
        <h2 className="fs-h1">{t('wolf.caught')}</h2>
        <label htmlFor="guess" className="fs-body">{t('wolf.guessLabel')}</label>
        <input id="guess" value={text} onChange={(e) => setText(e.target.value)} maxLength={40} autoComplete="off" className="min-h-14 rounded-xl border-[3px] border-night bg-night-3 px-4 text-white" />
        <Button type="submit" loading={busy} disabled={!text.trim()}>{t('wolf.guess')}</Button>
      </form>
    ) : <Waiting game="spot-the-wolf" expr="howl" title={t('wolf.guessing')} />;
  }

  if (ph === 'roundEnd' && d.end) {
    return (
      <>
        {d.myGain > 0 ? <Feedback ok gain={d.myGain}>{t('wolf.nice')}</Feedback> : <Feedback ok={false}>{t('wolf.greatTry')}</Feedback>}
        <div className="rounded-2xl bg-night-2 p-3"><div className="fs-small text-gold">{t('wolf.wordWas')}</div><div className="fs-h1">{d.end.word}</div></div>
        <p className="fs-body">{t('wolf.wolvesWere')} {(d.end.wolves as string[]).map(nick).join(', ')}</p>
      </>
    );
  }
  return <Waiting game="spot-the-wolf" title={t('common.loading')} />;
}

export { PlayerChip };
