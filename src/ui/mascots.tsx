'use client';
import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { RAINBOW } from '@/shared/types';

export type MascotName = 'arky' | 'olive' | 'wilf' | 'fenn' | 'jari' | 'tilly' | 'cami';
export type Core = 'idle' | 'happy' | 'thinking' | 'surprised' | 'cheer' | 'oops' | 'sleepy';
export type Expression = Core | 'disguised' | 'sneaky' | 'caught' | 'howl' | 'win' | 'scheming' | 'writing' | 'fooled' | 'proud' | 'ready' | 'blast' | 'shy' | 'counting' | 'speedy' | 'curious' | 'reveal' | 'fly' | 'delivering' | 'worried';

const ALIAS: Record<Expression, Core> = {
  idle: 'idle', happy: 'happy', thinking: 'thinking', surprised: 'surprised', cheer: 'cheer', oops: 'oops', sleepy: 'sleepy',
  disguised: 'idle', sneaky: 'thinking', caught: 'oops', howl: 'surprised', win: 'cheer', scheming: 'happy', writing: 'thinking', fooled: 'oops', proud: 'cheer',
  ready: 'idle', blast: 'surprised', shy: 'oops', counting: 'thinking', speedy: 'cheer', curious: 'thinking', reveal: 'cheer', fly: 'happy', delivering: 'idle', worried: 'oops',
};
export const MASCOT_NAMES: MascotName[] = ['arky', 'olive', 'wilf', 'fenn', 'jari', 'tilly', 'cami'];
export const CORE_EXPRESSIONS: Core[] = ['idle', 'happy', 'thinking', 'surprised', 'cheer', 'oops', 'sleepy'];

// Client-side drop-in image registry (populated once from /api/mascots when files exist in public/mascots/)
let customAssets: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;
const listeners = new Set<() => void>();

function useCustomMascot(name: MascotName, expr: Expression, core: Core): string | null {
  const [, bump] = useState(0);
  useEffect(() => {
    if (customAssets !== null) return;
    const sub = () => bump((x) => x + 1);
    listeners.add(sub);
    if (!fetchPromise) {
      fetchPromise = fetch('/api/mascots')
        .then((r) => (r.ok ? r.json() : { assets: {} }))
        .then((j) => {
          customAssets = (j?.assets ?? {}) as Record<string, string>;
          listeners.forEach((fn) => fn());
          return customAssets;
        })
        .catch(() => {
          customAssets = {};
          return customAssets;
        });
    }
    return () => { listeners.delete(sub); };
  }, []);
  if (!customAssets) return null;
  return customAssets[`${name}-${expr}`] ?? customAssets[`${name}-${core}`] ?? customAssets[name] ?? null;
}

