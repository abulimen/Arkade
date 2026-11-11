'use client';
import { RAINBOW } from '@/shared/types';
import { t } from '@/i18n';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Verse } from '../shared';

export default function WaiScreen({ view }: ScreenProps) {
  const d = view.data;
  const r = d.result;
  const clues: string[] = d.clues ?? [];
  return (
    <div className="flex h-full gap-12">
      <div className="flex w-[560px] flex-none flex-col items-center justify-center gap-4">
        <MascotView name="cami" expression={r ? 'proud' : 'curious'} size={520} reveal={d.reveal} color={RAINBOW[d.color]} />
        <p className="fs-h2 rounded-full bg-night-3 px-8 py-2 text-white" role="status">{t('screen.lockedIn', { n: d.locked })}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-6">
        {r ? (
          <>
            <h1 className="a-pop fs-display text-gold">{r.name}</h1>
            <p className="fs-h2 text-cloud">{t('wai.gotItN', { n: r.correctCount })} · {r.ref}</p>
            <p className="a-fade fs-h2" style={{ animationDelay: '800ms' }}>{r.story}</p>
            <div className="a-fade" style={{ animationDelay: '1600ms' }}><Verse text={r.verse} refText={r.ref} big /></div>
          </>
        ) : (
          <>
            <h1 className="fs-h1">{t('wai.who')}</h1>
            <ol className="flex flex-col gap-4" aria-label={t('wai.clues')}>
              {clues.map((c, i) => <li key={i} className={`a-drop rounded-[28px] border-[6px] border-night px-8 py-4 fs-h2 ${i === clues.length - 1 ? 'bg-gold text-night' : 'bg-night-3 text-white'}`}><span className="mr-4">{i + 1}.</span>{c}</li>)}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
