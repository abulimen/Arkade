'use client';

import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import { AnswerButton, useStageMobile } from '@/ui/kit';
import type { ScreenProps } from '../types';
import { Progress, ScrollCard, Verse } from '../shared';

interface FakeVerseScreenData {
  mult?: number;
  text: string;
  submitted?: number;
  voted?: number;
  total: number;
  options?: { id: string; text: string; by?: string[] }[];
  result?: {
    truth: string;
    ref: string;
    verse: string;
    correct: number;
    fakes: { text: string; authors: string[]; votes: number; points: number }[];
  };
}

export default function FakeVerseScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data as FakeVerseScreenData;
  const p = view.phase;

  const multBadge = d.mult === 2 && (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-gold font-extrabold uppercase tracking-widest text-night shadow"
      style={{ padding: mobile ? '4px 12px' : '8px 22px', fontSize: mobile ? 12 : 22 }}
    >
      <Icon n="sparkle" size={mobile ? 14 : 24} /> {t('fv.double')}
    </div>
  );

  if (p === 'prompt' || p === 'write') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-bold text-slate" style={{ fontSize: mobile ? 15 : 28 }}>
            {p === 'prompt' ? t('fv.screenPrompt') : t('fv.screenWrite')}
          </div>
          {multBadge}
        </div>

        <ScrollCard big={!mobile}>
          {d.text.split('____').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className="inline-block min-w-28 border-b-4 border-indigo px-3 mx-1 font-extrabold text-indigo">
                  ______
                </span>
              )}
            </span>
          ))}
        </ScrollCard>

        {p === 'write' && (
          <Progress
            n={d.submitted ?? 0}
            total={d.total}
            label={t('screen.submitted', { n: d.submitted ?? 0, total: d.total })}
            big={!mobile}
          />
        )}
      </div>
    );
  }

  if (p === 'vote') {
    const opts = d.options ?? [];
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-white" style={{ fontSize: mobile ? 22 : 42 }}>
            {t('fv.pickTruth')}
          </h2>
          {multBadge}
        </div>

        <div className={mobile ? 'grid gap-2.5' : 'grid grid-cols-2 gap-4'}>
          {opts.map((o, idx) => (
            <AnswerButton key={o.id} index={idx} big={!mobile} tone={false}>
              {o.text}
            </AnswerButton>
          ))}
        </div>

        <Progress
          n={d.voted ?? 0}
          total={d.total}
          label={t('screen.voted', { n: d.voted ?? 0, total: d.total })}
          big={!mobile}
        />
      </div>
    );
  }

  const res = d.result;
  if (!res) {
    return (
      <div className="arcade-panel p-8 text-center">
        <h2 className="font-bold text-sky" style={{ fontSize: mobile ? 22 : 42 }}>
          {t('ph.end')}
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 a-pop">
      <div className="arcade-panel border-leaf/50 bg-leaf/12 p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-leaf">{t('fv.truth')}</div>
          <div className="font-bold text-white mt-1" style={{ fontSize: mobile ? 24 : 48 }}>
            {res.truth}
          </div>
        </div>
        <span
          className="rounded-full bg-leaf px-4 py-1.5 font-extrabold text-night"
          style={{ fontSize: mobile ? 13 : 22 }}
        >
          {t('fv.gotItRight', { n: res.correct })}
        </span>
      </div>

      <Verse verse={res.verse} refText={res.ref} big={!mobile} />

      {res.fakes.length > 0 && (
        <div className={mobile ? 'grid gap-2.5' : 'grid grid-cols-2 gap-4'}>
          {res.fakes.slice(0, 4).map((f, idx) => (
            <div key={idx} className="arcade-card p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-white truncate" style={{ fontSize: mobile ? 16 : 24 }}>
                  “{f.text}”
                </div>
                <div className="text-slate" style={{ fontSize: mobile ? 12 : 18 }}>
                  {t('fv.by', { name: f.authors.join(', ') })}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span
                  className="rounded-full bg-gold px-3 py-1 font-extrabold text-night"
                  style={{ fontSize: mobile ? 12 : 20 }}
                >
                  {t('fv.fooledN', { n: f.votes })}
                </span>
                {f.points > 0 && (
                  <span
                    className="font-extrabold text-gold"
                    style={{ fontSize: mobile ? 12 : 18 }}
                  >
                    +{f.points} pts
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
