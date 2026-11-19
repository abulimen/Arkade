'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_CONFIG, GAME_IDS, GAME_META, type GameConfig, type GameHistoryEntry, type GameId } from '@/shared/types';
import { t } from '@/i18n';
import { enableSound, haptic, playUi } from '@/client/sound';
import { AppShell } from '@/ui/shell';
import { Avatar } from '@/ui/avatars';
import { Button } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/icons';
import { MascotView } from '@/ui/mascots';
import { ConsoleFieldCanvas } from '@/ui/ConsoleFieldCanvas';

interface ResumeRoom {
  code: string;
  gameName: string;
  status: string;
}

const GAME_CARD_STYLE: Record<GameId, { gradient: string; accent: string; badge: string; icon: IconName }> = {
  'spot-the-wolf': { gradient: 'linear-gradient(155deg, #FF665A 0%, #D42C36 100%)', accent: '#FF5C6C', badge: 'Find the Wolf', icon: 'eye' },
  'fake-verse': { gradient: 'linear-gradient(155deg, #35C4FF 0%, #156EE8 100%)', accent: '#29C5FF', badge: 'Make Up a Trick', icon: 'sparkle' },
  'gideons-300': { gradient: 'linear-gradient(155deg, #FFC83D 0%, #E07814 100%)', accent: '#FFD026', badge: 'Last One Standing', icon: 'crown' },
  'what-came-first': { gradient: 'linear-gradient(155deg, #9F7BFF 0%, #5856D6 100%)', accent: '#B56BFF', badge: 'Put 5 in Order', icon: 'bolt' },
  'who-am-i': { gradient: 'linear-gradient(155deg, #3BE882 0%, #109E56 100%)', accent: '#38EC82', badge: '5-Clue Mystery', icon: 'star' },
};

