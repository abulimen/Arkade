'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { RankEntry, View } from '@/shared/types';
import { useReducedMotion } from '@/client/hooks';
import { play, playDrumroll, playRiser } from '@/client/sound';
import { Avatar } from '@/ui/avatars';
import { Icon, OliveLeaf } from '@/ui/icons';
import { Confetti, Waves, Wordmark } from '@/ui/kit';

/**
 * Final results show for the TV: a slow, staged game-show reveal.
 * intro (lights down, heartbeat) -> 3rd -> 2nd -> long final drumroll -> silence -> champion -> everyone else.
 */
type Step = 'intro' | 'build3' | 'show3' | 'build2' | 'show2' | 'build1' | 'hush' | 'champ' | 'rest';

const ORDER: Step[] = ['intro', 'build3', 'show3', 'build2', 'show2', 'build1', 'hush', 'champ', 'rest'];
const DUR: Record<Step, number> = {
  intro: 4600,
  build3: 3600,
  show3: 3800,
  build2: 4200,
  show2: 4000,
  build1: 7600,
  hush: 1700,
  champ: 6500,
  rest: 0,
};
const rank = (s: Step) => ORDER.indexOf(s);

function planFor(count: number): Step[] {
  const steps: Step[] = ['intro'];
  if (count >= 3) steps.push('build3', 'show3');
  if (count >= 2) steps.push('build2', 'show2');
  if (count >= 1) steps.push('build1', 'hush', 'champ');
  steps.push('rest');
  return steps;
}

/** Podium column x-positions (columns are laid out #2, #1, #3). */
const SPOT_X: Record<1 | 2 | 3, string> = { 1: '50%', 2: '24%', 3: '76%' };

