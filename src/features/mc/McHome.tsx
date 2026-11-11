'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DEFAULT_CONFIG, GAME_IDS, GAME_META } from '@/shared/types';
import type { Audience, GameConfig, GameId } from '@/shared/types';
import { t } from '@/i18n';
import { Button, Wordmark } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';

function Chips<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="fs-body font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
            className={`min-h-12 rounded-xl border-[3px] px-4 fs-body font-semibold ${value === o.v ? 'border-white bg-gold text-night' : 'border-night bg-night-3 text-cloud'}`}>
            {value === o.v ? '✓ ' : ''}{o.l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function McHome() {
  const router = useRouter();
  const [game, setGame] = useState<GameId>('what-came-first');
  const [cfg, setCfg] = useState<GameConfig>(DEFAULT_CONFIG);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resume, setResume] = useState<string[]>([]);
  const set = <K extends keyof GameConfig>(k: K, v: GameConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const meta = GAME_META[game];

  useEffect(() => {
    const codes = Object.keys(localStorage).filter((k) => k.startsWith('arkade:host:')).map((k) => k.slice(12));
    Promise.all(codes.map((c) => fetch(`/api/rooms/${c}`).then((r) => (r.ok ? c : null)).catch(() => null))).then((r) => setResume(r.filter(Boolean) as string[]));
  }, []);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId: game, config: { ...cfg, mode: meta.modes.includes(cfg.mode) ? cfg.mode : 'individual' } }) });
      const j = await r.json();
      if (!r.ok) { setErr(t(`mc.err.${j.error}`)); setBusy(false); return; }
      localStorage.setItem(`arkade:host:${j.code}`, j.hostKey);
      router.push(`/mc/${j.code}#k=${j.hostKey}`);
    } catch { setErr(t('err.generic')); setBusy(false); }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 pb-10 pt-6">
      <header className="flex items-center justify-between"><h1><Wordmark size={36} /></h1><span className="rounded-full bg-night-3 px-3 py-1 fs-small">{t('mc.badge')}</span></header>
      <section aria-labelledby="pick"><h2 id="pick" className="fs-h2 mb-3">{t('mc.pickGame')}</h2>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('mc.pickGame')}>
          {GAME_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={game === id} onClick={() => setGame(id)}
              className={`flex items-center gap-3 rounded-3xl border-[3px] p-3 text-left ${game === id ? 'border-gold bg-night-3' : 'border-night bg-night-2'}`}>
              <MascotView name={GAME_META[id].mascot} expression={game === id ? 'happy' : 'idle'} size={72} animate={game === id} />
              <span className="flex flex-col"><span className="fs-h2">{game === id ? '✓ ' : ''}{GAME_META[id].name}</span><span className="fs-small text-cloud">{GAME_META[id].tagline}</span><span className="fs-small text-gold">{t('mc.minutes', { a: GAME_META[id].est[0], b: GAME_META[id].est[1] })} · {t('mc.minPlayers', { n: GAME_META[id].minPlayers })}</span></span>
            </button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-3xl bg-night-2 p-4" aria-label={t('mc.settings')}>
        <Chips<Audience> label={t('mc.audience')} value={cfg.audience} onChange={(v) => set('audience', v)} options={[{ v: 'kids', l: t('mc.kids') }, { v: 'youth', l: t('mc.youth') }, { v: 'adults', l: t('mc.adults') }]} />
        <Chips<GameConfig['difficulty']> label={t('mc.difficulty')} value={cfg.difficulty} onChange={(v) => set('difficulty', v)} options={[{ v: 'mixed', l: t('mc.mixed') }, { v: 'easy', l: t('mc.easy') }, { v: 'medium', l: t('mc.medium') }, { v: 'hard', l: t('mc.hard') }]} />
        {meta.modes.length > 1 && <Chips<GameConfig['mode']> label={t('mc.mode')} value={cfg.mode} onChange={(v) => set('mode', v)} options={[{ v: 'individual', l: t('mc.individual') }, { v: 'team', l: t('mc.team') }]} />}
        <Chips<GameConfig['pace']> label={t('mc.pace')} value={cfg.pace} onChange={(v) => set('pace', v)} options={[{ v: 0.75, l: t('mc.relaxed') }, { v: 1, l: t('mc.normal') }, { v: 1.5, l: t('mc.fast') }]} />
        {game === 'gideons-300' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 fs-body">{t('mc.keep1', { n: Math.round(cfg.keep1 * 100) })}<input type="range" min={40} max={100} value={Math.round(cfg.keep1 * 100)} onChange={(e) => set('keep1', Number(e.target.value) / 100)} className="min-h-12" /></label>
            <label className="flex flex-col gap-1 fs-body">{t('mc.keep2', { n: Math.round(cfg.keep2 * 100) })}<input type="range" min={10} max={60} value={Math.round(cfg.keep2 * 100)} onChange={(e) => set('keep2', Number(e.target.value) / 100)} className="min-h-12" /></label>
            <label className="flex flex-col gap-1 fs-body">{t('mc.finalists', { n: cfg.finalists })}<input type="range" min={2} max={20} value={cfg.finalists} onChange={(e) => set('finalists', Number(e.target.value))} className="min-h-12" /></label>
          </div>
        )}
        {game === 'spot-the-wolf' && (
          <>
            <Chips<number> label={t('mc.wolves')} value={cfg.wolves ?? 0} onChange={(v) => set('wolves', v === 0 ? null : v)} options={[{ v: 0, l: t('mc.auto') }, { v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3' }]} />
            <label className="flex min-h-12 items-center gap-3 fs-body"><input type="checkbox" className="h-6 w-6" checked={cfg.lookalike} onChange={(e) => set('lookalike', e.target.checked)} />{t('mc.lookalike')}</label>
          </>
        )}
      </section>
      {err && <p role="alert" className="rounded-xl bg-coral px-3 py-2 fs-body text-night">{err}</p>}
      <Button onClick={create} loading={busy}>{t('mc.create')}</Button>
      {resume.length > 0 && (
        <section aria-label={t('mc.resume')} className="rounded-3xl bg-night-2 p-4"><h2 className="fs-h2 mb-2">{t('mc.resume')}</h2>
          <ul className="flex flex-wrap gap-2">{resume.map((c) => <li key={c}><Link className="inline-flex min-h-12 items-center rounded-xl bg-night-3 px-4 fs-body font-semibold underline" href={`/mc/${c}`}>{c}</Link></li>)}</ul>
        </section>
      )}
    </main>
  );
}
