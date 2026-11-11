'use client';
import { t } from '@/i18n';
import { useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress, ScrollCard, Verse } from '../shared';

export default function FvScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data;
  const dbl = d.mult === 2 && (
    <span className={`${mobile ? 'fs-small px-3 py-1' : 'fs-h2 px-8 py-2'} rounded-full bg-violet font-semibold text-night`}>
      {t('fv.double')}
    </span>
  );
  const prompt = (
    <ScrollCard className="a-slide">
      <p className={`${mobile ? 'fs-h2' : 'fs-h1'} leading-tight`}>{d.text}</p>
    </ScrollCard>
  );

  if (view.phase === 'reveal' && d.result) {
    const r = d.result;
    if (mobile) {
      return (
        <div className="flex flex-col gap-4">
          <p className="fs-body text-cloud">{d.text}</p>
          <div className="rounded-2xl border-2 border-night bg-leaf px-4 py-3 text-night flex flex-col gap-1">
            <span className="fs-h2 font-semibold">{t('fv.truth')}: {r.truth.toUpperCase()}</span>
            <span className="fs-small">{r.ref} · {t('fv.gotItRight', { n: r.correct })}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {r.fakes.slice(0, 5).map((f: { text: string; authors: string[]; votes: number }, i: number) => (
              <li key={i} className="rounded-xl bg-night-3 px-3 py-2 flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate fs-small text-white">“{f.text.toUpperCase()}” <span className="text-cloud/75">{t('fv.by', { name: f.authors.join(' & ') })}</span></span>
                <span className="shrink-0 fs-small font-semibold text-gold">{t('fv.fooledN', { n: f.votes })}</span>
              </li>
            ))}
          </ul>
          <Verse text={r.verse} refText={r.ref} />
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <p className="fs-body text-cloud truncate">{d.text}</p>
        <div className="a-pop flex items-center gap-6 rounded-[24px] border-[5px] border-night bg-leaf px-8 py-4 text-night shrink-0">
          <span className="fs-h2 font-semibold truncate">{t('fv.truth')}: {r.truth.toUpperCase()}</span>
          <span className="fs-body shrink-0">({r.ref})</span>
          <span className="fs-body ml-auto shrink-0 rounded-full bg-night px-5 py-1 text-white">{t('fv.gotItRight', { n: r.correct })}</span>
        </div>
        <ul className="flex flex-col gap-2.5 min-h-0 flex-1 justify-center">
          {r.fakes.slice(0, 5).map((f: { text: string; authors: string[]; votes: number }, i: number) => (
            <li key={i} className="a-drop flex items-center gap-5 min-w-0" style={{ animationDelay: `${900 + i * 500}ms` }}>
              <span className="fs-body min-w-0 flex-1 truncate text-white">
                “{f.text.toUpperCase()}” <span className="fs-small text-cloud/80">{t('fv.by', { name: f.authors.join(' & ') })}</span>
              </span>
              <span className="fs-small w-[190px] flex-none text-right font-semibold text-gold">{t('fv.fooledN', { n: f.votes })}</span>
              <span className="h-7 flex-none rounded-full bg-tangerine" style={{ width: `${Math.max(2, f.votes) * 32}px`, maxWidth: 260 }} />
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-end gap-6 shrink-0">
          <div className="a-fade min-w-0 flex-1 rounded-2xl border border-white/15 bg-night-2/80 px-6 py-3" style={{ animationDelay: '2200ms' }}>
            <Verse text={r.verse} refText={r.ref} compact big />
          </div>
          <div className="shrink-0">
            <MascotView name="fenn" expression="proud" size={180} />
          </div>
        </div>
      </div>
    );
  }

  if (view.phase === 'vote') {
    const opts: { id: string; text: string }[] = d.options ?? [];
    return (
      <div className="flex h-full flex-col gap-5">
        <p className={`${mobile ? 'fs-body' : 'fs-h2'} text-cloud`}>{d.text}</p>
        <ul className={`grid flex-1 ${mobile ? 'grid-cols-1 gap-2.5' : 'grid-cols-2 gap-4'} content-start`}>
          {opts.map((o, i) => (
            <li
              key={o.id}
              className={`a-pop flex items-center gap-4 rounded-[22px] border-[4px] border-night bg-night-3 chunky ${mobile ? 'px-4 py-2.5' : 'px-6 py-3.5'}`}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className={`grid flex-none place-items-center rounded-full bg-gold fs-body font-bold text-night ${mobile ? 'h-9 w-9' : 'h-[56px] w-[56px]'}`} aria-hidden="true">
                {'ABCDEFGHIJK'[i]}
              </span>
              <span className={`${mobile ? 'fs-body' : 'fs-h2'} truncate text-white`}>{o.text.toUpperCase()}</span>
            </li>
          ))}
        </ul>
        <Progress n={d.voted} total={d.total} label={t('screen.voted', { n: d.voted, total: d.total })} />
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${mobile ? 'gap-5' : 'gap-8'}`}>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className={mobile ? 'fs-h2 text-white' : 'fs-h1'}>{view.phase === 'prompt' ? t('fv.screenPrompt') : t('fv.screenWrite')}</h1>
        {dbl}
      </div>
      <div className={`flex flex-1 items-center ${mobile ? 'flex-col gap-4' : 'gap-10'}`}>
        <div className="min-w-0 flex-1 w-full">{prompt}</div>
        <MascotView name="fenn" expression={view.phase === 'write' ? 'writing' : 'scheming'} size={mobile ? 140 : 320} />
      </div>
      {view.phase === 'write' && <Progress n={d.submitted} total={d.total} label={t('screen.submitted', { n: d.submitted, total: d.total })} />}
    </div>
  );
}
