'use client';
import { t } from '@/i18n';
import { Avatar } from '@/ui/avatars';
import { MascotView } from '@/ui/mascots';
import type { ScreenProps } from '../types';
import { Progress, Verse } from '../shared';

interface Pub { id: string; nickname: string; avatar: number; color: number }

export default function WolfScreen({ view }: ScreenProps) {
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
  const rx = 430, ry = 235;

  return (
    <div className="flex h-full gap-8">
      <div className="relative flex-1" style={{ minWidth: W }} role="group" aria-label={t('wolf.ringLabel')}>
        <div className="absolute" style={{ left: cx - 110, top: cy - 120 }} aria-hidden="true">
          <svg width="220" height="240" viewBox="0 0 220 240"><path d="M50 220L170 190M50 190L170 220" stroke="#C98A4B" strokeWidth="18" strokeLinecap="round" /><g className="m-flicker"><path d="M110 20Q160 80 140 140Q110 170 80 140Q60 80 110 20Z" fill="#FF9A3D" stroke="#14123B" strokeWidth="6" strokeLinejoin="round" /><path d="M110 70Q135 105 122 140Q110 152 98 140Q85 105 110 70Z" fill="#FFE14D" /></g></svg>
        </div>
        <div className="absolute text-center" style={{ left: cx - 200, top: cy + 100, width: 400 }}>
          <p className="fs-body rounded-full bg-night-3 px-6 py-1 text-gold">{d.category}</p>
        </div>
        {stage.map((p, i) => {
          const a = (i / stage.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
          const last = clues.filter((c) => c.pid === p.id).slice(-2);
          const isWolf = end?.wolves.includes(p.id);
          const acc = accused.find((x2) => x2.id === p.id);
          return (
            <div key={p.id} className="absolute flex w-[170px] -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: x, top: y }}>
              <div className="flex min-h-[64px] flex-col items-center gap-1" aria-live="polite">
                {last.map((c, k) => <span key={k} className="a-pop max-w-[200px] truncate rounded-2xl rounded-bl-sm bg-white px-4 py-1 fs-small font-semibold text-night">{c.spoken ? '🗣' : c.text}</span>)}
              </div>
              <div className={`relative rounded-full p-1 ${current === p.id ? 'bg-gold ring-8 ring-gold/50' : acc ? 'bg-coral' : ''}`}>
                <Avatar avatar={p.avatar} color={p.color} size={120} />
                {votes && <span className="absolute -right-2 -top-2 grid h-14 w-14 place-items-center rounded-full border-[4px] border-night bg-white fs-small font-semibold text-night">{tally[p.id] ?? 0}</span>}
                {isWolf && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-night bg-coral px-3 fs-small font-semibold text-night">{t('wolf.wolfTag')}</span>}
              </div>
              <span className="mt-1 max-w-full truncate fs-small font-semibold text-white">{p.nickname}</span>
              {votes && <div className="mt-1 flex h-[84px] items-end"><div className="a-growy w-8 rounded-t-lg bg-sky" style={{ height: Math.min(84, (tally[p.id] ?? 0) * 21) }} /></div>}
            </div>
          );
        })}
      </div>
      <aside className="flex w-[560px] flex-none flex-col justify-center gap-5">
        {ph === 'reveal' && <><h1 className="fs-h1">{t('wolf.checkPhones')}</h1><p className="fs-h2 text-cloud">{t('wolf.checkPhonesBody')}</p></>}
        {(ph === 'clues1' || ph === 'clues2') && <><h1 className="fs-h1">{t('wolf.clueRound', { n: d.clueRound })}</h1><p className="fs-h2 text-gold">{t('wolf.turnOf', { name: stage.find((s) => s.id === current)?.nickname ?? '' })}</p></>}
        {ph === 'debate' && <><h1 className="fs-h1">{t('wolf.discuss')}</h1><ol className="fs-body flex flex-col gap-1">{clues.map((c, i) => <li key={i}><b className="text-gold">{stage.find((s) => s.id === c.pid)?.nickname}</b>: {c.spoken ? '🗣' : c.text}</li>)}</ol></>}
        {ph === 'vote' && <><h1 className="fs-h1">{t('wolf.whoIsWolf')}</h1><Progress n={d.voted} total={stage.length} label={t('screen.voted', { n: d.voted, total: stage.length })} /></>}
        {ph === 'accuse' && <><h1 className="a-pop fs-h1">{accused.length ? t('wolf.accusedIs', { names: accused.map((a) => stage.find((s) => s.id === a.id)?.nickname).join(', ') }) : t('wolf.noOne')}</h1><p className="fs-h2 text-gold">{accused.some((a) => a.wolf) ? t('wolf.wolfOut') : t('wolf.notWolf')}</p></>}
        {ph === 'guess' && <><h1 className="fs-h1">{t('wolf.guessing')}</h1><p className="fs-h2 text-cloud">{t('wolf.guessingBody')}</p></>}
        {ph === 'roundEnd' && end && (
          <>
            <p className="fs-h2 text-cloud">{t('wolf.wordWas')}</p><h1 className="a-pop fs-display text-gold">{end.word}</h1>
            {end.guesses.map((g) => <p key={g.pid} className="fs-body">{stage.find((s) => s.id === g.pid)?.nickname}: “{g.text}” {g.ok ? '✓' : '✗'}</p>)}
            <Verse text={end.verse} refText={end.ref} big />
          </>
        )}
        <MascotView name="wilf" expression={ph === 'accuse' && accused.some((a) => a.wolf) ? 'howl' : ph === 'roundEnd' ? 'win' : 'disguised'} size={260} />
      </aside>
    </div>
  );
}
