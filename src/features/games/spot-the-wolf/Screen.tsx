'use client';
import { t } from '@/i18n';
import { Avatar } from '@/ui/avatars';
import { useStageMobile } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress, Verse } from '../shared';

interface Pub { id: string; nickname: string; avatar: number; color: number }

export default function WolfScreen({ view }: ScreenProps) {
  const mobile = useStageMobile();
  const d = view.data;
  const ph = view.phase;
  const stage = d.stage as Pub[];
  const clues = d.clues as { pid: string; round: number; text: string; spoken: boolean }[];
  const votes = (d.votes ?? null) as Record<string, string> | null;
  const tally: Record<string, number> = {};
  if (votes) for (const v of Object.values(votes)) tally[v] = (tally[v] ?? 0) + 1;
  const accused = (d.accused ?? []) as { id: string; wolf: boolean }[];
  const end = d.end as { word: string; ref: string; verse: string; wolves: string[]; guesses: { pid: string; text: string; ok: boolean }[] } | null;
  const current = d.turnIndex != null ? (d.turnOrder as string[])[d.turnIndex] : null;
  const W = 1100, H = 640, cx = W / 2, cy = H / 2 + 20;
  const rx = 410, ry = 225;

  const statusAside = (
    <div className="flex flex-col gap-4">
      {ph === 'reveal' && <><h1 className={mobile ? 'fs-h2' : 'fs-h1'}>{t('wolf.checkPhones')}</h1><p className={`${mobile ? 'fs-body' : 'fs-h2'} text-cloud`}>{t('wolf.checkPhonesBody')}</p></>}
      {(ph === 'clues1' || ph === 'clues2') && <><h1 className={mobile ? 'fs-h2' : 'fs-h1'}>{t('wolf.clueRound', { n: d.clueRound })}</h1><p className={`${mobile ? 'fs-body' : 'fs-h2'} text-gold`}>{t('wolf.turnOf', { name: stage.find((s) => s.id === current)?.nickname ?? '' })}</p></>}
      {ph === 'debate' && <><h1 className={mobile ? 'fs-h2' : 'fs-h1'}>{t('wolf.discuss')}</h1><ol className="fs-body flex flex-col gap-1">{clues.map((c, i) => <li key={i}><b className="text-gold">{stage.find((s) => s.id === c.pid)?.nickname}</b>: {c.spoken ? '🗣' : c.text}</li>)}</ol></>}
      {ph === 'vote' && <><h1 className={mobile ? 'fs-h2' : 'fs-h1'}>{t('wolf.whoIsWolf')}</h1><Progress n={d.voted} total={stage.length} label={t('screen.voted', { n: d.voted, total: stage.length })} /></>}
      {ph === 'accuse' && <><h1 className={`a-pop ${mobile ? 'fs-h2' : 'fs-h1'}`}>{accused.length ? t('wolf.accusedIs', { names: accused.map((a) => stage.find((s) => s.id === a.id)?.nickname).join(', ') }) : t('wolf.noOne')}</h1><p className={`${mobile ? 'fs-body' : 'fs-h2'} text-gold`}>{accused.some((a) => a.wolf) ? t('wolf.wolfOut') : t('wolf.notWolf')}</p></>}
      {ph === 'guess' && <><h1 className={mobile ? 'fs-h2' : 'fs-h1'}>{t('wolf.guessing')}</h1><p className={`${mobile ? 'fs-body' : 'fs-h2'} text-cloud`}>{t('wolf.guessingBody')}</p></>}
      {ph === 'roundEnd' && end && (
        <>
          <p className={`${mobile ? 'fs-body' : 'fs-h2'} text-cloud`}>{t('wolf.wordWas')}</p>
          <h1 className={`a-pop ${mobile ? 'fs-h1' : 'fs-display'} text-gold`}>{end.word}</h1>
          {end.guesses.map((g) => <p key={g.pid} className="fs-body">{stage.find((s) => s.id === g.pid)?.nickname}: “{g.text}” {g.ok ? '✓' : '✗'}</p>)}
          <Verse text={end.verse} refText={end.ref} compact={!mobile} big={!mobile} />
        </>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-night-3/70 px-4 py-2">
          <span className="fs-body font-semibold text-gold">{d.category}</span>
          <MascotView name="wilf" expression={ph === 'accuse' && accused.some((a) => a.wolf) ? 'howl' : ph === 'roundEnd' ? 'win' : 'disguised'} size={56} />
        </div>
        {statusAside}
        <ul className="grid grid-cols-2 gap-3" aria-label={t('wolf.ringLabel')}>
          {stage.map((p) => {
            const last = clues.filter((c) => c.pid === p.id).slice(-1);
            const isWolf = end?.wolves.includes(p.id);
            const acc = accused.find((x2) => x2.id === p.id);
            return (
              <li
                key={p.id}
                className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-1.5 text-center ${
                  current === p.id ? 'border-gold bg-gold/15' : acc ? 'border-coral bg-coral/15' : 'border-white/10 bg-night-3/60'
                }`}
              >
                <div className="relative">
                  <Avatar avatar={p.avatar} color={p.color} size={52} />
                  {votes && <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-night">{tally[p.id] ?? 0}</span>}
                </div>
                <span className="fs-small font-semibold text-white truncate max-w-full">{p.nickname}</span>
                {isWolf && <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-night">{t('wolf.wolfTag')}</span>}
                {last.map((c, k) => (
                  <span key={k} className="rounded-xl bg-white px-2.5 py-0.5 text-xs font-semibold text-night truncate max-w-full">
                    {c.spoken ? '🗣' : c.text}
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      <div className="relative min-w-0 flex-1 flex items-center justify-center" role="group" aria-label={t('wolf.ringLabel')}>
        <div className="relative w-full max-w-[1100px] aspect-[1100/640]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <svg width="170" height="190" viewBox="0 0 220 240">
              <path d="M50 220L170 190M50 190L170 220" stroke="#C98A4B" strokeWidth="18" strokeLinecap="round" />
              <g className="m-flicker">
                <path d="M110 20Q160 80 140 140Q110 170 80 140Q60 80 110 20Z" fill="#FF9A3D" stroke="#14123B" strokeWidth="6" strokeLinejoin="round" />
                <path d="M110 70Q135 105 122 140Q110 152 98 140Q85 105 110 70Z" fill="#FFE14D" />
              </g>
            </svg>
          </div>
          {stage.map((p, i) => {
            const a = (i / stage.length) * Math.PI * 2 - Math.PI / 2;
            const xPct = ((cx + Math.cos(a) * rx) / W) * 100;
            const yPct = ((cy + Math.sin(a) * ry) / H) * 100;
            const last = clues.filter((c) => c.pid === p.id).slice(-2);
            const isWolf = end?.wolves.includes(p.id);
            const acc = accused.find((x2) => x2.id === p.id);
            return (
              <div key={p.id} className="absolute flex w-[180px] -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${xPct}%`, top: `${yPct}%` }}>
                <div className="flex min-h-[56px] flex-col items-center gap-1" aria-live="polite">
                  {last.map((c, k) => <span key={k} className="a-pop max-w-[240px] truncate rounded-2xl rounded-bl-sm bg-white px-4 py-1 fs-small font-semibold text-night shadow">{c.spoken ? '🗣' : c.text}</span>)}
                </div>
                <div className={`relative rounded-full p-1 ${current === p.id ? 'bg-gold ring-8 ring-gold/50' : acc ? 'bg-coral' : ''}`}>
                  <Avatar avatar={p.avatar} color={p.color} size={110} />
                  {votes && <span className="absolute -right-2 -top-2 grid h-12 w-12 place-items-center rounded-full border-[4px] border-night bg-white fs-small font-semibold text-night">{tally[p.id] ?? 0}</span>}
                  {isWolf && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-night bg-coral px-3 fs-small font-semibold text-night">{t('wolf.wolfTag')}</span>}
                </div>
                <span className="mt-1 max-w-full truncate fs-small font-semibold text-white">{p.nickname}</span>
                {votes && <div className="mt-1 flex h-[72px] items-end"><div className="a-growy w-7 rounded-t-lg bg-sky" style={{ height: Math.min(72, (tally[p.id] ?? 0) * 18) }} /></div>}
              </div>
            );
          })}
        </div>
      </div>
      <aside className="flex w-[480px] flex-none flex-col justify-center gap-4 overflow-hidden">
        <span className="self-start rounded-full border border-gold/40 bg-night-3 px-6 py-1.5 fs-small font-semibold text-gold">{d.category}</span>
        {statusAside}
        <MascotView name="wilf" expression={ph === 'accuse' && accused.some((a) => a.wolf) ? 'howl' : ph === 'roundEnd' ? 'win' : 'disguised'} size={220} />
      </aside>
    </div>
  );
}
