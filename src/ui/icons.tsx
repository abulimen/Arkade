import type { CSSProperties } from 'react';

// Lucide-style stroke icons: 2 px at 24 px, round caps and joins.
const P = {
  check: 'M20 6 9 17l-5-5',
  cross: 'M18 6 6 18M6 6l12 12',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeoff: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.7M6.6 6.7C3.7 8.5 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  kick: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 8l5 5M22 8l-5 5',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  play: 'M6 4l14 8-14 8z',
  skip: 'M5 4l10 8-10 8zM19 5v14',
  plus: 'M12 5v14M5 12h14',
  volume: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  volumeoff: 'M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01M2 9a15 15 0 0 1 20 0',
  wifioff: 'M2 2l20 20M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 4.5-2.8M10.7 5.1A15 15 0 0 1 22 9M5 12.5a10 10 0 0 1 5.2-2.7M14.5 10a10 10 0 0 1 4.5 2.5M12 20h.01',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  dice: 'M3 3h18v18H3zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01',
  stop: 'M5 5h14v14H5z',
  snow: 'M12 2v20M2 12h20M5 5l14 14M19 5 5 19',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
} as const;
export type IconName = keyof typeof P;

export function Icon({ n, size = 24, className, style, title }: { n: IconName; size?: number; className?: string; style?: CSSProperties; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} aria-label={title}>
      <path d={P[n]} />
    </svg>
  );
}

export const SHAPE_NAMES = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'] as const;
const SHAPE_D: Record<(typeof SHAPE_NAMES)[number], string> = {
  circle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  square: 'M4 4h16v16H4z',
  triangle: 'M12 3 22 20H2z',
  diamond: 'M12 2 22 12 12 22 2 12z',
  star: 'M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z',
  hexagon: 'M12 2l8.7 5v10L12 22 3.3 17V7z',
};
/** Shape badge: teams and answer buttons never rely on colour alone. */
export function Shape({ n, size = 24, className }: { n: number; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="#14123B" strokeWidth={2} strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={SHAPE_D[SHAPE_NAMES[((n % 6) + 6) % 6]]} />
    </svg>
  );
}

/** Olive leaf: the points icon (three leaves on a twig). */
export function OliveLeaf({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21c5-2 9-7 11-14" stroke="#25A868" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M14 7c4-1 7 1 8 3-3 2-7 2-8-3zM8 14c-1-4 1-7 4-8 1 4-1 7-4 8zM6 18c-3 0-5-2-5-4 3-1 5 1 5 4z" fill="#3DD68C" stroke="#14123B" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
