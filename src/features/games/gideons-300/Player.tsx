'use client';

import type { PlayerPublic } from '@/shared/types';
import { t } from '@/i18n';
import { haptic, playUi } from '@/client/sound';
import { Avatar } from '@/ui/avatars';
import { Icon } from '@/ui/icons';
import { AnswerButton, PlayerChip } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { PlayerProps } from '../types';
import { Feedback, Verse, Waiting } from '../shared';

export { PlayerChip };

interface G3BoardEntry {
  id: string;
  nickname: string;
  avatar: number;
  color: number;
  points: number;
  frozen?: boolean;
}

interface G3PlayerData {
  role: 'alive' | 'out' | 'finalist' | 'watchman' | 'spectator';
  stage: 1 | 2 | 3;
  safe?: boolean;
  finalist?: boolean;
  cut?: { before: number; after: number };
  counts: { started: number; alive: number; finalists: number };
  q?: { text: string; options: string[] };
  n: number;
  of: number;
  frozen?: boolean;
  myAnswer?: number | null;
  myGain?: number;
  myWatch?: number;
  correct?: number;
  ref?: string;
  hist?: number[];
  winner?: { id: string; nickname: string } | null;
  board?: G3BoardEntry[];
  targets?: PlayerPublic[];
  myPick?: string | null;
}

