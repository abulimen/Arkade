'use client';

import { useEffect, useState } from 'react';
import type { GameId } from '@/shared/types';
import { useReducedMotion } from '@/client/hooks';
import { haptic, playUi } from '@/client/sound';
import { Icon } from '@/ui/icons';
import { MascotView } from '@/ui/mascots';
import { GAME_SHOWCASE } from './gameShowcaseData';

/**
 * Looping, interactive 3-scene animated explainer showing how each game works
 * visually so a 7-year-old understands it in seconds without walls of text.
 */
export function GameExplainerVideo({ gameId }: { gameId: GameId }) {
  return <GameExplainerPlayer key={gameId} gameId={gameId} />;
}

function GameExplainerPlayer({ gameId }: { gameId: GameId }) {
  const reduced = useReducedMotion();
  const spec = GAME_SHOWCASE[gameId];
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || reduced) return;
    const id = window.setInterval(() => {
      setScene((prev) => (prev + 1) % 3);
    }, 3800);
    return () => window.clearInterval(id);
  }, [playing, reduced]);

  const startOrToggle = () => {
    playUi(playing ? 'ui-focus' : 'ui-snap');
    haptic(playing ? 'tick' : 'snap');
    setPlaying((p) => !p);
  };

  return (
    <div className="double-bezel">
      <div className="double-bezel-inner overflow-hidden p-4 sm:p-5 space-y-4">
        {/* Top Video Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-abyss px-3 py-1 text-[11px] font-bold text-white">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: spec.accent,
                boxShadow: `0 0 8px ${spec.accent}`,
              }}
            />
            <span>HOW TO PLAY · STEP {scene + 1} OF 3</span>
          </div>

          <button
            type="button"
            onClick={startOrToggle}
            aria-label={playing ? 'Pause guide animation' : 'Play guide animation'}
            className="cursor-pointer press inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-night-3 px-3 py-1.5 min-h-9 text-xs font-semibold text-cloud hover:text-white"
          >
            <Icon n={playing ? 'pause' : 'play'} size={12} />
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
        </div>

        {/* Animated Stage Viewport */}
        <div
          className="relative min-h-[290px] sm:min-h-0 sm:aspect-video w-full overflow-hidden rounded-2xl border border-white/12 bg-abyss p-3 sm:p-5 flex flex-col justify-between"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 0%, ${spec.accent}26 0%, transparent 68%)`,
          }}
        >
          <div key={`${gameId}-${scene}`} className="relative z-10 flex-1 flex items-center justify-center py-1 a-fade">
            {renderScene(gameId, scene)}
          </div>

          {/* Short 1-Line Caption */}
          <div className="relative z-10 mt-3 rounded-xl border border-white/10 bg-night/90 px-3 sm:px-3.5 py-2 text-center text-xs sm:text-sm font-semibold text-white leading-snug">
            {spec.steps[scene]}
          </div>

          {/* Play Overlay Nudge (no autoplay) */}
          {!playing && (
            <button
              type="button"
              onClick={startOrToggle}
              aria-label="Watch how to play"
              className="cursor-pointer group absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-4 bg-abyss/60 backdrop-blur-[2px] transition hover:bg-abyss/50"
            >
              <span className="relative grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full border border-white/30 bg-night/90 text-white shadow-[0_18px_50px_-10px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: spec.accent }}
                />
                <Icon n="play" size={28} className="relative translate-x-0.5 text-white" />
              </span>
              <span
                className="rounded-full border border-white/20 bg-night/90 px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-lg text-center"
                style={{ boxShadow: `0 0 24px -6px ${spec.accent}` }}
              >
                Tap Play to Watch How It Works
              </span>
            </button>
          )}
        </div>

        {/* 3 Clickable Scene Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {spec.sceneLabels.map((label, idx) => {
            const active = idx === scene;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  playUi('ui-snap', (idx - 1) * 0.25);
                  haptic('tick');
                  setScene(idx);
                }}
                className={`cursor-pointer relative overflow-hidden rounded-xl border px-3 py-2.5 sm:py-2 min-h-10 text-left transition ${
                  active
                    ? 'border-white/35 bg-white/10 text-white'
                    : 'border-white/10 bg-abyss/80 text-cloud/65 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="leading-snug sm:truncate">{label}</span>
                  {active && playing && !reduced && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse"
                      style={{ backgroundColor: spec.accent }}
                    />
                  )}
                </div>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 a-grow"
                    style={{ backgroundColor: spec.accent, animationDuration: '3.8s' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderScene(gameId: GameId, scene: number) {
  switch (gameId) {
    case 'spot-the-wolf':
      return <WolfScene scene={scene} />;
    case 'fake-verse':
      return <FakeVerseScene scene={scene} />;
    case 'what-came-first':
      return <OrderScene scene={scene} />;
    case 'gideons-300':
      return <GideonsScene scene={scene} />;
    case 'who-am-i':
      return <WhoAmIScene scene={scene} />;
  }
}

/* ==================== 1. SPOT THE WOLF ==================== */
function WolfScene({ scene }: { scene: number }) {
  if (scene === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full max-w-lg items-stretch">
        {[
          { who: 'Sam', wolf: false, card: "Noah's Ark" },
          { who: 'Mia', wolf: false, card: "Noah's Ark" },
          { who: 'Leo', wolf: true, card: 'NO WORD!' },
        ].map((p, i) => (
          <div
            key={p.who}
            className={`rounded-2xl border p-2.5 sm:p-3 text-left sm:text-center flex flex-row sm:flex-col items-center justify-between gap-2.5 sm:gap-2 ${
              p.wolf
                ? 'border-coral/60 bg-coral/15 shadow-[0_0_24px_rgba(255,92,108,0.28)] a-pop'
                : 'border-leaf/40 bg-leaf/10 a-slide'
            }`}
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="flex sm:flex-col items-center gap-2 sm:gap-0.5 shrink-0">
              <span className="text-xs sm:text-[11px] font-bold text-white sm:text-cloud/85">{p.who}</span>
              <span className="text-[10px] font-semibold text-cloud/75 sm:hidden">
                {p.wolf ? '· Wolf' : '· Sheep'}
              </span>
            </div>
            <div className="rounded-xl bg-night/90 border border-white/10 px-2.5 py-2 sm:px-2 sm:py-2.5 flex-1 sm:w-full text-center">
              <div className={`text-[10px] font-bold uppercase ${p.wolf ? 'text-coral' : 'text-leaf'}`}>
                {p.wolf ? 'YOU ARE WOLF' : 'SECRET WORD'}
              </div>
              <div className="text-xs sm:text-sm font-bold text-white mt-0.5">{p.card}</div>
            </div>
            <span className="hidden sm:inline text-[10px] font-semibold text-cloud/75">
              {p.wolf ? 'Listen & play along!' : 'Sheep'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (scene === 1) {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-lg">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full">
          {[
            { name: 'Sam', clue: '"Big Boat!"', delay: '0ms', wolf: false },
            { name: 'Mia', clue: '"Animals!"', delay: '200ms', wolf: false },
            { name: 'Leo (Wolf)', clue: '"Umm... Rain?"', delay: '420ms', wolf: true },
          ].map((c) => (
            <div
              key={c.name}
              className="flex flex-row-reverse sm:flex-col items-center justify-between gap-2 a-pop"
              style={{ animationDelay: c.delay }}
            >
              <div
                className={`rounded-2xl border px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold shadow-lg text-center ${
                  c.wolf
                    ? 'border-coral/60 bg-coral/20 text-white'
                    : 'border-gold/50 bg-gold/15 text-gold'
                }`}
              >
                {c.clue}
              </div>
              <div className="rounded-full border border-white/15 bg-night-2 px-3 py-1 text-xs font-bold text-white shrink-0">
                {c.name}
              </div>
            </div>
          ))}
        </div>
        <span className="rounded-full border border-white/15 bg-night-2 px-3 py-1 text-[11px] font-semibold text-gold text-center">
          Leo has NO word, so he listens to clues and guesses!
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md a-pop">
      <div className="rounded-2xl border border-coral/60 bg-coral/15 p-3 text-center flex flex-col items-center justify-center gap-1">
        <MascotView name="wilf" expression="oops" size={62} animate />
        <div className="text-xs font-bold text-coral">1. VOTE FOR THE WOLF</div>
        <div className="text-sm font-bold text-white">Leo Caught! (+100 pts)</div>
      </div>
      <div className="rounded-2xl border border-gold/50 bg-gold/15 p-3 text-center flex flex-col items-center justify-center gap-1.5">
        <div className="text-xs font-bold text-gold">2. WOLF&apos;S 1 LAST GUESS</div>
        <div className="rounded-xl bg-night px-3 py-1.5 text-xs font-bold text-white border border-white/15">
          Leo types: &ldquo;Noah&apos;s Ark&rdquo;
        </div>
        <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-extrabold text-night">
          Right Guess = Wolf Gets +100!
        </span>
      </div>
    </div>
  );
}

/* ==================== 2. FAKE VERSE ==================== */
function FakeVerseScene({ scene }: { scene: number }) {
  if (scene === 0) {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-md a-pop">
        <div className="w-full rounded-2xl border border-sky/40 bg-night-2 p-3 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky">Numbers 22:28</div>
          <p className="text-sm sm:text-base font-bold text-white mt-1">
            Then the LORD opened the mouth of Balaam&apos;s{' '}
            <span className="inline-block rounded-lg border border-gold bg-gold/20 px-2.5 py-0.5 text-gold">
              ______
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-leaf/50 bg-leaf/12 px-4 py-2.5 flex items-center gap-3 w-full max-w-xs a-slide">
          <Icon n="phone" size={18} className="text-leaf shrink-0" />
          <div className="text-xs">
            <div className="text-leaf font-bold">You type a trick answer:</div>
            <div className="text-white font-bold text-sm mt-0.5">&ldquo;pet camel&rdquo;</div>
          </div>
        </div>
      </div>
    );
  }

  if (scene === 1) {
    return (
      <div className="space-y-2 w-full max-w-sm">
        <div className="text-center text-xs font-bold text-gold mb-1.5">Tap which one is REALLY in the Bible:</div>
        {['A. pet camel', 'B. donkey', 'C. talking lion'].map((opt, idx) => (
          <div
            key={opt}
            className="rounded-xl border border-white/15 bg-night-2 px-4 py-2 text-sm font-bold text-white flex items-center justify-between a-slide"
            style={{ animationDelay: `${idx * 120}ms` }}
          >
            <span>{opt}</span>
            <span className="h-3 w-3 rounded-full border border-white/30" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md a-pop">
      <div className="rounded-2xl border border-leaf bg-leaf/18 p-3.5 space-y-1 text-center">
        <div className="text-xs font-bold text-leaf">REAL BIBLE ANSWER!</div>
        <div className="text-base font-bold text-white">B. donkey</div>
        <div className="inline-block rounded-full bg-leaf px-2.5 py-0.5 text-[11px] font-extrabold text-night">
          +500 pts
        </div>
      </div>
      <div className="rounded-2xl border border-gold bg-gold/18 p-3.5 space-y-1 text-center">
        <div className="text-xs font-bold text-gold">YOUR TRICK FOOLED 4 FRIENDS!</div>
        <div className="text-base font-bold text-white">&ldquo;pet camel&rdquo;</div>
        <div className="inline-block rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-extrabold text-night">
          +1,000 pts (+250 each!)
        </div>
      </div>
    </div>
  );
}

/* ==================== 3. WHAT CAME FIRST? (5 STORIES, UP TO 1,000 PTS) ==================== */
function OrderScene({ scene }: { scene: number }) {
  const fiveStories = [
    { order: 1, title: 'Creation' },
    { order: 2, title: "Noah's Ark" },
    { order: 3, title: 'Red Sea Splits' },
    { order: 4, title: 'David & Goliath' },
    { order: 5, title: 'Jesus Is Born' },
  ];

  if (scene === 0) {
    const mixed = [fiveStories[4], fiveStories[0], fiveStories[3], fiveStories[1], fiveStories[2]];
    return (
      <div className="flex flex-wrap justify-center gap-2 w-full max-w-lg">
        {mixed.map((c, idx) => (
          <div
            key={c.title}
            className="rounded-2xl border border-sky/40 bg-sky/12 px-3.5 py-2.5 text-center font-bold text-xs sm:text-sm text-white a-pop"
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            {c.title}
          </div>
        ))}
      </div>
    );
  }

  if (scene === 1) {
    return (
      <div className="flex flex-wrap justify-center gap-2 w-full max-w-lg">
        {fiveStories.map((c, idx) => (
          <div
            key={c.title}
            className="rounded-2xl border border-gold/60 bg-gold/15 px-3 py-2 flex items-center gap-2 a-pop"
            style={{ animationDelay: `${idx * 85}ms` }}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-night text-xs font-extrabold">
              {c.order}
            </span>
            <span className="font-bold text-xs sm:text-sm text-white">{c.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-lg a-pop">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-1.5 w-full">
        {fiveStories.map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-leaf/60 bg-leaf/15 p-2 flex sm:flex-col items-center sm:justify-center gap-2 sm:gap-1 text-left sm:text-center last:col-span-2 sm:last:col-span-1 last:justify-center"
          >
            <span className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full bg-leaf text-night text-xs font-extrabold">
              {c.order}
            </span>
            <div className="text-xs sm:text-[11px] font-bold text-white leading-tight">{c.title}</div>
          </div>
        ))}
      </div>
      <span className="rounded-full bg-leaf px-3.5 py-1 text-xs font-extrabold text-night shadow text-center">
        All 5 in Order = 800 pts + up to 200 Speed Bonus!
      </span>
    </div>
  );
}

/* ==================== 4. GIDEON'S 300 ==================== */
function GideonsScene({ scene }: { scene: number }) {
  if (scene === 0) {
    return (
      <div className="flex flex-col items-center gap-2.5 w-full max-w-md a-pop">
        <div className="w-full rounded-2xl border border-gold/45 bg-night-2 p-3 text-center">
          <div className="text-[11px] font-bold text-gold">2 SURVIVAL ROUNDS · STAY IN!</div>
          <div className="text-sm font-bold text-white mt-0.5">Who defeated Goliath with a sling?</div>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="rounded-xl border border-leaf bg-leaf/20 px-3 py-2 text-xs font-bold text-white text-center">
            ✓ David (+100)
          </div>
          <div className="rounded-xl border border-white/12 bg-night-3 px-3 py-2 text-xs font-semibold text-cloud/65 text-center">
            King Saul
          </div>
        </div>
      </div>
    );
  }

  if (scene === 1) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md a-pop">
        <div className="rounded-2xl border border-leaf/45 bg-leaf/12 p-3 text-center space-y-1">
          <div className="text-[11px] font-bold text-leaf">TOP PLAYERS</div>
          <div className="text-sm font-bold text-white">Race in the Final Round</div>
          <p className="text-[11px] text-cloud/85">First to 5 points wins the crown!</p>
        </div>
        <div className="rounded-2xl border border-sky/45 bg-sky/12 p-3 text-center space-y-1">
          <div className="text-[11px] font-bold text-sky">WATCHMAN SQUAD</div>
          <div className="text-sm font-bold text-white">Out? Pick Who Wins!</div>
          <p className="text-[11px] text-cloud/85">Tap who wins the next point for +50 pts!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md items-center a-pop">
      <div className="rounded-2xl border border-gold bg-gold/20 p-3 text-center space-y-1">
        <MascotView name="jari" expression="cheer" size={62} animate />
        <div className="text-xs font-bold text-gold">FIRST RIGHT TAP WINS!</div>
        <div className="text-xs font-bold text-white">+100 pts (Champion +500!)</div>
      </div>
      <div className="rounded-2xl border border-coral/50 bg-coral/15 p-3 text-center space-y-1">
        <div className="text-xs font-bold text-coral">CAREFUL ON THE BUZZER!</div>
        <div className="text-sm font-bold text-white">Wrong Tap = Frozen ❄️</div>
        <p className="text-[11px] text-cloud/85">Frozen until the next question!</p>
      </div>
    </div>
  );
}

/* ==================== 5. WHO AM I? (500 -> 100 PTS, -50 WRONG) ==================== */
function WhoAmIScene({ scene }: { scene: number }) {
  if (scene === 0) {
    return (
      <div className="flex items-center gap-3 sm:gap-4 w-full max-w-md justify-center a-pop">
        <div className="h-20 w-16 sm:h-24 sm:w-20 shrink-0 rounded-2xl border border-violet/60 bg-violet/20 grid place-items-center text-3xl font-extrabold text-white">
          ?
        </div>
        <div className="rounded-2xl border border-white/15 bg-night-2 p-3 sm:p-3.5 space-y-1.5 flex-1 min-w-0">
          <span className="inline-block rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-extrabold text-night">
            500 PTS
          </span>
          <div className="text-xs font-bold text-violet">CLUE 1 OF 5</div>
          <div className="text-sm font-bold text-white">&ldquo;I took care of sheep.&rdquo;</div>
        </div>
      </div>
    );
  }

  if (scene === 1) {
    return (
      <div className="space-y-2 w-full max-w-md">
        {[
          { n: 2, pts: 400, text: '"I played the harp for a king."' },
          { n: 3, pts: 300, text: '"I beat giant Goliath with a sling!"' },
        ].map((c, idx) => (
          <div
            key={c.n}
            className="rounded-xl border border-white/15 bg-night-2 px-3.5 py-2 flex items-center justify-between gap-2 a-slide"
            style={{ animationDelay: `${idx * 140}ms` }}
          >
            <div className="text-xs sm:text-sm font-bold text-white">
              <span className="text-violet mr-1.5">Clue {c.n}:</span>
              {c.text}
            </div>
            <span className="shrink-0 rounded-full bg-gold/20 border border-gold/40 px-2 py-0.5 text-[10px] font-bold text-gold">
              {c.pts} pts
            </span>
          </div>
        ))}
        <div className="text-center text-[11px] font-semibold text-cloud/75">
          (Clue 4 = 200 pts · Clue 5 = 100 pts)
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2.5 w-full max-w-md a-pop">
      <div className="grid grid-cols-2 gap-2 w-full">
        {[
          { name: 'Moses', right: false },
          { name: 'David ✓ (+500 pts)', right: true },
          { name: 'Noah', right: false },
          { name: 'Daniel', right: false },
        ].map((b) => (
          <div
            key={b.name}
            className={`rounded-xl border px-3 py-2 text-xs sm:text-sm font-bold text-center ${
              b.right
                ? 'border-leaf bg-leaf text-night shadow-lg'
                : 'border-white/15 bg-night-2 text-white'
            }`}
          >
            {b.name}
          </div>
        ))}
      </div>
      <span className="rounded-full border border-coral/40 bg-coral/12 px-3 py-0.5 text-[11px] font-semibold text-coral">
        1 try per round · Wrong tap costs 50 pts!
      </span>
    </div>
  );
}
