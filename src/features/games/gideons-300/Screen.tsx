'use client';

import type { PlayerPublic } from '@/shared/types';
import { t } from '@/i18n';
import { Avatar } from '@/ui/avatars';
import { Icon } from '@/ui/icons';
import { AnswerButton, PlayerChip, VoteBars, useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress } from '../shared';

interface G3BoardEntry {
  id: string;
  nickname: string;
  avatar: number;
  color: number;
  points: number;
  frozen?: boolean;
}

interface G3ScreenData {
  stage: 1 | 2 | 3;
  counts: { started: number; alive: number; finalists: number };
  cut?: { before: number; after: number };
  q?: { text: string; options: string[] };
  n: number;
  of: number;
  correct?: number;
  ref?: string;
  hist?: number[];
  winner?: { id: string; nickname: string } | null;
  board?: G3BoardEntry[];
  predicted?: Record<string, number>;
  tents?: number[];
  answered?: number;
  total?: number;
  champion?: PlayerPublic;
}

export default function GideonsScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data as G3ScreenData;
  const p = view.phase;

  if (p === 'intro') {
    return (
      <div className="arcade-panel p-8 sm:p-12 text-center space-y-6 a-pop">
        <div className="mx-auto w-fit rounded-3xl border border-gold/40 bg-gold/12 p-5">
          <MascotView name="jari" expression="cheer" size={mobile ? 110 : 210} animate decorative />
        </div>
        <h2 className="font-bold text-white" style={{ fontSize: mobile ? 26 : 56 }}>
          {t('g3.introTitle')}
        </h2>
        <p className="text-cloud max-w-2xl mx-auto" style={{ fontSize: mobile ? 15 : 28 }}>
          {t('g3.introScreen')}
        </p>
        <div className="inline-flex items-center gap-3 rounded-full bg-gold px-6 py-2 font-extrabold text-night" style={{ fontSize: mobile ? 14 : 24 }}>
          <span>{t('g3.tentsLabel', { n: d.counts?.alive ?? 0 })}</span>
        </div>
      </div>
    );
  }

  if (p === 's1cut' || p === 's2cut') {
    const cut = d.cut ?? { before: d.counts.started, after: d.counts.alive };
    return (
      <div className="arcade-panel p-8 sm:p-12 text-center space-y-6 a-pop">
        <div className="mx-auto w-fit rounded-3xl border border-leaf/40 bg-leaf/12 p-5">
          <MascotView name="jari" expression="cheer" size={mobile ? 100 : 190} animate decorative />
        </div>
        <h2 className="font-bold text-coral" style={{ fontSize: mobile ? 28 : 56 }}>
          {t('g3.cutTitle', { n: Math.max(0, cut.before - cut.after) })}
        </h2>
        <div className="inline-flex items-center gap-3 rounded-full bg-leaf px-6 py-2 font-extrabold text-night" style={{ fontSize: mobile ? 15 : 26 }}>
          {t('g3.cutRemain', { n: cut.after })}
        </div>
      </div>
    );
  }

  if (p === 's3pre') {
    const board = d.board ?? [];
    return (
      <div className="arcade-panel p-6 sm:p-10 space-y-6 a-pop">
        <div className="text-center space-y-2">
          <h2 className="font-bold text-gold" style={{ fontSize: mobile ? 24 : 48 }}>
            {t('g3.finalists')}
          </h2>
          <p className="text-cloud" style={{ fontSize: mobile ? 14 : 24 }}>
            {t('g3.watchmenPick')}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {board.map((b) => (
            <PlayerChip key={b.id} p={{ nickname: b.nickname, avatar: b.avatar, color: b.color }} big={!mobile} />
          ))}
        </div>
      </div>
    );
  }

  if (p === 's1q' || p === 's2q' || p === 's1r' || p === 's2r') {
    const reveal = p === 's1r' || p === 's2r';
    const opts = d.q?.options ?? [];
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-gold/45 bg-gold/15 px-5 py-1.5 font-bold uppercase tracking-widest text-gold" style={{ fontSize: mobile ? 12 : 22 }}>
            {t('g3.qOf', { n: d.n, of: d.of })}
          </span>
          <span className="rounded-full border border-leaf/45 bg-leaf/15 px-5 py-1.5 font-bold text-leaf" style={{ fontSize: mobile ? 12 : 22 }}>
            {t('g3.remain', { n: d.counts?.alive ?? 0 })}
          </span>
        </div>

        {d.q && (
          <div className="arcade-panel p-6 sm:p-9">
            <h2 className="font-bold text-white leading-snug" style={{ fontSize: mobile ? 20 : 42 }}>
              {d.q.text}
            </h2>
          </div>
        )}

        <div className={mobile ? 'grid gap-2.5' : 'grid grid-cols-2 gap-4'}>
          {opts.map((opt, idx) => (
            <AnswerButton
              key={idx}
              index={idx}
              big={!mobile}
              state={reveal ? (idx === d.correct ? 'correct' : 'disabled') : 'idle'}
            >
              {opt}
            </AnswerButton>
          ))}
        </div>

        {!reveal ? (
          <Progress
            n={d.answered ?? 0}
            total={d.total ?? d.counts.alive}
            label={t('screen.answered', { n: d.answered ?? 0, total: d.total ?? d.counts.alive })}
            big={!mobile}
          />
        ) : (
          <div className="space-y-4">
            {d.ref && (
              <div className="text-center font-bold text-leaf" style={{ fontSize: mobile ? 16 : 28 }}>
                {t('g3.rightRef', { ref: d.ref })}
              </div>
            )}
            {d.hist && (
              <VoteBars
                big={!mobile}
                items={opts.map((o, i) => ({
                  id: String(i),
                  label: o,
                  votes: d.hist?.[i] ?? 0,
                  color: i === d.correct ? '#38EC82' : '#95A2BA',
                }))}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  if (p === 's3q' || p === 's3r') {
    const reveal = p === 's3r';
    const board = d.board ?? [];
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full border border-gold/45 bg-gold/15 px-5 py-1.5 font-bold uppercase tracking-widest text-gold" style={{ fontSize: mobile ? 12 : 22 }}>
            {t('g3.qOf', { n: d.n, of: d.of })}
          </span>
          {reveal && (
            <span className="rounded-full bg-leaf px-5 py-1.5 font-extrabold text-night" style={{ fontSize: mobile ? 13 : 22 }}>
              {d.winner ? t('g3.pointTo', { name: d.winner.nickname }) : t('g3.noPoint')}
            </span>
          )}
        </div>

        {d.q && (
          <div className="arcade-panel p-6 sm:p-9 space-y-4">
            <h2 className="font-bold text-white leading-snug" style={{ fontSize: mobile ? 20 : 40 }}>
              {d.q.text}
            </h2>
            <div className={mobile ? 'grid gap-2' : 'grid grid-cols-2 gap-3.5'}>
              {d.q.options.map((opt, idx) => (
                <AnswerButton
                  key={idx}
                  index={idx}
                  big={!mobile}
                  state={reveal ? (idx === d.correct ? 'correct' : 'disabled') : 'idle'}
                >
                  {opt}
                </AnswerButton>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {board.slice(0, 10).map((b) => (
            <div
              key={b.id}
              className={`arcade-card p-3 flex items-center justify-between gap-2 ${
                b.frozen ? 'opacity-50 border-coral/40' : d.winner?.id === b.id ? 'border-leaf bg-leaf/15' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar avatar={b.avatar} color={b.color} size={mobile ? 28 : 40} />
                <span className="truncate font-bold text-white" style={{ fontSize: mobile ? 12 : 20 }}>
                  {b.nickname}
                </span>
              </div>
              <span className="rounded-full bg-gold px-2.5 py-0.5 font-extrabold text-night tabular-nums" style={{ fontSize: mobile ? 11 : 18 }}>
                {b.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return d.champion ? (
    <div className="arcade-panel p-8 text-center space-y-4">
      <Icon n="crown" size={mobile ? 36 : 64} className="text-gold mx-auto" />
      <h2 className="font-bold text-white" style={{ fontSize: mobile ? 26 : 52 }}>
        {t('g3.champion', { name: d.champion.nickname })}
      </h2>
    </div>
  ) : null;
}