export default function McHome({ initialGame = 'spot-the-wolf' }: { initialGame?: GameId }) {
  const router = useRouter();
  const [game, setGame] = useState<GameId>(initialGame);
  const [cfg, setCfg] = useState<GameConfig>({ ...DEFAULT_CONFIG });
  const [resume, setResume] = useState<ResumeRoom[]>([]);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const codes: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith('arkade:host:')) codes.push(k.slice('arkade:host:'.length));
    }
    const q = codes.length ? `?codes=${encodeURIComponent(codes.join(','))}` : '';
    fetch(`/api/history${q}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { history?: GameHistoryEntry[] } | null) => {
        if (j?.history?.length) {
          setHistory(j.history);
          setOpenHistoryId(j.history[0].id);
        }
      })
      .catch(() => undefined);
    if (!codes.length) return;
    Promise.all(
      codes.slice(0, 6).map(async (c) => {
        try {
          const r = await fetch(`/api/rooms/${c}`);
          if (!r.ok) {
            localStorage.removeItem(`arkade:host:${c}`);
            return null;
          }
          const j = (await r.json()) as { gameName: string; status: string };
          if (j.status === 'closed') {
            localStorage.removeItem(`arkade:host:${c}`);
            return null;
          }
          return { code: c, gameName: j.gameName, status: j.status };
        } catch {
          return null;
        }
      }),
    ).then((items) => setResume(items.filter((x): x is ResumeRoom => x !== null)));
  }, []);

  const meta = GAME_META[game];
  const teamAllowed = meta.modes.includes('team');
  const activeMode = teamAllowed ? cfg.mode : 'individual';

  const pickGame = (id: GameId) => {
    playUi('ui-snap');
    haptic('snap');
    setGame(id);
    setErr(null);
  };

  const setField = <K extends keyof GameConfig>(key: K, val: GameConfig[K]) => {
    playUi('ui-focus');
    haptic('tick');
    setCfg((c) => ({ ...c, [key]: val }));
  };

  const create = async () => {
    void enableSound();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId: game, config: { ...cfg, mode: activeMode } }),
      });
      const j = await r.json();
      if (!r.ok) {
        playUi('ui-error');
        haptic('error');
        const k = `mc.err.${j.error || ''}`;
        const translated = t(k);
        setErr(translated === k ? t('err.generic') : translated);
        setBusy(false);
        return;
      }
      localStorage.setItem(`arkade:host:${j.code}`, j.hostKey);
      playUi('ui-lock');
      haptic('success');
      router.push(`/mc/${j.code}#k=${j.hostKey}`);
    } catch {
      playUi('ui-error');
      haptic('error');
      setErr(t('err.generic'));
      setBusy(false);
    }
  };

  return (
    <AppShell active="mc" maxWidth="max-w-6xl">
      <div className="space-y-6 pt-1">
        <ConsoleFieldCanvas
          seed={808}
          accent={GAME_CARD_STYLE[game].accent}
          secondary="#FFD026"
          density={0.5}
          className="fixed inset-x-0 top-12 h-96 -z-10 opacity-50"
        />
        {/* Broadcast Desk Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 a-slide">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/12 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold">
              <Icon n="sliders" size={13} /> {t('mc.badge')}
            </div>
            <h1 className="font-bold text-white fs-h1 leading-tight">{t('mc.newRoom')}</h1>
            <p className="text-sm text-slate">Pick a game, choose Kids or Youth mode, and start your room.</p>
          </div>

          {resume.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate mr-1">{t('mc.resume')}</span>
              {resume.map((r) => (
                <Link
                  key={r.code}
                  href={`/mc/${r.code}`}
                  onClick={() => {
                    playUi('ui-focus');
                    haptic('tick');
                  }}
                  className="relative cursor-pointer press console-sheen inline-flex items-center gap-2.5 rounded-full border border-leaf/40 bg-leaf/12 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf/20 transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-leaf animate-pulse" />
                  <span className="font-bold tracking-widest text-leaf">{r.code}</span>
                  <span className="text-slate text-xs hidden sm:inline">{r.gameName}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* VS Mode / Tournament Card Deck */}
        <section aria-labelledby="mc-pick-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="mc-pick-heading" className="font-semibold text-white fs-h2">
              {t('mc.pickGame')}
            </h2>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate hidden sm:inline">
              Choose a Game
            </span>
          </div>

          <div className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible a-stagger">
            {GAME_IDS.map((id) => {
              const m = GAME_META[id];
              const vis = GAME_CARD_STYLE[id];
              const selected = game === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pickGame(id)}
                  aria-pressed={selected}
                  className={`cursor-pointer press console-sheen snap-center shrink-0 w-[230px] lg:w-auto relative overflow-hidden rounded-[26px] p-4 text-left transition-all flex flex-col justify-between min-h-[250px] border ${
                    selected
                      ? 'border-white ring-2 ring-gold/80 shadow-[0_22px_45px_-12px_rgba(0,0,0,0.85)] -translate-y-1'
                      : 'border-white/15 opacity-80 hover:opacity-100 hover:-translate-y-0.5'
                  }`}
                  style={{ background: vis.gradient }}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/18"
                  />
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-night/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                      <Icon n={vis.icon} size={11} /> {vis.badge}
                    </span>
                    {selected && (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-night shadow">
                        <Icon n="check" size={14} />
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 my-2 flex justify-center">
                    <MascotView name={m.mascot} expression={selected ? 'cheer' : 'idle'} size={94} animate={selected} decorative />
                  </div>

                  <div className="relative z-10 space-y-1">
                    <h2 className="font-bold text-white text-lg leading-tight drop-shadow-sm">{m.name}</h2>
                    <p className="text-xs text-white/90 line-clamp-2 leading-snug">{m.tagline}</p>
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-night/70 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {t('mc.minutes', { a: m.est[0], b: m.est[1] })}
                      </span>
                      <span className="rounded-full bg-night/70 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {t('mc.minPlayers', { n: m.minPlayers })}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Hardware Config Deck */}
        <div className="double-bezel">
          <section className="double-bezel-inner p-5 sm:p-7 grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/12 bg-night-3 text-gold">
                <Icon n="sliders" size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-white fs-h3">{t('mc.settings')}</h2>
                <p className="text-xs text-slate">{meta.name} — {meta.tagline}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SegGroup
                label={t('mc.audience')}
                value={cfg.audience}
                onChange={(v) => setField('audience', v)}
                options={[
                  ['kids', t('mc.kids')],
                  ['youth', t('mc.youth')],
                  ['adults', t('mc.adults')],
                ]}
              />
              <SegGroup
                label={t('mc.difficulty')}
                value={cfg.difficulty}
                onChange={(v) => setField('difficulty', v)}
                options={[
                  ['mixed', t('mc.mixed')],
                  ['easy', t('mc.easy')],
                  ['medium', t('mc.medium')],
                  ['hard', t('mc.hard')],
                ]}
              />
              <SegGroup
                label={t('mc.mode')}
                value={activeMode}
                disabled={!teamAllowed}
                onChange={(v) => setField('mode', v)}
                options={[
                  ['individual', t('mc.individual')],
                  ['team', t('mc.team')],
                ]}
              />
              <SegGroup
                label={t('mc.pace')}
                value={String(cfg.pace)}
                onChange={(v) => setField('pace', Number(v) as 0.75 | 1 | 1.5)}
                options={[
                  ['0.75', t('mc.relaxed')],
                  ['1', t('mc.normal')],
                  ['1.5', t('mc.fast')],
                ]}
              />
            </div>

            {/* Game-specific hardware racks */}
            {game === 'gideons-300' && (
              <div className="rounded-2xl border border-white/10 bg-night-3/70 p-4 grid gap-4 sm:grid-cols-3">
                <RangeTile
                  label={t('mc.keep1', { n: Math.round(cfg.keep1 * 100) })}
                  min={40}
                  max={100}
                  step={5}
                  value={Math.round(cfg.keep1 * 100)}
                  onChange={(n) => setField('keep1', n / 100)}
                />
                <RangeTile
                  label={t('mc.keep2', { n: Math.round(cfg.keep2 * 100) })}
                  min={10}
                  max={60}
                  step={5}
                  value={Math.round(cfg.keep2 * 100)}
                  onChange={(n) => setField('keep2', n / 100)}
                />
                <RangeTile
                  label={t('mc.finalists', { n: cfg.finalists })}
                  min={2}
                  max={20}
                  step={1}
                  value={cfg.finalists}
                  onChange={(n) => setField('finalists', n)}
                />
              </div>
            )}

            {game === 'spot-the-wolf' && (
              <div className="rounded-2xl border border-white/10 bg-night-3/70 p-4 flex flex-wrap items-center justify-between gap-4">
                <SegGroup
                  label={t('mc.wolves')}
                  value={cfg.wolves === null ? 'auto' : String(cfg.wolves)}
                  onChange={(v) => setField('wolves', v === 'auto' ? null : (Number(v) as 1 | 2 | 3))}
                  options={[
                    ['auto', t('mc.auto')],
                    ['1', '1'],
                    ['2', '2'],
                    ['3', '3'],
                  ]}
                />
                <label className="cursor-pointer inline-flex items-center gap-3 rounded-2xl border border-white/12 bg-night-2 px-4 py-3 text-sm font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={cfg.lookalike}
                    onChange={(e) => setField('lookalike', e.target.checked)}
                    className="h-5 w-5 accent-gold cursor-pointer"
                  />
                  <span>{t('mc.lookalike')}</span>
                </label>
              </div>
            )}
          </div>

          {/* Right Launch Cartridge */}
          <div className="rounded-3xl border border-white/12 bg-night-3/80 p-5 flex flex-col justify-between gap-5 relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
              style={{ background: GAME_CARD_STYLE[game].accent }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <div
                className="h-20 w-20 shrink-0 rounded-2xl grid place-items-center border border-white/20 shadow-lg"
                style={{ background: GAME_CARD_STYLE[game].gradient }}
              >
                <MascotView name={meta.mascot} expression="cheer" size={70} animate decorative />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-widest text-gold">Ready to Start</div>
                <h3 className="font-bold text-white text-xl leading-tight truncate">{meta.name}</h3>
                <p className="text-xs text-slate mt-1">
                  {t('mc.minutes', { a: meta.est[0], b: meta.est[1] })} · {t('mc.minPlayers', { n: meta.minPlayers })} ·{' '}
                  {t(activeMode === 'team' ? 'mc.team' : 'mc.individual')}
                </p>
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              {err && (
                <div role="alert" className="rounded-2xl border border-coral/40 bg-coral/12 px-4 py-2.5 text-sm font-semibold text-coral">
                  {err}
                </div>
              )}
              <Button type="button" variant="primary" loading={busy} onClick={create} className="w-full">
                <Icon n="play" size={18} />
                <span>{t('mc.create')}</span>
              </Button>
              <p className="text-center text-xs text-slate">{t('common.noAccount')}</p>
            </div>
          </div>
          </section>
        </div>

        {/* Past Games Hosted & Top 10 Players */}
        <section aria-labelledby="mc-history-heading" className="arcade-panel p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="mc-history-heading" className="font-semibold text-white fs-h2 flex items-center gap-2">
                <Icon n="trophy" size={18} className="text-gold" />
                <span>Past Games &amp; Top 10 Players</span>
              </h2>
              <p className="text-xs text-slate mt-0.5">
                Every finished game is saved with the Top 10 players and their final scores.
              </p>
            </div>
            <span className="rounded-full border border-white/12 bg-night-3 px-3 py-1 text-xs font-semibold text-cloud">
              {history.length} {history.length === 1 ? 'Game' : 'Games'}
            </span>
          </div>

          {history.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-night-3/50 p-6 text-center text-sm text-slate">
              No finished games recorded yet. Host and finish a game to see its Top 10 leaderboard here!
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const open = openHistoryId === item.id;
                return (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-night-3/70 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        playUi('ui-focus');
                        haptic('tick');
                        setOpenHistoryId(open ? null : item.id);
                      }}
                      className="cursor-pointer w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="rounded-lg border border-gold/35 bg-gold/12 px-2.5 py-1 font-mono text-xs font-bold text-gold">
                          {item.code}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{item.gameName}</div>
                          <div className="text-[11px] text-slate">
                            {new Date(item.endedAt).toLocaleString()} · {item.playerCount} players · {item.audience}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.top10[0] && (
                          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf">
                            <Icon n="crown" size={12} /> {item.top10[0].nickname} ({item.top10[0].score})
                          </span>
                        )}
                        <Icon n="arrowRight" size={15} className={`text-cloud/70 transition-transform ${open ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-white/8 bg-night/50 p-4">
                        {item.top10.length === 0 ? (
                          <p className="text-xs text-slate text-center py-2">No scored players recorded in this room.</p>
                        ) : (
                          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.top10.map((p, idx) => (
                              <li
                                key={p.id}
                                className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2 text-xs ${
                                  idx === 0
                                    ? 'border-gold/45 bg-gold/10'
                                    : idx < 3
                                      ? 'border-leaf/30 bg-leaf/8'
                                      : 'border-white/8 bg-night-3/70'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-6 font-bold tabular-nums ${
                                      idx === 0 ? 'text-gold' : idx === 1 ? 'text-sky' : idx === 2 ? 'text-plank' : 'text-cloud/65'
                                    }`}
                                  >
                                    #{idx + 1}
                                  </span>
                                  <Avatar avatar={p.avatar} color={p.color} size={28} />
                                  <span className="truncate font-semibold text-white">{p.nickname}</span>
                                </div>
                                <span className="shrink-0 font-bold text-gold tabular-nums">{p.score} pts</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SegGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold uppercase tracking-widest text-slate">{label}</div>
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-night-3/80 p-1.5">
        {options.map(([v, text]) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => onChange(v)}
              className={`cursor-pointer flex-1 min-h-10 rounded-xl px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                active
                  ? 'bg-gold text-night shadow-[0_4px_14px_-2px_rgba(255,208,38,0.45)]'
                  : 'text-cloud hover:bg-white/8 hover:text-white'
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RangeTile({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block space-y-2 cursor-pointer">
      <div className="text-xs font-bold text-cloud">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold cursor-pointer"
      />
    </label>
  );
}
