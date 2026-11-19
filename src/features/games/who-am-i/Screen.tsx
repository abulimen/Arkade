'use client';

import { RAINBOW } from '@/shared/types';
import { t } from '@/i18n';
import { useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Pips, Verse } from '../shared';

interface WaiScreenData {
  clues: string[];
  clueIndex: number;
  reveal?: number;
  color: number;
  locked: number;
  total: number;
  result?: {
    name: string;
    ref: string;
    story: string;
    verse: string;
    correctCount: number;
  };
}

export default function WhoAmIScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data as WaiScreenData;
  const p = view.phase;
  const camiColor = RAINBOW[((d.color ?? 0) % RAINBOW.length + RAINBOW.length) % RAINBOW.length];

  if (p === 'reveal' && d.result) {
    const r = d.result;
    return (
      <div className="space-y-6 a-pop">
        <div className="arcade-panel p-6 sm:p-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="rounded-3xl border border-leaf/40 bg-leaf/12 p-3 shrink-0">
              <MascotView name="cami" expression="cheer" size={mobile ? 74 : 130} reveal={1} color={camiColor} animate decorative />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-widest text-leaf">{t('wai.answerWas')}</div>
              <h2 className="font-bold text-white leading-tight" style={{ fontSize: mobile ? 26 : 54 }}>
                {r.name}
              </h2>
            </div>
          </div>
          <span
            className="rounded-full bg-leaf px-5 py-1.5 font-extrabold text-night"
            style={{ fontSize: mobile ? 13 : 22 }}
          >
            {t('wai.gotItN', { n: r.correctCount })}
          </span>
        </div>

        <div className="arcade-card p-5 sm:p-7">
          <p className="text-cloud leading-relaxed" style={{ fontSize: mobile ? 15 : 28 }}>
            {r.story}
          </p>
        </div>

        <Verse verse={r.verse} refText={r.ref} big={!mobile} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[0.42fr_1fr] items-center">
        <div className="arcade-panel p-6 flex flex-col items-center gap-4 text-center">
          <MascotView
            name="cami"
            expression="happy"
            size={mobile ? 120 : 230}
            reveal={d.reveal ?? 0.2}
            color={camiColor}
            animate
            decorative
          />
          <div className="rounded-full border border-gold/45 bg-gold/15 px-4 py-1 font-bold text-gold" style={{ fontSize: mobile ? 13 : 22 }}>
            {t('wai.clueCount', { n: Math.max(1, (d.clueIndex ?? 0) + 1) })}
          </div>
        </div>

        <div className="space-y-3">
          {(d.clues ?? []).map((cl, i) => (
            <div
              key={i}
              className={`arcade-panel px-5 py-3.5 sm:px-7 sm:py-4 flex items-start gap-4 ${
                i === (d.clues?.length ?? 1) - 1 ? 'border-leaf/55 bg-leaf/12 shadow-[0_0_24px_-8px_rgba(56,236,130,0.4)]' : ''
              }`}
            >
              <span
                className="grid shrink-0 place-items-center rounded-xl bg-leaf font-extrabold text-night"
                style={{ width: mobile ? 28 : 44, height: mobile ? 28 : 44, fontSize: mobile ? 13 : 22 }}
              >
                {i + 1}
              </span>
              <span className="font-semibold text-white leading-snug" style={{ fontSize: mobile ? 16 : 28 }}>
                {cl}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Pips n={d.locked ?? 0} total={d.total ?? 1} />
    </div>
  );
}
