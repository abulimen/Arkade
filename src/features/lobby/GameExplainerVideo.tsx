'use client';

import { useCallback, useRef, useState } from 'react';
import type { GameId } from '@/shared/types';
import { haptic, playUi } from '@/client/sound';
import { Icon } from '@/ui/icons';
import { GAME_SHOWCASE } from './gameShowcaseData';

/**
 * Clean, full-width 16:9 explainer video player for each Arkade game.
 */
export function GameExplainerVideo({ gameId }: { gameId: GameId }) {
  return <GameExplainerPlayer key={gameId} gameId={gameId} />;
}

function GameExplainerPlayer({ gameId }: { gameId: GameId }) {
  const spec = GAME_SHOWCASE[gameId];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const startPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    playUi('ui-snap');
    haptic('snap');
    void v.play();
  }, []);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/12 bg-abyss shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)]">
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
        className="h-full w-full object-contain bg-abyss"
      />

      {!hasStarted && !playing && (
        <button
          type="button"
          onClick={startPlay}
          aria-label="Watch how to play"
          className="cursor-pointer group absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 px-4 bg-abyss/40 backdrop-blur-[1px] transition hover:bg-abyss/25"
        >
          <span className="relative grid h-14 w-14 sm:h-18 sm:w-18 place-items-center rounded-full border border-white/30 bg-night/90 text-white shadow-[0_18px_50px_-10px_rgba(0,0,0,0.9)] transition-transform group-hover:scale-110">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: spec.accent }}
            />
            <Icon n="play" size={26} className="relative translate-x-0.5 text-white" />
          </span>
          <span
            className="rounded-full border border-white/20 bg-night/90 px-3.5 py-1 text-xs sm:text-sm font-bold text-white shadow-lg text-center"
            style={{ boxShadow: `0 0 24px -6px ${spec.accent}` }}
          >
            Tap Play to Watch (30s)
          </span>
        </button>
      )}
    </div>
  );
}