export function ResultsShow({
  view,
  gameName,
  mobile,
  preview,
}: {
  view: View;
  gameName: string;
  mobile: boolean;
  preview: boolean;
}) {
  const reduced = useReducedMotion();
  const instant = preview || reduced;
  const podium = (view.podium ?? []).slice(0, 3);
  const others = (view.standings ?? []).slice(3, 10);
  const candidates = (view.standings?.length ? view.standings : podium).slice(0, 6);
  const steps = planFor(podium.length);
  const last = steps.length - 1;

  const [idx, setIdx] = useState(instant ? last : 0);
  const [spin, setSpin] = useState(0);
  const step = steps[Math.min(idx, last)];
  const at = (s: Step) => rank(step) >= rank(s);

  // Master timeline
  useEffect(() => {
    if (instant) {
      const id = window.setTimeout(() => setIdx(last), 0);
      return () => window.clearTimeout(id);
    }
    const timers: number[] = [];
    let t = 0;
    for (let k = 1; k < steps.length; k++) {
      t += DUR[steps[k - 1]];
      const kk = k;
      timers.push(window.setTimeout(() => setIdx(kk), t));
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instant, last]);

  // Faces cycling (blurred) in the #1 slot during the final drumroll, slowing down.
  useEffect(() => {
    if (step !== 'build1' || candidates.length < 2) return;
    const start = performance.now();
    let id = 0;
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / DUR.build1);
      setSpin((s) => s + 1);
      id = window.setTimeout(tick, 70 + p * p * 560);
    };
    id = window.setTimeout(tick, 70);
    return () => window.clearTimeout(id);
  }, [step, candidates.length]);

  // Staged audio for each beat of the show
  useEffect(() => {
    if (preview) return;
    if (instant) {
      if (step === 'rest') play('fanfare');
      return;
    }
    const timers: number[] = [];
    const stops: (() => void)[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    switch (step) {
      case 'intro':
        play('whoosh');
        [700, 1750, 2800, 3800].forEach((ms) => later(ms, () => play('heartbeat')));
        break;
      case 'build3':
      case 'build2':
        stops.push(playDrumroll(DUR[step] / 1000 - 0.25));
        break;
      case 'show3':
      case 'show2':
        play('hit');
        later(320, () => play('sparkle'));
        break;
      case 'build1': {
        stops.push(playDrumroll(DUR.build1 / 1000), playRiser(DUR.build1 / 1000));
        let ms = 400;
        let gap = 1000;
        while (ms < DUR.build1 - 300) {
          later(ms, () => play('heartbeat'));
          ms += gap;
          gap = Math.max(380, gap * 0.82);
        }
        break;
      }
      case 'hush':
        break; // dead silence on purpose
      case 'champ':
        play('hit');
        later(200, () => play('fanfare'));
        later(1100, () => play('sparkle'));
        later(2300, () => play('chime'));
        break;
      case 'rest':
        play('whoosh');
        others.forEach((_, i) => later(500 + i * 380, () => play('tick')));
        break;
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      stops.forEach((stop) => stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, instant, preview]);

  const focus: 1 | 2 | 3 | null =
    step === 'build3' || step === 'show3' ? 3
    : step === 'build2' || step === 'show2' ? 2
    : step === 'build1' || step === 'hush' ? 1
    : null;

  const shown = (p: 1 | 2 | 3) => (p === 3 ? at('show3') : p === 2 ? at('show2') : at('champ'));
  const darkness =
    step === 'intro' ? 0.72
    : step === 'build3' || step === 'build2' ? 0.58
    : step === 'show3' || step === 'show2' ? 0.32
    : step === 'build1' ? 0.8
    : step === 'hush' ? 0.9
    : 0;
  const spotOn = step !== 'champ' && step !== 'rest';
  const wide = !mobile && at('champ') && others.length > 0;
  const champ = podium[0];

  const headline = (() => {
    switch (step) {
      case 'intro': return { label: '', text: 'The final scores are in', dots: true };
      case 'build3': return { label: '', text: 'In third place', dots: true };
      case 'show3': return { label: 'Third place', text: podium[2]?.nickname ?? '', dots: false };
      case 'build2': return { label: '', text: 'In second place', dots: true };
      case 'show2': return { label: 'Second place', text: podium[1]?.nickname ?? '', dots: false };
      case 'build1':
      case 'hush': return { label: gameName, text: 'And the winner is', dots: true };
      case 'champ': return null;
      case 'rest': return { label: 'Final standings', text: `${gameName} Champions`, dots: false };
    }
  })();

  return (
    <div className={`h-full w-full relative overflow-hidden ${step === 'champ' ? 'rv-shake' : ''}`}>
      <Confetti active={!preview && at('champ')} />
      <Waves className="opacity-50" />

      {/* Lights down */}
      <div aria-hidden="true" className="rv-dim pointer-events-none absolute inset-0 z-[5] bg-black" style={{ opacity: darkness }} />

      {/* Spotlight beam */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 bottom-0 z-[6] -translate-x-1/2 ${step === 'build1' ? 'rv-sweep' : 'rv-spot'}`}
        style={{
          left: focus ? SPOT_X[focus] : '50%',
          width: mobile ? '62%' : step === 'hush' ? '24%' : '34%',
          opacity: spotOn ? (step === 'intro' ? 0.45 : 1) : 0,
          background: 'linear-gradient(to bottom, rgba(255,244,214,0.42), rgba(255,236,190,0.12) 68%, rgba(255,236,190,0.0))',
          clipPath: 'polygon(43% 0, 57% 0, 100% 100%, 0 100%)',
          mixBlendMode: 'screen',
          ['--rv-sweep' as string]: `${DUR.build1}ms`,
        } as CSSProperties}
      />

      {/* Show content */}
      <div className={`relative z-10 h-full w-full flex flex-col justify-between ${mobile ? 'p-5 overflow-y-auto' : 'p-12'}`}>
        <div className="flex items-center justify-between gap-4">
          <Wordmark size={mobile ? 28 : 46} />
          <div
            className="inline-flex items-center gap-3 rounded-full border border-gold/45 bg-gold/15 px-5 py-2 font-bold uppercase tracking-widest text-gold"
            style={{ fontSize: mobile ? 12 : 22 }}
          >
            <Icon n="trophy" size={mobile ? 16 : 26} />
            <span>{at('rest') ? 'Final Standings' : 'Results'}</span>
          </div>
        </div>

        <div className={`my-auto flex ${wide ? 'flex-row items-end justify-center gap-14' : 'flex-col items-center gap-6'} py-4`}>
          <div className="flex flex-col items-center gap-6 min-w-0">
            <div className="text-center min-h-[1em]" style={{ minHeight: mobile ? 76 : 132 }}>
              {headline && (
                <div key={`${step}-${headline.text}`} className="space-y-1.5">
                  {headline.label && (
                    <div className="rv-text font-bold uppercase tracking-[0.3em] text-gold" style={{ fontSize: mobile ? 13 : 24 }}>
                      {headline.label}
                    </div>
                  )}
                  <h1
                    className="rv-text font-bold text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.8)]"
                    style={{ fontSize: mobile ? 30 : step.startsWith('show') ? 76 : 62, animationDelay: headline.label ? '180ms' : undefined }}
                  >
                    {headline.text}
                    {headline.dots && (
                      <span aria-hidden="true" className="inline-flex">
                        <span className="rv-dot">.</span><span className="rv-dot">.</span><span className="rv-dot">.</span>
                      </span>
                    )}
                  </h1>
                  {step === 'intro' && (
                    <p className="rv-text text-slate" style={{ fontSize: mobile ? 14 : 24, animationDelay: '600ms' }}>
                      Room {view.room} · {view.count.total} players
                    </p>
                  )}
                </div>
              )}
            </div>

            <RevealPodium
              entries={podium}
              big={!mobile}
              shown={shown}
              focus={focus}
              holding={step === 'build1' || step === 'hush'}
              spinEntry={step === 'build1' && candidates.length ? candidates[spin % candidates.length] : null}
              animate={!instant}
            />
          </div>

          {at('rest') && others.length > 0 && (
            <div className={`${wide ? 'w-[560px]' : 'w-full max-w-md'} arcade-panel p-4 sm:p-6 space-y-3 a-fade`}>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-base font-bold uppercase tracking-widest text-gold">
                  Places 4 – {3 + others.length}
                </span>
                <span className="text-xs sm:text-base text-slate font-semibold">Top 10</span>
              </div>
              <ol className="flex flex-col gap-2.5">
                {others.map((entry, i) => (
                  <li
                    key={entry.id}
                    className={`${instant ? '' : 'rv-row'} flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-3/80 px-3.5 py-2.5`}
                    style={instant ? undefined : { animationDelay: `${500 + i * 380}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 text-sm sm:text-xl font-bold tabular-nums text-cloud/70">#{i + 4}</span>
                      <Avatar avatar={entry.avatar} color={entry.color} size={mobile ? 32 : 44} />
                      <span className="truncate font-semibold text-white text-sm sm:text-xl">{entry.nickname}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-night px-3 py-1 text-xs sm:text-lg font-semibold text-gold tabular-nums">
                      <OliveLeaf size={mobile ? 14 : 20} />
                      {entry.score}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-slate transition-opacity duration-700" style={{ fontSize: mobile ? 13 : 20, opacity: at('rest') ? 1 : 0 }}>
          <span>Thanks for playing Arkade!</span>
          <span>Ask your MC for the next game</span>
        </div>
      </div>

      {/* Reveal flashes */}
      {(step === 'show3' || step === 'show2') && (
        <div key={step} aria-hidden="true" className="rv-flash pointer-events-none absolute inset-0 z-40 bg-white/55" />
      )}

      {/* Champion takeover */}
      {step === 'champ' && champ && (
        <div className="absolute inset-0 z-30 grid place-items-center overflow-hidden bg-night/80 backdrop-blur-md">
          <div key="flash" aria-hidden="true" className="rv-flash pointer-events-none absolute inset-0 z-40 bg-white" />
          <div
            aria-hidden="true"
            className="rv-rays pointer-events-none absolute left-1/2 top-1/2"
            style={{
              width: mobile ? 900 : 2600,
              height: mobile ? 900 : 2600,
              transform: 'translate(-50%, -50%)',
              background:
                'repeating-conic-gradient(from 0deg, rgba(255,208,38,0.20) 0deg 7deg, rgba(255,208,38,0) 7deg 20deg)',
              maskImage: 'radial-gradient(circle, black 0%, transparent 62%)',
              WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 62%)',
            }}
          />
          <div className="relative flex flex-col items-center text-center gap-4 px-6">
            <div className="rv-text inline-flex items-center gap-3 rounded-full bg-gold px-6 py-2 font-extrabold uppercase tracking-[0.3em] text-night" style={{ fontSize: mobile ? 14 : 28 }}>
              <Icon n="crown" size={mobile ? 18 : 34} />
              <span>Champion</span>
            </div>
            <div className="rv-drop rounded-full p-2 ring-4 ring-gold shadow-[0_0_120px_20px_rgba(255,208,38,0.45)]" style={{ animationDelay: '150ms' }}>
              <Avatar avatar={champ.avatar} color={champ.color} size={mobile ? 150 : 300} label={champ.nickname} />
            </div>
            <div className="rv-text font-bold text-white drop-shadow-[0_8px_40px_rgba(0,0,0,0.9)]" style={{ fontSize: mobile ? 40 : 110, animationDelay: '450ms' }}>
              {champ.nickname}
            </div>
            <div className="rv-text inline-flex items-center gap-2 rounded-full border border-gold/50 bg-night/80 px-6 py-2 font-bold text-gold tabular-nums" style={{ fontSize: mobile ? 20 : 44, animationDelay: '750ms' }}>
              <OliveLeaf size={mobile ? 22 : 44} />
              <CountUp to={champ.score} ms={2200} run={!instant} />
              <span className="text-cloud/70 font-semibold" style={{ fontSize: mobile ? 14 : 26 }}>points</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RevealPodium({
  entries,
  big,
  shown,
  focus,
  holding,
  spinEntry,
  animate,
}: {
  entries: RankEntry[];
  big: boolean;
  shown: (p: 1 | 2 | 3) => boolean;
  focus: 1 | 2 | 3 | null;
  holding: boolean;
  spinEntry: RankEntry | null;
  animate: boolean;
}) {
  const cols: { p: 1 | 2 | 3; e: RankEntry | undefined }[] = [
    { p: 2, e: entries[1] },
    { p: 1, e: entries[0] },
    { p: 3, e: entries[2] },
  ];
  const heights: Record<1 | 2 | 3, number> = big ? { 1: 300, 2: 210, 3: 160 } : { 1: 104, 2: 74, 3: 56 };
  const crown: Record<1 | 2 | 3, string> = { 1: '#FFD026', 2: '#D0D7E2', 3: '#E2A83B' };

  return (
    <div className={`flex items-end justify-center ${big ? 'gap-6' : 'gap-2.5'}`}>
      {cols.map(({ p, e }) => {
        if (!e) return null;
        const isShown = shown(p);
        const focused = focus === p;
        const dimmed = focus !== null && !focused && !isShown;
        const av = big ? (p === 1 ? 140 : 116) : (p === 1 ? 66 : 54);
        const slot = av + (big ? 16 : 8);
        return (
          <div key={e.id} className="flex flex-col items-center transition-opacity duration-700" style={{ opacity: dimmed ? 0.4 : 1 }}>
            <div
              className={`mb-2 inline-flex items-center justify-center rounded-full border bg-night-2 font-bold ${big ? 'text-2xl px-4 py-1' : 'text-xs px-2.5 py-0.5'} ${focused ? 'border-gold/70' : 'border-white/15'}`}
              style={{ color: crown[p] }}
            >
              <Icon n="crown" size={big ? 28 : 14} className="mr-1" />#{p}
            </div>

            <div className="grid place-items-center" style={{ width: slot, height: slot }}>
              {isShown ? (
                <div className={`${animate ? 'rv-drop' : ''} rounded-full p-1.5 ${p === 1 ? 'ring-4 ring-gold shadow-[0_0_44px_rgba(255,208,38,0.6)]' : 'ring-2 ring-white/30'}`}>
                  <Avatar avatar={e.avatar} color={e.color} size={av} label={e.nickname} />
                </div>
              ) : p === 1 && spinEntry ? (
                <div
                  className="relative rv-throb rounded-full border-4 border-dashed border-gold/80 overflow-hidden grid place-items-center"
                  style={{ width: slot, height: slot, ['--rv-throb' as string]: '0.6s' } as CSSProperties}
                >
                  <div style={{ filter: 'blur(11px) brightness(0.55) saturate(0.35)' }}>
                    <Avatar avatar={spinEntry.avatar} color={spinEntry.color} size={av} />
                  </div>
                  <span className="absolute inset-0 grid place-items-center font-bold text-gold" style={{ fontSize: big ? 64 : 30 }}>?</span>
                </div>
              ) : (
                <div
                  className={`rounded-full border-4 border-dashed grid place-items-center font-bold ${
                    focused || (p === 1 && holding) ? 'rv-throb border-gold/80 bg-gold/15 text-gold' : 'border-white/20 bg-night-3/70 text-cloud/40'
                  }`}
                  style={{ width: slot, height: slot, fontSize: big ? 64 : 30 }}
                >
                  ?
                </div>
              )}
            </div>

            <div className={`mt-2 max-w-[11ch] truncate font-semibold ${big ? 'text-[34px]' : 'fs-small'} ${isShown ? 'text-white' : 'text-cloud/30'}`}>
              {isShown ? <span className={animate ? 'rv-text inline-block' : ''} style={{ animationDelay: '350ms' }}>{e.nickname}</span> : '? ? ?'}
            </div>
            <span
              className={`mb-3 mt-1 inline-flex items-center gap-1 rounded-full bg-night-2 border border-white/12 font-semibold tabular-nums ${big ? 'text-2xl px-4 py-1' : 'text-xs px-3 py-0.5'} ${isShown ? 'text-gold' : 'text-cloud/30'}`}
            >
              <OliveLeaf size={big ? 24 : 14} />
              {isShown ? <CountUp to={e.score} ms={1500} run={animate} /> : '•••'}
            </span>

            <div className={`flex flex-col items-stretch overflow-hidden rounded-t-2xl ${big ? 'w-[250px]' : 'w-[92px]'}`}>
              <div
                className={`podium-bevel ${big ? 'h-5' : 'h-2.5'} w-full transition-[filter] duration-700`}
                style={{ clipPath: 'polygon(6% 0%, 94% 0%, 100% 100%, 0% 100%)', filter: focused ? 'brightness(1.8) drop-shadow(0 0 18px #FFD026)' : undefined }}
                aria-hidden="true"
              />
              <div className="podium-monolith grid place-items-center relative overflow-hidden" style={{ height: heights[p] }}>
                <span className={`font-bold tabular-nums select-none leading-none ${big ? 'text-[140px]' : 'text-[44px]'} ${focused ? 'text-gold/40' : 'text-leaf/15'}`} aria-hidden="true">
                  {p}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CountUp({ to, ms, run }: { to: number; ms: number; run: boolean }) {
  const [v, setV] = useState(run ? 0 : to);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, run]);
  return <>{v}</>;
}
