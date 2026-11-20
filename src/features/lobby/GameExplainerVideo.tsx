'use client';

import { useCallback, useRef, useState } from 'react';
import type { GameId } from '@/shared/types';
import { haptic, playUi } from '@/client/sound';
import { Icon } from '@/ui/icons';
import { GAME_SHOWCASE } from './gameShowcaseData';

/** Exact chapter start times (seconds) in each 30s explainer video. */
const CHAPTER_TIMES: Record<GameId, [number, number, number]> = {
  'spot-the-wolf': [3.8, 10.8, 18.3],
  'fake-verse': [3.8, 10.3, 18.3],
  'what-came-first': [3.8, 10.3, 18.3],
  'gideons-300': [3.8, 10.8, 18.3],
  'who-am-i': [3.8, 10.5, 18.3],
};

/**
 * Interactive 30-second HD explainer video player for each Arkade game,
 * with poster frame, chapter jump tabs, and mobile-friendly 16:9 playback.
 */
export function GameExplainerVideo({ gameId }: { gameId: GameId }) {
  return <GameExplainerPlayer key={gameId} gameId={gameId} />;
}

function GameExplainerPlayer({ gameId }: { gameId: GameId }) {
  const spec = GAME_SHOWCASE[gameId];
  const chapters = CHAPTER_TIMES[gameId];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [muted, setMuted] = useState(false);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      playUi('ui-snap');
      haptic('snap');
      void v.play();
    } else {
      playUi('ui-focus');
      haptic('tick');
      v.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    playUi('ui-focus');
    haptic('tick');
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const jumpToScene = useCallback(
    (idx: number) => {
      const v = videoRef.current;
      playUi('ui-snap', (idx - 1) * 0.25);
      haptic('tick');
      setScene(idx);
      if (v) {
        v.currentTime = chapters[idx] ?? 0;
        if (v.paused) {
          void v.play();
        }
      }
    },
    [chapters],
  );

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    const nextScene = t >= chapters[2] ? 2 : t >= chapters[1] ? 1 : 0;
    if (nextScene !== scene) setScene(nextScene);
  };

  return (
    <div className="double-bezel">
      <div className="double-bezel-inner overflow-hidden p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute explainer video' : 'Mute explainer video'}
              className="cursor-pointer press inline-flex items-center justify-center rounded-full border border-white/15 bg-night-3 h-9 w-9 text-cloud hover:text-white"
            >
              <Icon n={muted ? 'volumeoff' : 'volume'} size={14} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause guide video' : 'Play guide video'}
              className="cursor-pointer press inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-night-3 px-3 py-1.5 min-h-9 text-xs font-semibold text-cloud hover:text-white"
            >
              <Icon n={playing ? 'pause' : 'play'} size={12} />
              <span>{playing ? 'Pause' : 'Play'}</span>
            </button>
          </div>
        </div>

        {/* 16:9 Real Video Viewport */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/12 bg-abyss">
          <video
            ref={videoRef}
            src={`/videos/${gameId}.mp4`}
            poster={`/videos/${gameId}.jpg`}
            playsInline
            preload="metadata"
            controls={hasStarted}
            onPlay={() => {
              setPlaying(true);
              setHasStarted(true);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            className="h-full w-full object-contain bg-abyss"
          />

          {/* Initial Play Overlay Nudge (no autoplay) */}
          {!hasStarted && !playing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Watch how to play"
              className="cursor-pointer group absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 sm:gap-3 px-4 bg-abyss/45 backdrop-blur-[1px] transition hover:bg-abyss/30"
            >
              <span className="relative grid h-14 w-14 sm:h-20 sm:w-20 place-items-center rounded-full border border-white/30 bg-night/90 text-white shadow-[0_18px_50px_-10px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: spec.accent }}
                />
                <Icon n="play" size={26} className="relative translate-x-0.5 text-white" />
              </span>
              <span
                className="rounded-full border border-white/20 bg-night/90 px-3.5 sm:px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-lg text-center"
                style={{ boxShadow: `0 0 24px -6px ${spec.accent}` }}
              >
                Tap Play to Watch How It Works (30s)
              </span>
            </button>
          )}
        </div>

        {/* 3 Clickable Chapter Jump Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {spec.sceneLabels.map((label, idx) => {
            const active = idx === scene;
            return (
              <button
                key={label}
                type="button"
                onClick={() => jumpToScene(idx)}
                className={`cursor-pointer relative overflow-hidden rounded-xl border px-3 py-2.5 sm:py-2 min-h-10 text-left transition ${
                  active
                    ? 'border-white/35 bg-white/10 text-white'
                    : 'border-white/10 bg-abyss/80 text-cloud/65 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="leading-snug sm:truncate">{label}</span>
                  {active && playing && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full animate-pulse"
                      style={{ backgroundColor: spec.accent }}
                    />
                  )}
                </div>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5"
                    style={{ backgroundColor: spec.accent }}
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
