'use client';
import { t } from '@/i18n';
import { AnswerButton, PlayerChip } from '@/ui/kit';
import { Avatar } from '@/ui/avatars';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, Waiting } from '../shared';

interface Q { text: string; options: string[] }

export default function G3Player({ view, send }: PlayerProps) {
  const d = view.data;
  const role: string = d.role;
  const ph = view.phase;
  const watching = role === 'out' || role === 'spectator' || role === 'watchman';
  const banner = watching && <p className="rounded-xl bg-night-3 px-3 py-2 text-center fs-small" role="status">{role === 'spectator' ? t('g3.spectator') : role === 'watchman' ? t('g3.watchman') : t('g3.sentHome')}</p>;

  if (ph === 'intro') return <Waiting game="gideons-300" expr="ready" title={t('g3.introTitle')} body={t('g3.introBody')} />;

  if (ph.endsWith('cut')) {
    return d.safe || d.finalist
      ? <Waiting game="gideons-300" expr="cheer" title={d.finalist ? t('g3.finalist') : t('g3.stillIn')} body={t('g3.remain', { n: d.cut?.after ?? d.counts.alive })} />
      : <Waiting game="gideons-300" expr="shy" title={t('g3.sentHome')} body={t('g3.sentHomeBody')} />;
  }

  if (ph === 's3pre') {
    if (role === 'finalist') return <Waiting game="gideons-300" expr="ready" title={t('g3.getReady')} body={t('g3.finalistBody')} />;
    if (role === 'spectator' && false) return null;
    return (
      <>
        <h2 className="fs-h1">{t('g3.predict')}</h2>
        <p className="fs-body">{t('g3.predictBody')}</p>
        <div className="flex flex-col gap-2" role="group" aria-label={t('g3.predict')}>
          {(d.targets ?? []).map((p: { id: string; nickname: string; avatar: number; color: number }, i: number) => (
            <AnswerButton key={p.id} index={i} compact state={d.myPick ? (d.myPick === p.id ? 'locked' : 'disabled') : 'idle'} onClick={() => void send('PREDICT', { target: p.id })}>
              <span className="flex items-center gap-2"><Avatar avatar={p.avatar} color={p.color} size={32} />{p.nickname}</span>
            </AnswerButton>
          ))}
          <AnswerButton index={5} compact state={d.myPick ? (d.myPick === 'nobody' ? 'locked' : 'disabled') : 'idle'} onClick={() => void send('PREDICT', { target: 'nobody' })}>{t('g3.nobody')}</AnswerButton>
        </div>
        {d.myPick && <LockedIn />}
      </>
    );
  }

  const q: Q | null = d.q;
  if (ph.endsWith('q') && q) {
    const stage3 = d.stage === 3;
    const canAct = stage3 ? role === 'finalist' && !d.frozen : role === 'alive';
    const mine: number | null = d.myAnswer;
    return (
      <>
        {banner}
        <p className="fs-small text-cloud">{t('g3.qOf', { n: d.n, of: d.of })}</p>
        <h2 className="fs-h2 leading-snug">{q.text}</h2>
        {stage3 && d.frozen && <Feedback ok={false}>{t('g3.frozen')}</Feedback>}
        <div className="mt-auto flex flex-col gap-2" role="group" aria-label={t('g3.answers')}>
          {q.options.map((o, i) => (
            <AnswerButton key={i} index={i} tone big state={mine === i ? 'locked' : canAct && mine == null ? 'idle' : 'disabled'} onClick={() => void send(stage3 ? 'BUZZ' : 'ANSWER', { choice: i })}>{o}</AnswerButton>
          ))}
        </div>
        {mine != null && !stage3 && <LockedIn />}
      </>
    );
  }

  if (ph.endsWith('r') && d.q) {
    const q2: Q = d.q;
    if (d.stage === 3) {
      return (
        <>
          <Waiting game="gideons-300" expr={d.winner ? 'cheer' : 'idle'} title={d.winner ? t('g3.pointTo', { name: d.winner.nickname }) : t('g3.noPoint')} body={`${q2.options[d.correct]} · ${d.ref}`} />
          {d.myWatch > 0 && <Feedback ok gain={d.myWatch}>{t('g3.watchBonus')}</Feedback>}
        </>
      );
    }
    const mine: number | null = d.myAnswer;
    return (
      <>
        {banner}
        {role === 'alive' || role === 'out' ? (mine != null && mine === d.correct ? <Feedback ok gain={d.myGain}>{t('g3.rightRef', { ref: d.ref })}</Feedback> : <Feedback ok={false}>{mine == null ? t('g3.noAnswer') : t('g3.closeOne')}</Feedback>) : null}
        <h2 className="fs-h2">{q2.text}</h2>
        <div className="flex flex-col gap-2">{q2.options.map((o, i) => <AnswerButton key={i} compact index={i} state={i === d.correct ? 'correct' : mine === i ? 'wrong' : 'disabled'}>{o}</AnswerButton>)}</div>
        <p className="fs-small text-gold">{d.ref}</p>
      </>
    );
  }

  if (ph === 'end') return <Waiting game="gideons-300" expr="cheer" title={d.champion ? t('g3.champion', { name: d.champion.nickname }) : t('end.thanks')} />;
  return <Waiting game="gideons-300" title={t('common.loading')} />;
}

export { PlayerChip };
