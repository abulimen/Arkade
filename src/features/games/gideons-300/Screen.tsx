'use client';
import { RAINBOW } from '@/shared/types';
import { t } from '@/i18n';
import { Avatar } from '@/ui/avatars';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Pips, Progress } from '../shared';
import { AnswerButton } from '@/ui/kit';

/** One SVG for up to 500 tents: cheap to paint on low-end projectors; cut tents lift off with a CSS transform. */
function Tents({ tents, cutting, alive }: { tents: number[]; cutting: boolean; alive: number }) {
  const n = Math.max(1, tents.length);
  const W = 1100, H = 280;
  const s = Math.max(16, Math.min(64, Math.floor(Math.sqrt((W * H) / n))));
  const cols = Math.max(1, Math.floor(W / s));
  const rows = Math.ceil(n / cols);
  return (
    <svg viewBox={`0 0 ${W} ${Math.max(H, rows * s)}`} width="100%" height={H} role="img" aria-label={t('g3.tentsLabel', { n: alive })}>
      {tents.map((v, i) => {
        const state = v % 3;
        const color = RAINBOW[Math.floor(v / 3) % 6];
        if (state === 0 && !cutting) return null;
        return (
          <g key={i} transform={`translate(${(i % cols) * s} ${Math.floor(i / cols) * s})`}>
            <g className={state === 0 ? 'tent-out' : 'tent'} style={state === 0 ? { animationDelay: `${(i * 37) % 700}ms` } : state === 2 ? { filter: 'drop-shadow(0 0 8px #FFE14D)' } : undefined}>
              <path d={`M${s * 0.5} ${s * 0.1}L${s * 0.92} ${s * 0.88}L${s * 0.08} ${s * 0.88}Z`} fill={color} stroke={state === 2 ? '#FFE14D' : '#14123B'} strokeWidth={state === 2 ? 3 : 2} strokeLinejoin="round" />
              <path d={`M${s * 0.5} ${s * 0.5}L${s * 0.62} ${s * 0.88}H${s * 0.38}Z`} fill="#14123B" />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export default function G3Screen({ view }: ScreenProps) {
  const d = view.data;
  const ph = view.phase;
  const q = d.q as { text: string; options: string[] } | null;
  const cut = ph.endsWith('cut');
  const stage3 = d.stage === 3;
  const remain = ph === 'intro' ? d.counts.started : d.counts.alive;

  return (
    <div className="flex h-full flex-col gap-4">
      {!stage3 ? (
        <div className="flex items-center gap-8">
          <div className="min-w-0 flex-1 rounded-[28px] bg-night-2 p-3"><Tents tents={d.tents ?? []} cutting={cut} alive={remain} /></div>
          <div className="flex w-[360px] flex-none flex-col items-center gap-2">
            <span className="fs-display text-gold" aria-live="polite">{remain}</span><span className="fs-h2">{t('g3.remainLabel')}</span>
          </div>
        </div>
      ) : (
        <ul className="flex flex-wrap items-center gap-6 rounded-[28px] bg-night-2 p-5" aria-label={t('g3.finalists')}>
          {(d.board ?? []).map((f: { id: string; nickname: string; avatar: number; color: number; points: number; frozen: boolean }) => (
            <li key={f.id} className={`flex w-[270px] flex-col items-center gap-2 rounded-2xl p-2 ${f.frozen ? 'opacity-50' : ''}`}>
              <Avatar avatar={f.avatar} color={f.color} size={96} />
              <span className="fs-small max-w-full truncate font-semibold text-white">{f.nickname}{f.frozen ? ` · ${t('g3.frozenShort')}` : ''}</span>
              <div className="w-full"><Pips n={f.points} of={d.target} label={t('g3.pointsOf', { n: f.points, of: d.target })} /></div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex min-h-0 flex-1 gap-10">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {ph === 'intro' && <><h1 className="fs-h1">{t('g3.introTitle')}</h1><p className="fs-h2 text-cloud">{t('g3.introScreen')}</p></>}
          {cut && d.cut && <><h1 className="a-pop fs-h1">{t('g3.cutTitle', { n: d.cut.before - d.cut.after })}</h1><p className="fs-h2 text-gold">{t('g3.cutRemain', { n: d.cut.after })}</p></>}
          {ph === 's3pre' && <><h1 className="fs-h1">{t('g3.watchmenPick')}</h1><p className="fs-h2 text-cloud">{t('g3.predictedCount', { n: Object.values((d.predicted ?? {}) as Record<string, number>).reduce((a, b) => a + b, 0) })}</p></>}
          {q && (
            <>
              <h1 className="fs-h1 leading-tight">{q.text}</h1>
              <ul className="grid grid-cols-2 gap-5">
                {q.options.map((o, i) => (
                  <li key={i}><AnswerButton index={i} tone big state={ph.endsWith('r') ? (i === d.correct ? 'correct' : 'disabled') : 'idle'}><span className="fs-h2">{o}{ph.endsWith('r') && d.hist ? ` · ${d.hist[i]}` : ''}</span></AnswerButton></li>
                ))}
              </ul>
              {ph.endsWith('q') && <Progress n={d.answered} total={d.total} label={t('screen.answered', { n: d.answered, total: d.total })} />}
              {ph.endsWith('r') && <p className="fs-h2 text-gold">{d.ref}</p>}
              {ph === 's3r' && <p className="a-pop fs-h1 text-leaf">{d.winner ? t('g3.pointTo', { name: d.winner.nickname }) : t('g3.noPoint')}</p>}
            </>
          )}
          {ph === 'end' && <h1 className="a-pop fs-h1">{d.champion ? t('g3.champion', { name: d.champion.nickname }) : t('end.thanks')}</h1>}
        </div>
        <div className="flex w-[360px] flex-none items-end justify-center"><MascotView name="jari" expression={cut ? 'blast' : ph.endsWith('r') ? 'cheer' : 'ready'} size={340} /></div>
      </div>
    </div>
  );
}
