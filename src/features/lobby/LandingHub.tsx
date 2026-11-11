'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GAME_IDS, GAME_META, type GameId } from '@/shared/types';
import { Icon } from '@/ui/icons';
import { MascotView } from '@/ui/mascots';
import { PwaDualCards } from '@/ui/pwa';
import { AppShell } from '@/ui/shell';
import { JoinForm } from './Join';

const GAME_HOW_TO: Record<
  GameId,
  {
    accent: string;
    badge: string;
    pitch: string;
    steps: [string, string, string];
  }
> = {
  'spot-the-wolf': {
    accent: '#FF5C6C',
    badge: 'Social Deduction · Stage Round',
    pitch: 'Everyone gets the same secret Bible prompt except the Wolf in Sheep’s Clothing, who receives a close decoy.',
    steps: [
      'Hold your phone card to peek at your secret role and word.',
      'Give a one-clue Bible connection out loud without giving away the exact word.',
      'Vote to expose the Wolf before they blend into the flock!',
    ],
  },
  'fake-verse': {
    accent: '#FFC83D',
    badge: 'Bluffing & Wit · All Phones',
    pitch: 'Write a convincing missing phrase from a real Scripture verse, then spot the genuine verse among everyone’s fakes.',
    steps: [
      'Read the verse setup on the projector and type a believable fill-in on your phone.',
      'All fake answers mix with the real Scripture line on the big screen.',
      'Earn Olive Leaves for finding the truth AND for fooling your friends!',
    ],
  },
  'gideons-300': {
    accent: '#FF9A3D',
    badge: 'Last-Standing Survival · Fast Trivia',
    pitch: 'Everyone starts in Gideon’s camp of 300. Each wrong trivia answer knocks tents out until only the faithful remnant stands.',
    steps: [
      'Lock in your answer before the torch timer burns down.',
      'Wrong answers send tents flying off the projector stage in real time.',
      'Eliminated players keep playing in the Shadow Camp for bonus points!',
    ],
  },
  'what-came-first': {
    accent: '#3DB8FF',
    badge: 'Chronology Showdown · 4 Events',
    pitch: 'Tap four Biblical events in the exact order they happened in Scripture, from Genesis to the Early Church.',
    steps: [
      'Study four major Bible moments scrambled on your controller.',
      'Tap them 1-2-3-4 in chronological order before the clock runs out.',
      'Watch the scroll timeline unroll on the projector to reveal the dates!',
    ],
  },
  'who-am-i': {
    accent: '#B15CFF',
    badge: '4-Clue Mystery · Speed Bonus',
    pitch: 'Four progressive clues reveal a Bible character from obscure detail to dead giveaway. Buzz in early for maximum points!',
    steps: [
      'Clue 1 worth 400 pts appears first, followed by Clues 2, 3, and 4.',
      'Lock in your guess as soon as you know who the character is.',
      'Careful: you only get one lock-in per mystery character!',
    ],
  },
};

interface SavedSession {
  code: string;
  role: 'player' | 'mc';
  gameName: string;
}

