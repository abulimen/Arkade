'use client';

import { t } from '@/i18n';
import { haptic, playUi } from '@/client/sound';
import { AnswerButton } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { PlayerProps } from '../types';
import { Feedback, LockedIn, Verse } from '../shared';

interface WaiPlayerData {
  clues: string[];
  clueIndex: number;
  options?: string[];
  status: 'open' | 'locked' | 'out';
  chosen?: string | null;
  result?: {
    name: string;
    ref: string;
    story: string;
    verse: string;
    correctCount: number;
    gain?: number;
    correct?: boolean;
    answered?: boolean;
  };
}

export default function WhoAmIPlayer({ view, send }: PlayerProps) {
  const d = view.data as WaiPlayerData;
  const p = view.phase;

  if (p === 'reveal' && d.result) {
    const r = d.result;
    return (
      <div className="space-y-4">
        <Feedback
          ok={!!r.correct}
          gain={r.gain ?? 0}
          title={r.correct ? t('wai.gotIt') : r.answered ? t('wai.close') : t('wai.noAnswer')}
          sub={`${t('wai.answerWas')}: ${r.name}`}
        />

        <div className="arcade-panel p-5 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-widest text-leaf">{r.name}</div>
          <p className="text-sm text-cloud leading-relaxed">{r.story}</p>
        </div>

        <Verse verse={r.verse} refText={r.ref} />
      </div>
    );
  }

  const clueNum = Math.max(1, (d.clueIndex ?? 0) + 1);
  const ptsAvailable = Math.max(100, 600 - clueNum * 100);

  return (
    <div className="space-y-4">
      {/* Clue Strength & Points Ladder */}
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-bold uppercase tracking-widest text-leaf">
          {t('wai.clueCount', { n: clueNum })}
        </span>
        <span className="rounded-full bg-gold px-3 py-0.5 text-xs font-extrabold text-night tabular-nums">
          +{ptsAvailable} pts
        </span>
      </div>

      {/* Clues Stack */}
      <div className="arcade-panel p-4 sm:p-5 space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate">{t('wai.clues')}</div>
        <ol className="space-y-2">
          {(d.clues ?? []).map((cl, i) => (
            <li
              key={i}
              className={`rounded-2xl border px-3.5 py-2.5 text-sm leading-snug flex items-start gap-2.5 ${
                i === (d.clues?.length ?? 1) - 1
                  ? 'border-leaf/45 bg-leaf/12 text-white font-semibold'
                  : 'border-white/8 bg-night-3/70 text-cloud'
              }`}
            >
              <span className="font-extrabold text-gold shrink-0">{i + 1}.</span>
              <span>{cl}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Status or 2x2 Options */}
      {d.status === 'locked' ? (
        <LockedIn sub={d.chosen ? `${t('wai.who')} → ${d.chosen}` : undefined} />
      ) : d.status === 'out' ? (
        <div className="arcade-panel border-coral/50 bg-coral/12 p-6 text-center space-y-3 a-shake">
          <div className="mx-auto w-fit rounded-3xl border border-coral/40 bg-night-2 p-3">
            <MascotView name="cami" expression="oops" size={88} decorative />
          </div>
          <p className="font-bold text-coral fs-h3">{t('wai.lockedOut')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-widest text-gold px-1">{t('wai.pick')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(d.options ?? []).map((opt, idx) => (
              <AnswerButton
                key={opt}
                index={idx}
                onClick={() => {
                  playUi('ui-snap');
                  haptic('press');
                  void send('ANSWER', { choice: opt });
                }}
              >
                {opt}
              </AnswerButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
