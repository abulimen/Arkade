'use client';
import { t } from '@/i18n';
import { useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress, Verse } from '../shared';

export default function WcfScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data;

  if (view.phase === 'reveal' && d.reveal) {
    const r = d.reveal;
    if (mobile) {
      return (
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-2" aria-label={t('wcf.correctOrder')}>
            {r.timeline.map((e: { id: string; text: string; ref: string }, i: number) => (
              <li key={`${view.round}-${e.id}`} className="flex items-center gap-3 rounded-2xl border-2 border-night bg-night-3 px-3 py-2">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gold text-sm font-bold text-night">{i + 1}</span>
                <span className="flex-1 fs-small font-semibold text-white">{e.text}</span>
                <span className="shrink-0 text-xs font-semibold text-gold">{e.ref}</span>
              </li>
            ))}
          </ol>
          <div className="flex items-center gap-3 rounded-2xl bg-night-2/80 p-3">
            <MascotView name="tilly" expression="counting" size={76} />
            <p className="fs-body font-semibold text-leaf">{t('wcf.perfectCount', { n: r.perfect })}</p>
          </div>
          <Verse text={r.verse} refText={r.ref} />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-1 gap-8">
          <ol className="relative flex flex-1 flex-col justify-evenly py-1 min-w-0" aria-label={t('wcf.correctOrder')}>
            <span className="absolute left-[31px] top-8 bottom-8 w-3 rounded-full bg-plank" aria-hidden="true" />
            {r.timeline.map((e: { id: string; text: string; ref: string }, i: number) => (
              <li key={`${view.round}-${e.id}`} className="a-drop relative flex items-center gap-6" style={{ animationDelay: `${i * 750}ms` }}>
                <span className="z-10 grid h-[70px] w-[70px] flex-none place-items-center rounded-full border-[5px] border-night bg-gold fs-h2 text-night">{i + 1}</span>
                <span className="fs-body font-semibold text-white min-w-0 flex-1 leading-snug">{e.text}</span>
                <span className="fs-small shrink-0 rounded-full bg-night-3 px-5 py-1 text-gold">{e.ref}</span>
              </li>
            ))}
          </ol>
          <div className="a-fade flex w-[320px] flex-none flex-col items-center justify-center gap-4" style={{ animationDelay: '3200ms' }}>
            <MascotView name="tilly" expression="counting" size={240} />
            <p className="fs-body text-center font-semibold text-leaf">{t('wcf.perfectCount', { n: r.perfect })}</p>
          </div>
        </div>
        <div className="a-fade shrink-0 rounded-2xl border border-white/15 bg-night-2/80 px-6 py-3" style={{ animationDelay: '3800ms' }}>
          <Verse text={r.verse} refText={r.ref} compact big />
        </div>
      </div>
    );
  }

  const cards: { id: string; text: string }[] = d.cards ?? [];
  if (mobile) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="fs-h2 text-white">{view.phase === 'prompt' ? t('wcf.screenPrompt') : t('wcf.screenOrder')}</h1>
        <ul className="flex flex-col gap-2.5">
          {cards.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl border-2 border-night bg-night-3 px-4 py-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gold text-sm font-bold text-night" aria-hidden="true">{'ABCDE'[i]}</span>
              <span className="fs-body text-white">{c.text}</span>
            </li>
          ))}
        </ul>
        {view.phase === 'order' && <Progress n={d.locked} total={d.total} label={t('screen.locked', { n: d.locked, total: d.total })} />}
      </div>
    );
  }

  return (
    <div className="flex h-full gap-10 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <h1 className="fs-h1 shrink-0">{view.phase === 'prompt' ? t('wcf.screenPrompt') : t('wcf.screenOrder')}</h1>
        <ul className="flex flex-1 min-h-0 flex-col justify-between gap-3">
          {cards.map((c, i) => (
            <li key={c.id} className="a-slide flex items-center gap-6 rounded-[24px] border-[5px] border-night bg-night-3 px-8 py-4 chunky" style={{ animationDelay: `${i * 140}ms` }}>
              <span className="grid h-[58px] w-[58px] flex-none place-items-center rounded-full bg-gold fs-body font-bold text-night" aria-hidden="true">{'ABCDE'[i]}</span>
              <span className="fs-body font-semibold text-white leading-snug">{c.text}</span>
            </li>
          ))}
        </ul>
        {view.phase === 'order' && <Progress n={d.locked} total={d.total} label={t('screen.locked', { n: d.locked, total: d.total })} />}
      </div>
      <div className="flex w-[320px] flex-none flex-col items-center justify-center gap-4">
        <MascotView name="tilly" expression={view.phase === 'order' ? 'thinking' : 'idle'} size={280} />
        <p className="fs-body text-center text-cloud">{t('screen.locked', { n: d.locked, total: d.total })}</p>
      </div>
    </div>
  );
}