export function LandingHub() {
  const [selectedGame, setSelectedGame] = useState<GameId>('spot-the-wolf');
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const found: { code: string; role: 'player' | 'mc' }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('arkade:host:')) {
        const code = k.slice('arkade:host:'.length);
        if (code.length === 4) found.push({ code, role: 'mc' });
      } else if (k.startsWith('arkade:player:')) {
        const code = k.slice('arkade:player:'.length);
        if (code.length === 4) found.push({ code, role: 'player' });
      }
    }
    if (!found.length) return;
    let live = true;
    Promise.all(
      found.slice(0, 4).map(async (item) => {
        try {
          const r = await fetch(`/api/rooms/${item.code}`, { cache: 'no-store' });
          if (!r.ok) return null;
          const j = await r.json();
          return { code: item.code, role: item.role, gameName: j.gameName as string };
        } catch {
          return null;
        }
      })
    ).then((res) => {
      if (!live) return;
      setSessions(res.filter((x): x is SavedSession => x !== null));
    });
    return () => {
      live = false;
    };
  }, []);

  const activeMeta = GAME_META[selectedGame];
  const activeDetails = GAME_HOW_TO[selectedGame];

  return (
    <AppShell active="home">
      <div className="flex flex-col gap-12 pb-8">
        {/* Active Room Rejoin Bar */}
        {sessions.length > 0 && (
          <section aria-label="Active game sessions" className="arcade-card p-4 border-gold/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-leaf animate-pulse" />
                <span className="font-semibold text-sm text-white">Live Room Detected on Your Device:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {sessions.map((s) => (
                  <Link
                    key={`${s.role}-${s.code}`}
                    href={s.role === 'mc' ? `/mc/${s.code}` : `/play/${s.code}`}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-gold px-3.5 py-2 text-xs font-semibold text-night shadow-[0_3px_0_#9A6B00]"
                  >
                    <Icon n={s.role === 'mc' ? 'sparkle' : 'play'} size={14} />
                    <span>
                      {s.role === 'mc' ? 'Resume Host MC' : 'Rejoin Room'} · {s.code} ({s.gameName})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Hero Stage: Split Showtime Header + Instant Join Card */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          <div className="lg:col-span-7 flex flex-col items-start gap-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold">
              <Icon n="sparkle" size={15} />
              <span>Real-Time Bible Party Game Show</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.06]">
              Turn Any Projector &amp; Every Phone Into a{' '}
              <span className="text-gold">Live Bible Game Night.</span>
            </h1>

            <p className="fs-body text-cloud/85 max-w-xl leading-relaxed">
              Five original multiplayer party games built for church youth nights, small groups, families, and fellowships. Zero accounts, zero app-store friction: scan or enter a 4-letter code and play together in seconds.
            </p>

            {/* Primary CTA Trio */}
            <div className="flex flex-wrap items-center gap-3 pt-1 w-full sm:w-auto">
              <Link
                href="/mc"
                className="cursor-pointer press chunky inline-flex flex-1 sm:flex-initial items-center justify-center gap-2.5 rounded-2xl border-[3px] border-night bg-coral px-6 min-h-14 font-semibold fs-body text-night"
              >
                <Icon n="sparkle" size={20} />
                <span>Host a Game (/mc)</span>
              </Link>
              <Link
                href="/screen"
                className="cursor-pointer press chunky inline-flex flex-1 sm:flex-initial items-center justify-center gap-2.5 rounded-2xl border-[3px] border-night bg-indigo px-5 min-h-14 font-semibold fs-body text-white"
              >
                <Icon n="tv" size={20} />
                <span>Open Projector Stage</span>
              </Link>
            </div>

            {/* Cast of Mascots Medallion Strip */}
            <div className="arcade-panel p-4 w-full mt-2">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                  Meet the Arkade Crew · 5 Games Included
                </span>
                <a href="#games" className="cursor-pointer text-xs font-semibold text-sky hover:underline">
                  Explore Rules →
                </a>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {GAME_IDS.map((id) => {
                  const g = GAME_META[id];
                  const isSel = id === selectedGame;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedGame(id)}
                      className={`cursor-pointer flex flex-col items-center gap-1.5 rounded-2xl p-2 transition border ${
                        isSel
                          ? 'bg-gold/20 border-gold text-white'
                          : 'bg-night/60 border-white/10 text-cloud/75 hover:bg-white/10'
                      }`}
                    >
                      <MascotView name={g.mascot} expression={isSel ? 'cheer' : 'happy'} size={54} />
                      <span className="text-[11px] font-semibold text-center leading-tight line-clamp-1">
                        {g.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Instant Quick-Join Controller */}
          <div className="lg:col-span-5 w-full">
            <div className="relative">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold">
                  <Icon n="phone" size={18} />
                  <span>Got a 4-Letter Room Code? Join Live</span>
                </span>
                <Link href="/join" className="cursor-pointer text-xs font-semibold text-cloud/70 hover:text-white">
                  Full Screen →
                </Link>
              </div>
              <JoinForm embedded />
            </div>
          </div>
        </section>

        {/* Interactive 5-Game Showcase */}
        <section id="games" className="scroll-mt-20 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gold">
                5 Built-In Party Modes
              </div>
              <h2 className="fs-h1 text-white mt-1">Choose Tonight&apos;s Showdown</h2>
            </div>
            <p className="text-sm text-cloud/75 max-w-md">
              Tap any game below to preview how it works, or launch it directly in the Host MC Console.
            </p>
          </div>

          {/* Game Selector Tabs + Spotlight Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              {GAME_IDS.map((id) => {
                const g = GAME_META[id];
                const active = id === selectedGame;
                const details = GAME_HOW_TO[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedGame(id)}
                    className={`cursor-pointer text-left rounded-2xl p-4 transition flex items-center gap-4 border-2 ${
                      active
                        ? 'bg-night-3 border-gold shadow-[0_5px_0_#0B0A1A]'
                        : 'bg-night-2/75 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <MascotView name={g.mascot} expression={active ? 'cheer' : 'happy'} size={64} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-lg text-white truncate">{g.name}</h3>
                        <span className="shrink-0 rounded-full bg-night px-2.5 py-0.5 text-xs font-semibold text-gold">
                          {g.est[0]}–{g.est[1]}m
                        </span>
                      </div>
                      <p className="text-xs text-cloud/80 line-clamp-1 mt-0.5">{g.tagline}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-cloud/65">
                        <span>{g.minPlayers}+ players</span>
                        <span>·</span>
                        <span>{details.badge}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Game Spotlight Stage */}
            <div className="lg:col-span-7 arcade-card p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-4">
                    <MascotView name={activeMeta.mascot} expression="cheer" size={96} />
                    <div>
                      <span
                        className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-night"
                        style={{ backgroundColor: activeDetails.accent }}
                      >
                        {activeDetails.badge}
                      </span>
                      <h3 className="fs-h1 text-white mt-2">{activeMeta.name}</h3>
                      <p className="text-sm text-cloud/80">{activeMeta.tagline}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="arcade-panel px-3.5 py-2 text-center">
                      <div className="text-[11px] uppercase tracking-wider text-cloud/65">Players</div>
                      <div className="font-semibold text-base text-gold">{activeMeta.minPlayers}+</div>
                    </div>
                    <div className="arcade-panel px-3.5 py-2 text-center">
                      <div className="text-[11px] uppercase tracking-wider text-cloud/65">Length</div>
                      <div className="font-semibold text-base text-sky">
                        {activeMeta.est[0]}–{activeMeta.est[1]}m
                      </div>
                    </div>
                  </div>
                </div>

                <p className="fs-body text-cloud/90 leading-relaxed">{activeDetails.pitch}</p>

                <div className="space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gold">
                    How a Round Plays Out
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activeDetails.steps.map((step, idx) => (
                      <div key={idx} className="arcade-panel p-4 flex flex-col gap-2">
                        <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-gold text-xs font-semibold text-night">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-cloud/85 leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                <div className="text-xs text-cloud/70">
                  Supports: <strong className="text-white uppercase">{activeMeta.modes.join(' & ')}</strong> mode
                </div>
                <Link
                  href={`/mc?game=${selectedGame}`}
                  className="cursor-pointer press chunky inline-flex items-center gap-2 rounded-2xl border-[3px] border-night bg-gold px-5 py-3 font-semibold text-sm text-night"
                >
                  <Icon n="play" size={18} />
                  <span>Host {activeMeta.name} Now</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How Game Night Works: 3 Surfaces */}
        <section className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky">
              3 Connected Surfaces · Zero Lag
            </div>
            <h2 className="fs-h1 text-white mt-1">Built for Real Rooms &amp; Real Crowds</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="arcade-card p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/20 text-gold border border-gold/40">
                  <Icon n="phone" size={24} />
                </div>
                <h3 className="fs-h2 text-white">1. Every Player&apos;s Phone</h3>
                <p className="text-sm text-cloud/80 leading-relaxed">
                  Players scan the QR code or enter the 4-letter room code at <code className="text-gold">/join</code>. Their phone becomes a tactile game-show buzzer, secret role card, or bluff writer.
                </p>
              </div>
              <Link href="/join" className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline">
                <span>Open Player Join Screen</span>
                <Icon n="arrowRight" size={16} />
              </Link>
            </div>

            <div className="arcade-card p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-coral/20 text-coral border border-coral/40">
                  <Icon n="sparkle" size={24} />
                </div>
                <h3 className="fs-h2 text-white">2. The Host MC Console</h3>
                <p className="text-sm text-cloud/80 leading-relaxed">
                  One host opens <code className="text-coral">/mc</code> on their phone, tablet, or laptop to create the room, see secret answers, pause timers, cast lots, and trigger synthesized sound cues.
                </p>
              </div>
              <Link href="/mc" className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-coral hover:underline">
                <span>Launch Host MC Console</span>
                <Icon n="arrowRight" size={16} />
              </Link>
            </div>

            <div className="arcade-card p-6 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky/20 text-sky border border-sky/40">
                  <Icon n="tv" size={24} />
                </div>
                <h3 className="fs-h2 text-white">3. The Projector Stage</h3>
                <p className="text-sm text-cloud/80 leading-relaxed">
                  Plug a laptop or TV into the sanctuary or living-room screen at <code className="text-sky">/screen</code>. Automatically scales to 1080p widescreen or reflows cleanly on mobile &amp; tablets.
                </p>
              </div>
              <Link href="/screen" className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-sky hover:underline">
                <span>Open Projector Launcher</span>
                <Icon n="arrowRight" size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Dual PWA Download Section */}
        <section className="space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-leaf">
              Installable Native-Feel Web Apps
            </div>
            <h2 className="fs-h1 text-white mt-1">Download Arkade to Your Home Screen</h2>
          </div>
          <PwaDualCards />
        </section>
      </div>
    </AppShell>
  );
}
