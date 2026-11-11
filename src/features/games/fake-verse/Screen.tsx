'use client';
import { t } from '@/i18n';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress, ScrollCard, Verse } from '../shared';

export default function FvScreen({ view }: ScreenProps) {
  const d = view.data;
  const dbl = d.mult === 2 && <span className="fs-h2 rounded-full bg-violet px-8 py-2 text-night">{t('fv.double')}</span>;
  const prompt = (
    <ScrollCard className="a-slide">
      <p className="fs-h1 leading-tight">{d.text}</p>
    </ScrollCard>
  );
  if (view.phase === 'reveal' && d.result) {
    const r = d.result;
    return (
      <div className="flex h-full flex-col gap-6">
        <p className="fs-h2 text-cloud">{d.text}</p>
        <div className="a-pop flex items-center gap-8 rounded-[28px] border-[6px] border-night bg-leaf px-10 py-5 text-night">
          <span className="fs-h1">{t('fv.truth')}: {r.truth.toUpperCase()}</span><span className="fs-h2">({r.ref})</span>
          <span className="fs-h2 ml-auto rounded-full bg-night px-6 py-1 text-white">{t('fv.gotItRight', { n: r.correct })}</span>
        </div>
        <ul className="flex flex-col gap-3">
          {r.fakes.slice(0, 5).map((f: { text: string; authors: string[]; votes: number }, i: number) => (
            <li key={i} className="a-drop flex items-center gap-6" style={{ animationDelay: `${1400 + i * 700}ms` }}>
              <span className="fs-h2 w-[620px] flex-none truncate text-white">“{f.text.toUpperCase()}” <span className="fs-body text-cloud">{t('fv.by', { name: f.authors.join(' & ') })}</span></span>
              <span className="fs-body w-[200px] flex-none text-gold">{t('fv.fooledN', { n: f.votes })}</span>
              <span className="h-10 rounded-full bg-tangerine" style={{ width: `${Math.max(2, f.votes) * 36}px`, maxWidth: 380 }} />
            </li>
          ))}
        </ul>
        <div className="a-fade mt-auto" style={{ animationDelay: `${1400 + Math.min(5, r.fakes.length) * 700}ms` }}><Verse text={r.verse} refText={r.ref} big /></div>
        <div className="absolute bottom-0 right-0"><MascotView name="fenn" expression="proud" size={240} /></div>
      </div>
    );
  }
  if (view.phase === 'vote') {
    const opts: { id: string; text: string }[] = d.options ?? [];
    return (
      <div className="flex h-full flex-col gap-6">
        <p className="fs-h2 text-cloud">{d.text}</p>
        <ul className="grid flex-1 grid-cols-2 content-start gap-5">
          {opts.map((o, i) => <li key={o.id} className="a-pop flex items-center gap-5 rounded-[28px] border-[6px] border-night bg-night-3 px-6 py-4 chunky" style={{ animationDelay: `${i * 100}ms` }}><span className="grid h-[64px] w-[64px] flex-none place-items-center rounded-full bg-gold fs-body text-night" aria-hidden="true">{'ABCDEFGHIJK'[i]}</span><span className="fs-h2 truncate text-white">{o.text.toUpperCase()}</span></li>)}
        </ul>
        <Progress n={d.voted} total={d.total} label={t('screen.voted', { n: d.voted, total: d.total })} />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col gap-10">
      <div className="flex items-center gap-8"><h1 className="fs-h1">{view.phase === 'prompt' ? t('fv.screenPrompt') : t('fv.screenWrite')}</h1>{dbl}</div>
      <div className="flex flex-1 items-center gap-10"><div className="flex-1">{prompt}</div><MascotView name="fenn" expression={view.phase === 'write' ? 'writing' : 'scheming'} size={340} /></div>
      {view.phase === 'write' && <Progress n={d.submitted} total={d.total} label={t('screen.submitted', { n: d.submitted, total: d.total })} />}
    </div>
  );
}