export default function GideonsPlayer({ view, send }: PlayerProps) {
  const d = view.data as G3PlayerData;
  const p = view.phase;

  if (d.role === 'spectator') {
    return <Waiting mascot="jari" title={t('g3.spectator')} body={t('g3.introBody')} />;
  }

  if (p === 'intro') {
    return (
      <div className="space-y-4 my-auto">
        <Waiting mascot="jari" title={t('g3.introTitle')} body={t('g3.introBody')} />
        <div className="rounded-2xl border border-gold/40 bg-gold/12 px-4 py-3 text-center text-sm font-bold text-gold">
          {t('g3.tentsLabel', { n: d.counts?.alive ?? 0 })}
        </div>
      </div>
    );
  }

  if (p === 's1cut' || p === 's2cut') {
    if (d.finalist || d.safe) {
      return (
        <div className="arcade-panel border-leaf/50 bg-leaf/12 p-7 text-center space-y-4 my-auto a-pop shadow-[0_0_40px_-10px_rgba(56,236,130,0.45)]">
          <div className="mx-auto w-fit rounded-3xl border border-leaf/40 bg-night-2 p-4">
            <MascotView name="jari" expression="cheer" size={104} animate decorative />
          </div>
          <h2 className="font-bold text-leaf fs-h1">{d.finalist ? t('g3.finalist') : t('g3.stillIn')}</h2>
          <p className="text-sm text-cloud">{d.finalist ? t('lobby.front') : t('g3.remain', { n: d.counts.alive })}</p>
        </div>
      );
    }
    return <Waiting mascot="jari" title={t('g3.sentHome')} body={t('g3.sentHomeBody')} />;
  }

  if (p === 's3pre') {
    if (d.role === 'finalist') {
      return (
        <div className="arcade-panel border-gold/50 bg-gold/12 p-7 text-center space-y-4 my-auto a-pop">
          <div className="mx-auto w-fit rounded-3xl border border-gold/40 bg-night-2 p-4">
            <MascotView name="jari" expression="cheer" size={104} animate decorative />
          </div>
          <h2 className="font-bold text-gold fs-h1">{t('g3.finalist')}</h2>
          <p className="text-sm text-cloud">{t('g3.finalistBody')}</p>
        </div>
      );
    }
    const targets = d.targets ?? [];
    return (
      <div className="space-y-4">
        <div className="arcade-card p-4 space-y-1 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
            <Icon n="eye" size={14} /> {t('g3.watchman')}
          </div>
          <h2 className="font-bold text-white fs-h2">{t('g3.predict')}</h2>
          <p className="text-xs text-slate">{t('g3.predictBody')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {targets.map((tg) => {
            const picked = d.myPick === tg.id;
            return (
              <button
                key={tg.id}
                type="button"
                disabled={!!d.myPick}
                onClick={() => {
                  playUi('ui-snap');
                  haptic('press');
                  void send('PREDICT', { target: tg.id });
                }}
                className={`cursor-pointer press arcade-card p-3.5 flex items-center gap-2.5 text-left min-h-14 transition-all ${
                  picked ? 'border-leaf ring-2 ring-leaf bg-leaf/15' : 'hover:border-gold/50'
                }`}
              >
                <Avatar avatar={tg.avatar} color={tg.color} size={38} />
                <span className="truncate font-semibold text-white text-sm">{tg.nickname}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (p === 's1q' || p === 's2q' || p === 's3q') {
    if (d.stage === 3 && d.role !== 'finalist') {
      return <Waiting mascot="jari" title={t('g3.watchman')} body={t('g3.watchmenPick')} />;
    }
    if (d.role === 'out') {
      return <Waiting mascot="jari" title={t('g3.sentHome')} body={t('g3.sentHomeBody')} />;
    }
    if (!d.q) return null;

    if (d.frozen) {
      return (
        <div className="arcade-panel border-coral/50 bg-coral/12 p-7 text-center space-y-4 my-auto a-shake">
          <div className="mx-auto w-fit rounded-3xl border border-coral/40 bg-night-2 p-4">
            <MascotView name="jari" expression="oops" size={96} decorative />
          </div>
          <h2 className="font-bold text-coral fs-h2">{t('g3.frozen')}</h2>
        </div>
      );
    }

    const buzz = p === 's3q';
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gold px-1">
          <span>{t('g3.qOf', { n: d.n, of: d.of })}</span>
          {buzz && <span className="text-coral animate-pulse">BUZZ FIRST</span>}
        </div>

        <div className="arcade-panel p-5">
          <p className="font-bold text-white fs-h2 leading-snug">{d.q.text}</p>
        </div>

        <div className="grid gap-2.5">
          {d.q.options.map((opt, idx) => {
            const picked = d.myAnswer === idx;
            const locked = d.myAnswer != null && !buzz;
            return (
              <AnswerButton
                key={idx}
                index={idx}
                state={picked ? 'locked' : locked ? 'disabled' : 'idle'}
                onClick={
                  locked
                    ? undefined
                    : () => {
                        playUi('ui-snap');
                        haptic('press');
                        void send(buzz ? 'BUZZ' : 'ANSWER', { choice: idx });
                      }
                }
              >
                {opt}
              </AnswerButton>
            );
          })}
        </div>
      </div>
    );
  }

  if (p === 's1r' || p === 's2r' || p === 's3r') {
    const rightOpt = d.q?.options?.[d.correct ?? 0];
    const ok = p === 's3r' ? (d.myWatch ?? 0) > 0 || (d.myGain ?? 0) > 0 : d.myAnswer === d.correct;
    const gain = (d.myGain ?? 0) + (d.myWatch ?? 0);
    return (
      <div className="space-y-4">
        <Feedback
          ok={ok}
          gain={gain}
          title={
            p === 's3r'
              ? d.winner
                ? t('g3.pointTo', { name: d.winner.nickname })
                : t('g3.noPoint')
              : d.myAnswer == null
                ? t('g3.noAnswer')
                : ok
                  ? t('state.correct')
                  : t('g3.closeOne')
          }
          sub={d.ref ? t('g3.rightRef', { ref: `${rightOpt ? `${rightOpt} · ` : ''}${d.ref}` }) : rightOpt}
        />
        {d.q && (
          <div className="grid gap-2">
            {d.q.options.map((opt, idx) => (
              <AnswerButton
                key={idx}
                index={idx}
                compact
                state={idx === d.correct ? 'correct' : d.myAnswer === idx ? 'wrong' : 'disabled'}
              >
                {opt}
              </AnswerButton>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <Verse verse={t('g3.introBody')} refText={t('g3.introTitle')} />;
}
