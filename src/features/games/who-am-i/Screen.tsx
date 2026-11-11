'use client';
import { RAINBOW } from '@/shared/types';
import { t } from '@/i18n';
import { useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Verse } from '../shared';

export default function WaiScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data;
  const r = d.result;
  const clues: string[] = d.clues ?? [];

  if (mobile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-night-3/60 p-3">
          <MascotView name="cami" expression={r ? 'proud' : 'curious'} size={96} reveal={d.reveal} color={RAINBOW[d.color]} />
          <div className="min-w-0 flex-1">
            {r ? (
              <>
                <h1 className="fs-h1 text-gold">{r.name}</h1>
                <p className="fs-small text-cloud/90">{t('wai.gotItN', { n: r.correctCount })} · {r.ref}</p>
              </>
            ) : (
              <h1 className="fs-h2 text-white">{t('wai.who')}</h1>
            )}
            <p className="mt-1 inline-block rounded-full bg-night-2 px-3 py-0.5 fs-small text-gold" role="status">
              {t('screen.lockedIn', { n: d.locked })}
            </p>
          </div>
        </div>
        {r ? (
          <div className="flex flex-col gap-3">
            <p className="fs-body text-cloud">{r.story}</p>
            <Verse text={r.verse} refText={r.ref} />
          </div>
        ) : (
          <ol className="flex flex-col gap-2" aria-label={t('wai.clues')}>
            {clues.map((c, i) => (
              <li
                key={i}
                className={`a-drop rounded-2xl border-2 border-night px-4 py-2.5 fs-body ${
                  i === clues.length - 1 ? 'bg-gold font-semibold text-night' : 'bg-night-3 text-white'
                }`}
              >
                <span className="mr-2 font-bold">{i + 1}.</span>{c}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center gap-10 overflow-hidden">
      <div className="flex w-[400px] flex-none flex-col items-center justify-center gap-5">
        <MascotView name="cami" expression={r ? 'proud' : 'curious'} size={380} reveal={d.reveal} color={RAINBOW[d.color]} />
        <p className="fs-body rounded-full bg-night-3 px-7 py-2 font-semibold text-white" role="status">{t('screen.lockedIn', { n: d.locked })}</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 overflow-hidden">
        {r ? (
          <>
            <h1 className="a-pop font-semibold leading-none text-gold" style={{ fontSize: r.name.length > 14 ? '68px' : '92px' }}>{r.name}</h1>
            <p className="fs-body text-cloud">{t('wai.gotItN', { n: r.correctCount })} · <span className="text-gold">{r.ref}</span></p>
            <p className="a-fade fs-body leading-snug text-white" style={{ animationDelay: '600ms' }}>{r.story}</p>
            <div className="a-fade rounded-2xl border border-white/15 bg-night-2/80 px-6 py-4" style={{ animationDelay: '1100ms' }}>
              <Verse text={r.verse} refText={r.ref} compact big />
            </div>
          </>
        ) : (
          <>
            <h1 className="fs-h1">{t('wai.who')}</h1>
            <ol className="flex flex-col gap-3" aria-label={t('wai.clues')}>
              {clues.map((c, i) => (
                <li
                  key={i}
                  className={`a-drop rounded-[24px] border-[5px] border-night px-7 py-3 fs-body leading-snug ${
                    i === clues.length - 1 ? 'bg-gold font-semibold text-night' : 'bg-night-3 text-white'
                  }`}
                >
                  <span className="mr-4 font-bold">{i + 1}.</span>{c}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
