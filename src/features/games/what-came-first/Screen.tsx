'use client';
import { t } from '@/i18n';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress, Verse } from '../shared';

export default function WcfScreen({ view }: ScreenProps) {
  const d = view.data;
  if (view.phase === 'reveal' && d.reveal) {
    const r = d.reveal;
    return (
      <div className="relative flex h-full gap-12">
        <ol className="relative flex flex-1 flex-col justify-between py-2" aria-label={t('wcf.correctOrder')}>
          <span className="absolute left-[34px] top-10 bottom-10 w-3 rounded-full bg-plank" aria-hidden="true" />
          {r.timeline.map((e: { id: string; text: string; ref: string }, i: number) => (
            <li key={`${view.round}-${e.id}`} className="a-drop relative flex items-center gap-8" style={{ animationDelay: `${i * 900}ms` }}>
              <span className="z-10 grid h-[80px] w-[80px] flex-none place-items-center rounded-full border-[6px] border-night bg-gold fs-h2 text-night">{i + 1}</span>
              <span className="fs-h2 text-white">{e.text}</span>
              <span className="fs-body ml-auto rounded-full bg-night-3 px-6 py-1 text-gold">{e.ref}</span>
            </li>
          ))}
        </ol>
        <div className="a-fade flex w-[420px] flex-none flex-col items-center justify-end gap-6" style={{ animationDelay: '4700ms' }}>
          <MascotView name="tilly" expression="counting" size={300} />
          <p className="fs-h2 text-center text-leaf">{t('wcf.perfectCount', { n: r.perfect })}</p>
        </div>
        <div className="a-fade absolute inset-x-0 -bottom-4" style={{ animationDelay: '5400ms' }}><Verse text={r.verse} refText={r.ref} big /></div>
      </div>
    );
  }
  const cards: { id: string; text: string }[] = d.cards ?? [];
  return (
    <div className="flex h-full gap-12">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <h1 className="fs-h1">{view.phase === 'prompt' ? t('wcf.screenPrompt') : t('wcf.screenOrder')}</h1>
        <ul className="flex flex-1 flex-col justify-between gap-4">
          {cards.map((c, i) => (
            <li key={c.id} className="a-slide flex items-center gap-8 rounded-[28px] border-[6px] border-night bg-night-3 px-10 py-5 chunky" style={{ animationDelay: `${i * 150}ms` }}>
              <span className="grid h-[64px] w-[64px] flex-none place-items-center rounded-full bg-gold fs-body text-night" aria-hidden="true">{'ABCDE'[i]}</span>
              <span className="fs-h2 text-white">{c.text}</span>
            </li>
          ))}
        </ul>
        {view.phase === 'order' && <Progress n={d.locked} total={d.total} label={t('screen.locked', { n: d.locked, total: d.total })} />}
      </div>
      <div className="flex w-[360px] flex-none flex-col items-center justify-center gap-4"><MascotView name="tilly" expression={view.phase === 'order' ? 'thinking' : 'idle'} size={320} /><p className="fs-body text-center text-cloud">{t('screen.locked', { n: d.locked, total: d.total })}</p></div>
    </div>
  );
}
