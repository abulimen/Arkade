'use client';
import { useEffect, useState } from 'react';
import { RAINBOW } from '@/shared/types';

export type MascotName = 'arky' | 'olive' | 'wilf' | 'fenn' | 'jari' | 'tilly' | 'cami';
export type Core = 'idle' | 'happy' | 'thinking' | 'surprised' | 'cheer' | 'oops' | 'sleepy';
export type Expression =
  | Core
  | 'disguised'
  | 'sneaky'
  | 'caught'
  | 'howl'
  | 'win'
  | 'scheming'
  | 'writing'
  | 'fooled'
  | 'proud'
  | 'ready'
  | 'blast'
  | 'shy'
  | 'counting'
  | 'speedy'
  | 'curious'
  | 'reveal'
  | 'fly'
  | 'delivering'
  | 'worried';

const ALIAS: Record<Expression, Core> = {
  idle: 'idle', happy: 'happy', thinking: 'thinking', surprised: 'surprised', cheer: 'cheer', oops: 'oops', sleepy: 'sleepy',
  disguised: 'idle', sneaky: 'thinking', caught: 'oops', howl: 'surprised', win: 'cheer', scheming: 'happy', writing: 'thinking', fooled: 'oops', proud: 'cheer',
  ready: 'idle', blast: 'surprised', shy: 'oops', counting: 'thinking', speedy: 'cheer', curious: 'thinking', reveal: 'cheer', fly: 'happy', delivering: 'idle', worried: 'oops',
};

export const MASCOT_NAMES: MascotName[] = ['arky', 'olive', 'wilf', 'fenn', 'jari', 'tilly', 'cami'];
export const CORE_EXPRESSIONS: Core[] = ['idle', 'happy', 'thinking', 'surprised', 'cheer', 'oops', 'sleepy'];

export const MASCOT_SRC: Record<MascotName, string> = {
  arky: '/mascots/arky.webp',
  olive: '/mascots/olive.webp',
  wilf: '/mascots/wilf.webp',
  fenn: '/mascots/fenn.webp',
  jari: '/mascots/jari.webp',
  tilly: '/mascots/tilly.webp',
  cami: '/mascots/cami.webp',
};

export const LABEL: Record<MascotName, string> = {
  arky: 'Captain Arky the sea otter host',
  olive: 'Olive the messenger dove',
  wilf: 'Wilf the wolf in sheep clothing',
  fenn: 'Fenn the scribe fox',
  jari: 'Jari the terracotta torch warrior',
  tilly: 'Tilly the clockwork tortoise professor',
  cami: 'Cami the chameleon detective',
};

// Optional expression-specific overrides discovered from /api/mascots (e.g. arky-cheer.webp)
let overrideAssets: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;
const listeners = new Set<() => void>();

function useExpressionOverride(name: MascotName, expr: Expression, core: Core): string | null {
  const [, bump] = useState(0);
  useEffect(() => {
    if (overrideAssets !== null) return;
    const sub = () => bump((x) => x + 1);
    listeners.add(sub);
    if (!fetchPromise) {
      fetchPromise = fetch('/api/mascots')
        .then((r) => (r.ok ? r.json() : { assets: {} }))
        .then((j) => {
          overrideAssets = (j?.assets ?? {}) as Record<string, string>;
          listeners.forEach((fn) => fn());
          return overrideAssets;
        })
        .catch(() => {
          overrideAssets = {};
          return overrideAssets;
        });
    }
    return () => { listeners.delete(sub); };
  }, []);
  if (!overrideAssets) return null;
  return overrideAssets[`${name}-${expr}`] ?? overrideAssets[`${name}-${core}`] ?? null;
}

export function MascotView({
  name,
  expression = 'idle',
  size = 120,
  animate = true,
  decorative = true,
  label,
  sticker,
  reveal = 1,
  color = RAINBOW[3],
  className,
}: {
  name: MascotName;
  expression?: Expression;
  size?: number;
  animate?: boolean;
  decorative?: boolean;
  label?: string;
  sticker?: boolean;
  reveal?: number;
  color?: string;
  className?: string;
}) {
  const e = ALIAS[expression];
  const src = useExpressionOverride(name, expression, e) ?? MASCOT_SRC[name];
  const altText = decorative ? '' : label ?? LABEL[name];

  const baseShadow = sticker
    ? 'drop-shadow(0 10px 18px rgba(5, 4, 18, 0.62))'
    : 'drop-shadow(0 6px 12px rgba(5, 4, 18, 0.42))';

  let filter = baseShadow;
  if (name === 'cami' && reveal < 1) {
    const bright = (0.14 + reveal * 0.86).toFixed(2);
    const sat = Math.max(0.2, reveal).toFixed(2);
    filter = `brightness(${bright}) saturate(${sat}) drop-shadow(0 0 14px ${color}88)`;
  } else if (e === 'sleepy') {
    filter = `brightness(0.84) saturate(0.8) ${baseShadow}`;
  }

  return (
    <img
      src={src}
      alt={altText}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      aria-hidden={decorative ? true : undefined}
      data-expression={expression}
      className={`select-none object-contain ${animate ? 'm-bob ' : ''}${className ?? ''}`.trim()}
      style={{
        width: size,
        height: size,
        flex: 'none',
        filter,
        transition: 'filter 350ms var(--ease)',
      }}
    />
  );
}
