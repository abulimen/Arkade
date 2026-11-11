'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DEFAULT_CONFIG, GAME_IDS, GAME_META } from '@/shared/types';
import type { Audience, GameConfig, GameId } from '@/shared/types';
import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import { Button } from '@/ui/kit';
import { MascotView } from '@/ui/mascots';
import { AppShell } from '@/ui/shell';

function Chips<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="fs-body font-semibold text-cloud">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.v)}
              className={`cursor-pointer min-h-12 rounded-xl border-[3px] px-4 fs-body font-semibold transition ${
                active
                  ? 'border-night bg-gold text-night shadow-[0_3px_0_#0B0A1A]'
                  : 'border-white/15 bg-night-3/80 text-cloud hover:border-white/30'
              }`}
            >
              {active ? '✓ ' : ''}{o.l}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="arcade-panel p-3.5 flex flex-col justify-between gap-2">
      <span className="fs-small font-semibold text-cloud/85">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="cursor-pointer grid h-11 w-11 place-items-center rounded-xl border-2 border-white/15 bg-night-3 text-white disabled:opacity-40"
        >
          <Icon n="minus" size={18} />
        </button>
        <span className="font-semibold text-lg text-gold tabular-nums">
          {value}{suffix}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="cursor-pointer grid h-11 w-11 place-items-center rounded-xl border-2 border-white/15 bg-night-3 text-white disabled:opacity-40"
        >
          <Icon n="plus" size={18} />
        </button>
      </div>
    </div>
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
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('game') as GameId | null;
      if (q && GAME_IDS.includes(q)) setGame(q);
    }
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
    <AppShell
      active="mc"
      maxWidth="max-w-4xl"
      rightSlot={
        <span className="rounded-full border border-coral/40 bg-coral/15 px-3 py-1 text-xs font-semibold text-coral">
          {t('mc.badge')}
        </span>
      }
    >
      <div className="flex flex-col gap-6 pb-8">
        {resume.length > 0 && (
          <section aria-label={t('mc.resume')} className="arcade-card p-4 border-gold/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-leaf animate-pulse" />
              <h2 className="fs-body font-semibold text-white">{t('mc.resume')}</h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {resume.map((c) => (
                <li key={c}>
                  <Link
                    className="cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-xl bg-gold px-4 fs-small font-semibold text-night shadow-[0_3px_0_#9A6B00]"
                    href={`/mc/${c}`}
                  >
                    <Icon n="play" size={14} />
                    <span>{c}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="pick">
          <div className="mb-3 flex items-baseline justify-between">
            <h1 id="pick" className="fs-h1 text-white">{t('mc.pickGame')}</h1>
            <span className="text-xs font-semibold uppercase tracking-wider text-gold">Step 1 of 2</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('mc.pickGame')}>
            {GAME_IDS.map((id) => {
              const selected = game === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setGame(id)}
                  className={`cursor-pointer flex items-center gap-3.5 rounded-3xl border-[3px] p-4 text-left transition ${
                    selected
                      ? 'border-gold bg-night-3 shadow-[0_5px_0_#0B0A1A]'
                      : 'border-white/10 bg-night-2/80 hover:border-white/25'
                  }`}
                >
                  <MascotView name={GAME_META[id].mascot} expression={selected ? 'cheer' : 'happy'} size={76} animate={selected} />
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="fs-h2 text-white truncate">{selected ? '✓ ' : ''}{GAME_META[id].name}</span>
                    <span className="fs-small text-cloud/80 line-clamp-1">{GAME_META[id].tagline}</span>
                    <span className="fs-small font-semibold text-gold mt-1">
                      {t('mc.minutes', { a: GAME_META[id].est[0], b: GAME_META[id].est[1] })} · {t('mc.minPlayers', { n: GAME_META[id].minPlayers })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="arcade-card flex flex-col gap-5 p-5 sm:p-6" aria-label={t('mc.settings')}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="fs-h2 text-white">{t('mc.settings')} · {meta.name}</h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-sky">Step 2 of 2</span>
          </div>

          <Chips<Audience> label={t('mc.audience')} value={cfg.audience} onChange={(v) => set('audience', v)} options={[{ v: 'kids', l: t('mc.kids') }, { v: 'youth', l: t('mc.youth') }, { v: 'adults', l: t('mc.adults') }]} />
          <Chips<GameConfig['difficulty']> label={t('mc.difficulty')} value={cfg.difficulty} onChange={(v) => set('difficulty', v)} options={[{ v: 'mixed', l: t('mc.mixed') }, { v: 'easy', l: t('mc.easy') }, { v: 'medium', l: t('mc.medium') }, { v: 'hard', l: t('mc.hard') }]} />
          {meta.modes.length > 1 && <Chips<GameConfig['mode']> label={t('mc.mode')} value={cfg.mode} onChange={(v) => set('mode', v)} options={[{ v: 'individual', l: t('mc.individual') }, { v: 'team', l: t('mc.team') }]} />}
          <Chips<GameConfig['pace']> label={t('mc.pace')} value={cfg.pace} onChange={(v) => set('pace', v)} options={[{ v: 0.75, l: t('mc.relaxed') }, { v: 1, l: t('mc.normal') }, { v: 1.5, l: t('mc.fast') }]} />

          {game === 'gideons-300' && (
            <div className="grid gap-3 sm:grid-cols-3 pt-1">
              <Stepper
                label={t('mc.keep1', { n: Math.round(cfg.keep1 * 100) })}
                value={Math.round(cfg.keep1 * 100)}
                min={40}
                max={100}
                step={5}
                suffix="%"
                onChange={(v) => set('keep1', v / 100)}
              />
              <Stepper
                label={t('mc.keep2', { n: Math.round(cfg.keep2 * 100) })}
                value={Math.round(cfg.keep2 * 100)}
                min={10}
                max={60}
                step={5}
                suffix="%"
                onChange={(v) => set('keep2', v / 100)}
              />
              <Stepper
                label={t('mc.finalists', { n: cfg.finalists })}
                value={cfg.finalists}
                min={2}
                max={20}
                step={1}
                onChange={(v) => set('finalists', v)}
              />
            </div>
          )}

          {game === 'spot-the-wolf' && (
            <div className="space-y-4 pt-1">
              <Chips<number> label={t('mc.wolves')} value={cfg.wolves ?? 0} onChange={(v) => set('wolves', v === 0 ? null : v)} options={[{ v: 0, l: t('mc.auto') }, { v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3' }]} />
              <button
                type="button"
                role="switch"
                aria-checked={cfg.lookalike}
                onClick={() => set('lookalike', !cfg.lookalike)}
                className="cursor-pointer arcade-panel w-full p-4 flex items-center justify-between gap-4 text-left"
              >
                <span className="fs-body font-semibold text-cloud">{t('mc.lookalike')}</span>
                <span className={`inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${cfg.lookalike ? 'bg-gold justify-end' : 'bg-night-3 justify-start'}`}>
                  <span className="h-6 w-6 rounded-full bg-night shadow" />
                </span>
              </button>
            </div>
          )}
        </section>

        {err && <p role="alert" className="rounded-2xl bg-coral px-4 py-3 fs-body font-semibold text-night">{err}</p>}

        <Button onClick={create} loading={busy}>
          <Icon n="sparkle" size={20} />
          {t('mc.create')}
        </Button>
      </div>
    </AppShell>
  );
}
