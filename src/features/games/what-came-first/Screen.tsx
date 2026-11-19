'use client';

import { t } from '@/i18n';
import { useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress, Verse } from '../shared';

interface WcfCard {
  id: string;
  text: string;
}

interface WcfScreenData {
  cards?: WcfCard[];
  locked?: number;
  total?: number;
  reveal?: {
    timeline: { id: string; text: string; ref: string }[];
    perfect: number;
    total: number;
    active: number;
    verse: string;
    ref: string;
  };
}

export default function WcfScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data as WcfScreenData;
  const p = view.phase;

  if (p === 'prompt' || p === 'order') {
    const cards = d.cards ?? [];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-white/12 bg-night-2 p-2 shrink-0">
            <MascotView name="tilly" expression="happy" size={mobile ? 56 : 90} animate decorative />
          </div>
          <h2 className="font-bold text-white" style={{ fontSize: mobile ? 20 : 42 }}>
            {p === 'prompt' ? t('wcf.screenPrompt') : t('wcf.screenOrder')}
          </h2>
        </div>

        <div className="grid gap-3">
          {cards.map((c, idx) => (
            <div
              key={c.id}
              className="arcade-panel px-5 py-3.5 sm:px-7 sm:py-4 flex items-center gap-4 border-white/12"
            >
              <span
                className="grid shrink-0 place-items-center rounded-xl bg-violet font-extrabold text-night"
                style={{ width: mobile ? 32 : 52, height: mobile ? 32 : 52, fontSize: mobile ? 14 : 24 }}
              >
                {idx + 1}
              </span>
              <span className="font-semibold text-white" style={{ fontSize: mobile ? 16 : 30 }}>
                {c.text}
              </span>
            </div>
          ))}
        </div>

        {p === 'order' && (
          <Progress
            n={d.locked ?? 0}
            total={d.total ?? 1}
            label={t('screen.locked', { n: d.locked ?? 0, total: d.total ?? 0 })}
            big={!mobile}
          />
        )}
      </div>
    );
  }

  const rev = d.reveal;
  if (!rev) {
    return (
      <div className="arcade-panel p-8 text-center">
        <h2 className="font-bold text-gold" style={{ fontSize: mobile ? 22 : 42 }}>
          {t('ph.end')}
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-6 a-pop">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-gold" style={{ fontSize: mobile ? 22 : 42 }}>
          {t('wcf.correctOrder')}
        </h2>
        <span
          className="rounded-full bg-leaf px-5 py-1.5 font-extrabold text-night"
          style={{ fontSize: mobile ? 13 : 22 }}
        >
          {t('wcf.perfectCount', { n: rev.perfect })}
        </span>
      </div>

      <ol className="space-y-2.5">
        {rev.timeline.map((item, idx) => (
          <li key={item.id} className="arcade-panel px-5 py-3 sm:px-7 sm:py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span
                className="grid shrink-0 place-items-center rounded-xl bg-gold font-extrabold text-night"
                style={{ width: mobile ? 30 : 48, height: mobile ? 30 : 48, fontSize: mobile ? 14 : 24 }}
              >
                {idx + 1}
              </span>
              <span className="font-bold text-white truncate" style={{ fontSize: mobile ? 15 : 28 }}>
                {item.text}
              </span>
            </div>
            <span className="shrink-0 font-bold text-sky" style={{ fontSize: mobile ? 12 : 20 }}>
              {item.ref}
            </span>
          </li>
        ))}
      </ol>

      <Verse verse={rev.verse} refText={rev.ref} big={!mobile} />
    </div>
  );
}