const N = '#14123B';
const stroke = { stroke: N, strokeWidth: 5.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const star = (x: number, y: number) => `M${x} ${y - 10}L${x + 3} ${y - 3}L${x + 10} ${y}L${x + 3} ${y + 3}L${x} ${y + 10}L${x - 3} ${y + 3}L${x - 10} ${y}L${x - 3} ${y - 3}Z`;

const CREST_ACCENT: Record<MascotName, [string, string]> = {
  arky: ['#FFC83D', '#3DB8FF'],
  olive: ['#3DD68C', '#3DB8FF'],
  wilf: ['#FF5C6C', '#6C5CE7'],
  fenn: ['#FF9A3D', '#B15CFF'],
  jari: ['#FF9A3D', '#FFC83D'],
  tilly: ['#3DD68C', '#FFC83D'],
  cami: ['#B15CFF', '#3DD68C'],
};

function Crest({ name }: { name: MascotName }) {
  const [a, b] = CREST_ACCENT[name];
  return (
    <g>
      <circle cx="120" cy="122" r="98" fill="#1E1B55" stroke={N} strokeWidth="6" />
      <circle cx="120" cy="122" r="90" fill="#14123B" stroke={a} strokeWidth="3.5" strokeOpacity="0.85" />
      <path d="M46 72A86 86 0 0 1 194 72" fill="none" stroke={b} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

interface FaceProps { p: string; e: Core; lx: number; rx: number; ey: number; mx: number; my: number; r?: number; iris?: string; noMouth?: boolean; animate: boolean }
function Face({ p, e, lx, rx, ey, mx, my, r = 13, iris = '#fff', noMouth, animate }: FaceProps) {
  const closedUp = e === 'happy' || e === 'cheer';
  const closedDown = e === 'sleepy';
  const dx = e === 'thinking' ? -3 : 0;
  const dy = e === 'thinking' ? -3 : e === 'oops' ? 4 : 0;
  const R = e === 'surprised' ? r + 2 : r;
  const eye = (x: number) =>
    closedUp ? <path key={x} d={`M${x - r} ${ey + 3}Q${x} ${ey - r - 2} ${x + r} ${ey + 3}`} fill="none" {...stroke} />
    : closedDown ? <path key={x} d={`M${x - r} ${ey - 2}Q${x} ${ey + r} ${x + r} ${ey - 2}`} fill="none" {...stroke} />
    : (
      <g key={x}>
        <circle cx={x} cy={ey} r={R} fill={iris} stroke={N} strokeWidth={4.5} />
        <circle cx={x + 2 + dx} cy={ey + 1 + dy} r={e === 'surprised' ? 4 : 6.5} fill={N} />
        <circle cx={x + 4.5 + dx} cy={ey - 2 + dy} r={2.4} fill="#fff" />
      </g>
    );
  const mouth: ReactNode = noMouth ? null
    : e === 'idle' ? <path d={`M${mx - 14} ${my}Q${mx} ${my + 14} ${mx + 14} ${my}`} fill="none" {...stroke} />
    : e === 'happy' ? <path d={`M${mx - 16} ${my - 2}Q${mx} ${my + 22} ${mx + 16} ${my - 2}Z`} fill="#FF5C6C" {...stroke} />
    : e === 'cheer' ? <path d={`M${mx - 20} ${my - 3}Q${mx} ${my + 28} ${mx + 20} ${my - 3}Z`} fill="#FF5C6C" {...stroke} />
    : e === 'thinking' ? <path d={`M${mx - 9} ${my + 3}H${mx + 9}`} fill="none" {...stroke} />
    : e === 'surprised' ? <circle cx={mx} cy={my + 4} r={6.5} fill={N} />
    : e === 'oops' ? <path d={`M${mx - 14} ${my + 5}q7 -9 14 0t14 0`} fill="none" {...stroke} />
    : <path d={`M${mx - 8} ${my + 3}Q${mx} ${my + 9} ${mx + 8} ${my + 3}`} fill="none" {...stroke} />;
  const brows = e === 'oops' ? <path d={`M${lx - r} ${ey - r - 5}L${lx + r - 2} ${ey - r - 11}M${rx + r} ${ey - r - 5}L${rx - r + 2} ${ey - r - 11}`} fill="none" {...stroke} strokeWidth={4.5} /> : null;
  return (
    <>
      <g id={`${p}-eyes`} className={animate && !closedUp && !closedDown ? 'm-blink' : undefined}>{eye(lx)}{eye(rx)}</g>
      <g id={`${p}-brows`}>{brows}</g>
      <circle cx={lx - 16} cy={my - 7} r={5.5} fill="#FF8FA0" opacity={closedUp ? 0.9 : 0.65} />
      <circle cx={rx + 16} cy={my - 7} r={5.5} fill="#FF8FA0" opacity={closedUp ? 0.9 : 0.65} />
      <g id={`${p}-mouth`}>{mouth}</g>
    </>
  );
}

function Fx({ p, e, animate }: { p: string; e: Core; animate: boolean }) {
  return (
    <g id={`${p}-fx`} className={animate ? 'm-float' : undefined}>
      {e === 'thinking' && (<><circle cx="194" cy="40" r="22" fill="#FFC83D" stroke={N} strokeWidth={4} /><path d="M187 34q0-9 8-9t8 9q0 6-8 10v4" fill="none" stroke={N} strokeWidth={4} strokeLinecap="round" /><circle cx="195" cy="57" r="2.5" fill={N} /></>)}
      {e === 'oops' && <path d="M46 58q-11 17 0 26 11-9 0-26z" fill="#3DB8FF" stroke={N} strokeWidth={4} strokeLinejoin="round" />}
      {e === 'sleepy' && (<><path d="M172 44h16l-16 18h16" fill="none" stroke="#FFC83D" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" /><path d="M196 24h10l-10 11h10" fill="none" stroke="#3DB8FF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></>)}
      {(e === 'cheer' || e === 'happy') && [[36, 50], [204, 46], [26, 122], [214, 120]].map(([x, y], i) => <path key={i} d={star(x, y)} fill="#FFE14D" stroke={N} strokeWidth={2.5} strokeLinejoin="round" />)}
      {e === 'surprised' && <path d="M42 42l10 10M198 42l-10 10M120 14v12" stroke="#FFC83D" strokeWidth={5} strokeLinecap="round" fill="none" />}
    </g>
  );
}

interface BodyProps { e: Core; animate: boolean; reveal: number; color: string; clipId: string }
const BODY: Record<MascotName, (b: BodyProps) => ReactNode> = {
  arky: ({ e, animate }) => (
    <>
      <ellipse id="arky-shadow" cx="120" cy="222" rx="74" ry="8" fill="#0B0A1A" opacity=".55" />
      <Crest name="arky" />
      <g id="arky-pennant" className={animate ? 'm-wave' : undefined}>
        <line x1="120" y1="26" x2="120" y2="54" {...stroke} />
        <path d={e === 'surprised' ? 'M122 14L130 50L114 50Z' : 'M122 26L164 36L122 46Z'} fill="#FF5C6C" {...stroke} strokeWidth={4.5} />
      </g>
      <g id="arky-body">
        <rect x="64" y="80" width="112" height="54" rx="14" fill="#FFD58A" {...stroke} />
        <path d="M50 86L120 46L190 86Z" fill="#FFC83D" {...stroke} />
        <path d="M34 128H206C200 174 170 202 120 202C70 202 40 174 34 128Z" fill="#C98A4B" {...stroke} />
        <path d="M54 152H186M72 174H168" stroke="#A9692F" strokeWidth={5} strokeLinecap="round" />
        <path d="M46 196Q82 184 120 196T194 196" fill="none" stroke="#3DB8FF" strokeWidth={7} strokeLinecap="round" />
      </g>
      <Face p="arky" e={e} lx={96} rx={144} ey={108} mx={120} my={150} animate={animate} />
    </>
  ),
  olive: ({ e, animate }) => (
    <>
      <ellipse id="olive-shadow" cx="120" cy="222" rx="64" ry="8" fill="#0B0A1A" opacity=".55" />
      <Crest name="olive" />
      <g id="olive-body">
        <path d="M62 140Q28 124 28 88Q64 94 78 120Z M178 140Q212 124 212 88Q176 94 162 120Z" fill="#F4F1FF" {...stroke} />
        <circle cx="120" cy="136" r="56" fill="#FFFFFF" {...stroke} />
        <ellipse cx="120" cy="168" rx="36" ry="20" fill="#F4F1FF" />
        <path d="M88 86Q120 70 152 86L144 98Q120 88 96 98Z" fill="#3DD68C" {...stroke} strokeWidth={4} />
        <path d="M110 132H130L120 148Z" fill="#FF9A3D" {...stroke} strokeWidth={4} />
        <path d="M122 146Q148 156 176 144" stroke="#25A868" strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M148 150q6 -14 16 -11q-3 12 -16 11zM164 146q10 -10 18 -3q-6 12 -18 3z" fill="#3DD68C" stroke={N} strokeWidth={3} strokeLinejoin="round" />
      </g>
      <Face p="olive" e={e} lx={96} rx={144} ey={114} mx={120} my={162} r={10} noMouth animate={animate} />
    </>
  ),
  wilf: ({ e, animate }) => (
    <>
      <ellipse id="wilf-shadow" cx="120" cy="222" rx="72" ry="8" fill="#0B0A1A" opacity=".55" />
      <Crest name="wilf" />
      <g id="wilf-body">
        <path d="M68 86L74 30L112 64Z M172 86L166 30L128 64Z" fill="#6B7A8F" {...stroke} />
        <circle cx="120" cy="126" r="60" fill="#6B7A8F" {...stroke} />
        <ellipse cx="120" cy="150" rx="34" ry="24" fill="#A9B4C4" {...stroke} strokeWidth={4.5} />
        <ellipse cx="120" cy="136" rx="9" ry="6.5" fill={N} />
        <path d="M130 168L135 180L140 168Z" fill="#fff" stroke={N} strokeWidth={3} strokeLinejoin="round" />
      </g>
      <g id="wilf-accessory" className={animate ? 'm-wiggle' : undefined}>
        <path d="M56 96Q60 54 120 54Q180 54 184 96Q166 76 120 76Q74 76 56 96Z" fill="#F4F1FF" {...stroke} strokeWidth={4.5} />
        {[[64, 186], [92, 198], [120, 202], [148, 198], [176, 186]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="18" fill="#F4F1FF" stroke={N} strokeWidth={4.5} />)}
      </g>
      <Face p="wilf" e={e} lx={95} rx={145} ey={112} mx={112} my={164} r={13.5} iris="#FFE14D" animate={animate} />
    </>
  ),
  fenn: ({ e, animate }) => (
    <>
      <ellipse id="fenn-shadow" cx="120" cy="222" rx="74" ry="8" fill="#0B0A1A" opacity=".55" />
      <Crest name="fenn" />
      <g id="fenn-body">
        <path d="M62 84L48 22L108 60Z M178 84L192 22L132 60Z" fill="#FF9A3D" {...stroke} />
        <path d="M66 72L58 38L92 58Z M174 72L182 38L148 58Z" fill="#FF5C6C" />
        <ellipse cx="120" cy="124" rx="62" ry="52" fill="#FF9A3D" {...stroke} />
        <path d="M62 126L96 138L66 158Z M178 126L144 138L174 158Z" fill="#F4F1FF" stroke={N} strokeWidth={4} strokeLinejoin="round" />
        <circle cx="120" cy="144" r="7.5" fill={N} />
      </g>
      <g id="fenn-accessory" className={animate ? 'm-wiggle' : undefined}>
        <path d="M184 196L216 140Q228 150 220 166Q210 186 184 196Z" fill="#FFC83D" stroke={N} strokeWidth={4} strokeLinejoin="round" />
        <rect x="64" y="182" width="112" height="22" rx="11" fill="#F4F1FF" stroke={N} strokeWidth={4.5} />
        <circle cx="64" cy="193" r="8" fill="#C98A4B" stroke={N} strokeWidth={3.5} />
        <circle cx="176" cy="193" r="8" fill="#C98A4B" stroke={N} strokeWidth={3.5} />
      </g>
      <Face p="fenn" e={e} lx={94} rx={146} ey={110} mx={120} my={160} r={12} animate={animate} />
    </>
  ),
  jari: ({ e, animate }) => (
    <>
      <ellipse id="jari-shadow" cx="120" cy="222" rx="68" ry="8" fill="#0B0A1A" opacity=".55" />
      <Crest name="jari" />
      <g id="jari-fx" className={animate ? 'm-flicker' : undefined}>
        <path d="M120 16Q154 50 140 80Q120 94 100 80Q86 50 120 16Z" fill="#FF9A3D" {...stroke} strokeWidth={4.5} />
        <path d="M120 40Q138 60 128 78Q120 86 112 78Q102 60 120 40Z" fill="#FFE14D" />
      </g>
      <g id="jari-body">
        <rect x="88" y="80" width="64" height="18" rx="8" fill="#D9653B" {...stroke} />
        <path d="M80 98Q50 146 76 196Q120 216 164 196Q190 146 160 98Z" fill="#D9653B" {...stroke} />
        <path d="M66 138Q120 156 174 138L170 162Q120 180 70 162Z" fill="#FFC83D" stroke={N} strokeWidth={4} strokeLinejoin="round" />
        <path d="M146 190L138 174L148 164" fill="none" stroke="#FFE14D" strokeWidth={3.5} strokeLinecap="round" />
      </g>
      <g id="jari-accessory">
        <path d="M182 128Q218 112 214 148Q202 136 182 140Z" fill="#F4F1FF" stroke={N} strokeWidth={4} strokeLinejoin="round" />
      </g>
      <Face p="jari" e={e} lx={98} rx={142} ey={134} mx={120} my={170} r={11} animate={animate} />
    </>
  ),
  tilly: ({ e, animate }) => (
    <>
      <ellipse id="tilly-shadow" cx="120" cy="222" rx="76" ry="8" fill="#0B0A1A" opacity=".55" />
      <Crest name="tilly" />
      <g id="tilly-body">
        <path d="M40 168Q40 52 120 52Q200 52 200 168Z" fill="#25A868" {...stroke} />
        {[[120, 78], [84, 104], [156, 104]].map(([x, y], i) => (
          <g key={i} className={animate && e === 'thinking' ? 'm-plate' : undefined}>
            <path d={`M${x} ${y - 16}L${x + 15} ${y - 8}V${y + 8}L${x} ${y + 16}L${x - 15} ${y + 8}V${y - 8}Z`} fill="#3DD68C" stroke="#FFC83D" strokeWidth={3.5} strokeLinejoin="round" />
          </g>
        ))}
        <ellipse cx="120" cy="154" rx="50" ry="40" fill="#8FD6A8" {...stroke} />
      </g>
      <g id="tilly-accessory">
        <circle cx="96" cy="146" r="18" fill="none" stroke="#FFC83D" strokeWidth={4.5} />
        <circle cx="144" cy="146" r="18" fill="none" stroke="#FFC83D" strokeWidth={4.5} />
        <path d="M114 146H126" stroke="#FFC83D" strokeWidth={4.5} />
      </g>
      <Face p="tilly" e={e} lx={96} rx={144} ey={146} mx={120} my={178} r={10} animate={animate} />
    </>
  ),
  cami: ({ e, animate, reveal, color, clipId }) => {
    const shape = (fill: string, pre: string) => (
      <g id={`cami-${pre}`}>
        <path d="M64 166Q30 168 38 198Q54 218 80 198Q92 184 78 176" fill="none" stroke={fill} strokeWidth={20} strokeLinecap="round" />
        <ellipse cx="116" cy="152" rx="58" ry="42" fill={fill} />
        <circle cx="146" cy="106" r="42" fill={fill} />
      </g>
    );
    const outline = (
      <g fill="none" stroke={N} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="116" cy="152" rx="58" ry="42" />
        <circle cx="146" cy="106" r="42" />
        <path d="M64 166Q30 168 38 198Q54 218 80 198Q92 184 78 176" />
      </g>
    );
    return (
      <>
        <ellipse id="cami-shadow" cx="120" cy="222" rx="74" ry="8" fill="#0B0A1A" opacity=".55" />
        <Crest name="cami" />
        <clipPath id={clipId}><rect x="0" y={240 * (1 - reveal)} width="240" height="240" /></clipPath>
        <g id="cami-body">
          {shape('#2A2670', 'silhouette')}
          <g clipPath={`url(#${clipId})`}>{shape(color, 'color')}<circle cx="98" cy="160" r="8" fill="#fff" opacity=".35" /><circle cx="126" cy="176" r="6" fill="#fff" opacity=".35" /></g>
          {outline}
        </g>
        <g id="cami-accessory"><circle cx="170" cy="104" r="20" fill="#3DB8FF" fillOpacity=".28" stroke="#FFC83D" strokeWidth={5} /><path d="M184 118L202 138" stroke="#FFC83D" strokeWidth={6} strokeLinecap="round" /></g>
        <Face p="cami" e={e} lx={132} rx={170} ey={102} mx={146} my={132} r={11.5} animate={animate} />
      </>
    );
  },
};

export const LABEL: Record<MascotName, string> = { arky: 'Arky the ark', olive: 'Olive the dove', wilf: 'Wilf the wolf', fenn: 'Fenn the fox', jari: 'Jari the jar', tilly: 'Tilly the tortoise', cami: 'Cami the chameleon' };

export function MascotView({ name, expression = 'idle', size = 120, animate = true, decorative = true, label, sticker, reveal = 1, color = RAINBOW[3], className }: {
  name: MascotName; expression?: Expression; size?: number; animate?: boolean; decorative?: boolean; label?: string; sticker?: boolean; reveal?: number; color?: string; className?: string;
}) {
  const clipId = useId().replace(/:/g, '');
  const e = ALIAS[expression];
  const customUrl = useCustomMascot(name, expression, e);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width={size} height={size} className={className} data-expression={expression}
      role={decorative ? undefined : 'img'} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : label ?? LABEL[name]}
      style={{ flex: 'none', ...(sticker ? { filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.45))' } : null) }}
    >
      <g className={animate ? 'm-bob' : undefined}>
        {BODY[name]({ e, animate, reveal, color, clipId })}
        {customUrl && (
          <g style={name === 'cami' && reveal < 1 ? { opacity: Math.max(0.25, reveal) } : undefined}>
            <circle cx="120" cy="122" r="88" fill="#14123B" />
            <image href={customUrl} x="20" y="20" width="200" height="200" preserveAspectRatio="xMidYMid contain" />
          </g>
        )}
        <Fx p={name} e={e} animate={animate} />
      </g>
    </svg>
  );
}
