import { useId } from 'react';
import type { ReactNode } from 'react';
import { RAINBOW } from '@/shared/types';

export type MascotName = 'arky' | 'olive' | 'wilf' | 'fenn' | 'jari' | 'tilly' | 'cami';
export type Core = 'idle' | 'happy' | 'thinking' | 'surprised' | 'cheer' | 'oops' | 'sleepy';
export type Expression = Core | 'disguised' | 'sneaky' | 'caught' | 'howl' | 'win' | 'scheming' | 'writing' | 'fooled' | 'proud' | 'ready' | 'blast' | 'shy' | 'counting' | 'speedy' | 'curious' | 'reveal' | 'fly' | 'delivering' | 'worried';

// Every mascot supports the seven core expressions; the characters' own names map onto them.
const ALIAS: Record<Expression, Core> = {
  idle: 'idle', happy: 'happy', thinking: 'thinking', surprised: 'surprised', cheer: 'cheer', oops: 'oops', sleepy: 'sleepy',
  disguised: 'idle', sneaky: 'thinking', caught: 'oops', howl: 'surprised', win: 'cheer', scheming: 'happy', writing: 'thinking', fooled: 'oops', proud: 'cheer',
  ready: 'idle', blast: 'surprised', shy: 'oops', counting: 'thinking', speedy: 'cheer', curious: 'thinking', reveal: 'cheer', fly: 'happy', delivering: 'idle', worried: 'oops',
};
export const MASCOT_NAMES: MascotName[] = ['arky', 'olive', 'wilf', 'fenn', 'jari', 'tilly', 'cami'];
export const CORE_EXPRESSIONS: Core[] = ['idle', 'happy', 'thinking', 'surprised', 'cheer', 'oops', 'sleepy'];

const N = '#14123B';
const stroke = { stroke: N, strokeWidth: 6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const star = (x: number, y: number) => `M${x} ${y - 10}L${x + 3} ${y - 3}L${x + 10} ${y}L${x + 3} ${y + 3}L${x} ${y + 10}L${x - 3} ${y + 3}L${x - 10} ${y}L${x - 3} ${y - 3}Z`;

interface FaceProps { p: string; e: Core; lx: number; rx: number; ey: number; mx: number; my: number; r?: number; iris?: string; noMouth?: boolean; animate: boolean }
function Face({ p, e, lx, rx, ey, mx, my, r = 14, iris = '#fff', noMouth, animate }: FaceProps) {
  const closedUp = e === 'happy' || e === 'cheer';
  const closedDown = e === 'sleepy';
  const dx = e === 'thinking' ? -3 : 0;
  const dy = e === 'thinking' ? -4 : e === 'oops' ? 5 : 0;
  const R = e === 'surprised' ? r + 2 : r;
  const eye = (x: number) =>
    closedUp ? <path key={x} d={`M${x - r} ${ey + 4}Q${x} ${ey - r - 2} ${x + r} ${ey + 4}`} fill="none" {...stroke} />
    : closedDown ? <path key={x} d={`M${x - r} ${ey - 2}Q${x} ${ey + r} ${x + r} ${ey - 2}`} fill="none" {...stroke} />
    : (
      <g key={x}>
        <circle cx={x} cy={ey} r={R} fill={iris} stroke={N} strokeWidth={5} />
        <circle cx={x + 3 + dx} cy={ey + 2 + dy} r={e === 'surprised' ? 3.5 : 6} fill={N} />
        <circle cx={x + 5 + dx} cy={ey - 1 + dy} r={2} fill="#fff" />
      </g>
    );
  const mouth: ReactNode = noMouth ? null
    : e === 'idle' ? <path d={`M${mx - 16} ${my}Q${mx} ${my + 16} ${mx + 16} ${my}`} fill="none" {...stroke} />
    : e === 'happy' ? <path d={`M${mx - 18} ${my - 2}Q${mx} ${my + 26} ${mx + 18} ${my - 2}Z`} fill={N} {...stroke} />
    : e === 'cheer' ? <path d={`M${mx - 22} ${my - 4}Q${mx} ${my + 32} ${mx + 22} ${my - 4}Z`} fill={N} {...stroke} />
    : e === 'thinking' ? <path d={`M${mx - 10} ${my + 4}H${mx + 10}`} fill="none" {...stroke} />
    : e === 'surprised' ? <circle cx={mx} cy={my + 4} r={7} fill={N} />
    : e === 'oops' ? <path d={`M${mx - 16} ${my + 6}q8 -10 16 0t16 0`} fill="none" {...stroke} />
    : <path d={`M${mx - 8} ${my + 4}Q${mx} ${my + 10} ${mx + 8} ${my + 4}`} fill="none" {...stroke} />;
  const brows = e === 'oops' ? <path d={`M${lx - r} ${ey - r - 6}L${lx + r - 2} ${ey - r - 12}M${rx + r} ${ey - r - 6}L${rx - r + 2} ${ey - r - 12}`} fill="none" {...stroke} strokeWidth={5} /> : null;
  return (
    <>
      <g id={`${p}-eyes`} className={animate && !closedUp && !closedDown ? 'm-blink' : undefined}>{eye(lx)}{eye(rx)}</g>
      <g id={`${p}-brows`}>{brows}</g>
      <circle cx={lx - 18} cy={my - 8} r={6} fill="#FF8FA0" opacity={closedUp ? 0.95 : 0.7} />
      <circle cx={rx + 18} cy={my - 8} r={6} fill="#FF8FA0" opacity={closedUp ? 0.95 : 0.7} />
      <g id={`${p}-mouth`}>{mouth}</g>
    </>
  );
}

function Fx({ p, e, animate }: { p: string; e: Core; animate: boolean }) {
  return (
    <g id={`${p}-fx`} className={animate ? 'm-float' : undefined}>
      {e === 'thinking' && (<><circle cx="196" cy="38" r="24" fill="#fff" stroke={N} strokeWidth={4} /><path d="M188 32q0-10 9-10t9 10q0 7-9 11v5" fill="none" stroke={N} strokeWidth={4} strokeLinecap="round" /><circle cx="197" cy="58" r="2.5" fill={N} /></>)}
      {e === 'oops' && <path d="M44 62q-12 18 0 28 12-10 0-28z" fill="#3DB8FF" stroke={N} strokeWidth={4} strokeLinejoin="round" />}
      {e === 'sleepy' && (<><path d="M170 44h18l-18 20h18" fill="none" stroke={N} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" /><path d="M198 22h11l-11 12h11" fill="none" stroke={N} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></>)}
      {(e === 'cheer' || e === 'happy') && [[34, 52], [208, 46], [22, 120], [220, 118]].map(([x, y], i) => <path key={i} d={star(x, y)} fill="#FFE14D" stroke={N} strokeWidth={2.5} strokeLinejoin="round" />)}
      {e === 'surprised' && <path d="M40 40l10 10M200 40l-10 10M120 14v14" stroke={N} strokeWidth={5} strokeLinecap="round" fill="none" />}
    </g>
  );
}

interface BodyProps { e: Core; animate: boolean; reveal: number; color: string; clipId: string }
const BODY: Record<MascotName, (b: BodyProps) => ReactNode> = {
  arky: ({ e, animate }) => (
    <>
      <ellipse id="arky-shadow" cx="120" cy="216" rx="86" ry="10" fill="#3DB8FF" opacity=".35" />
      <g id="arky-pennant" className={animate ? 'm-wave' : undefined}>
        <line x1="120" y1="22" x2="120" y2="54" {...stroke} />
        <path d={e === 'surprised' ? 'M122 6L128 50L116 50Z' : 'M122 24L166 34L122 46Z'} fill="#FF5C6C" {...stroke} strokeWidth={5} />
      </g>
      <g id="arky-body">
        <path d="M28 126H212C208 176 176 206 120 206C64 206 32 176 28 126Z" fill="#C98A4B" {...stroke} />
        <path d="M52 150H188M70 176H170" stroke="#A9692F" strokeWidth={5} strokeLinecap="round" />
        <rect x="62" y="82" width="116" height="52" rx="8" fill="#FFD58A" {...stroke} />
        <path d="M52 86L120 48L188 86Z" fill="#FFC83D" {...stroke} />
      </g>
      <Face p="arky" e={e} lx={96} rx={144} ey={108} mx={120} my={152} animate={animate} />
    </>
  ),
  olive: ({ e, animate }) => (
    <>
      <ellipse id="olive-shadow" cx="120" cy="214" rx="64" ry="9" fill="#3DB8FF" opacity=".35" />
      <g id="olive-body">
        <path d="M60 140Q28 128 24 92Q62 98 76 122Z" fill="#F4F1FF" {...stroke} />
        <path d="M180 140Q212 128 216 92Q178 98 164 122Z" fill="#F4F1FF" {...stroke} />
        <path d="M24 92Q34 90 44 96Q36 104 28 108Z M216 92Q206 90 196 96Q204 104 212 108Z" fill="#3DB8FF" />
        <ellipse cx="120" cy="140" rx="62" ry="62" fill="#fff" {...stroke} />
        <ellipse cx="120" cy="176" rx="40" ry="24" fill="#F4F1FF" />
        <path d="M110 134H130L120 152Z" fill="#FF9A3D" {...stroke} strokeWidth={4} />
        <path d="M122 150Q146 160 172 150" stroke="#25A868" strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M146 154q6 -14 16 -12q-2 12 -16 12zM160 150q10 -10 20 -4q-6 12 -20 4zM170 146q4 -12 14 -12q0 10 -14 12z" fill="#3DD68C" stroke={N} strokeWidth={3} strokeLinejoin="round" />
      </g>
      <Face p="olive" e={e} lx={96} rx={144} ey={114} mx={120} my={168} r={10} noMouth animate={animate} />
    </>
  ),
  wilf: ({ e, animate }) => (
    <>
      <ellipse id="wilf-shadow" cx="120" cy="218" rx="80" ry="9" fill="#3DB8FF" opacity=".35" />
      <g id="wilf-body">
        <path d="M66 86L74 26L114 62Z M174 86L166 26L126 62Z" fill="#6B7A8F" {...stroke} />
        <circle cx="120" cy="124" r="66" fill="#6B7A8F" {...stroke} />
        <ellipse cx="120" cy="150" rx="36" ry="26" fill="#A9B4C4" {...stroke} strokeWidth={5} />
        <ellipse cx="120" cy="136" rx="10" ry="7" fill={N} />
        <path d="M130 170L136 184L142 170Z" fill="#fff" stroke={N} strokeWidth={3} strokeLinejoin="round" />
      </g>
      <g id="wilf-accessory" className={animate ? 'm-wiggle' : undefined}>
        {[[50, 192], [86, 204], [120, 208], [154, 204], [190, 192]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="24" fill="#fff" stroke={N} strokeWidth={5} />)}
        {[[96, 56], [144, 56]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="17" fill="#fff" stroke={N} strokeWidth={5} />)}
      </g>
      <Face p="wilf" e={e} lx={94} rx={146} ey={110} mx={110} my={166} r={15} iris="#FFE14D" animate={animate} />
    </>
  ),
  fenn: ({ e, animate }) => (
    <>
      <ellipse id="fenn-shadow" cx="120" cy="220" rx="84" ry="9" fill="#3DB8FF" opacity=".35" />
      <g id="fenn-body">
        <path d="M168 200Q236 190 224 120Q210 168 160 172Z" fill="#FF9A3D" {...stroke} />
        <circle cx="222" cy="128" r="12" fill="#fff" stroke={N} strokeWidth={4} />
        <ellipse cx="116" cy="192" rx="54" ry="30" fill="#FF9A3D" {...stroke} />
        <ellipse cx="116" cy="198" rx="26" ry="20" fill="#fff" />
        <path d="M62 82L52 18L110 58Z M178 82L188 18L130 58Z" fill="#FF9A3D" {...stroke} />
        <path d="M66 70L62 36L92 58Z M174 70L178 36L148 58Z" fill="#FF5C6C" />
        <ellipse cx="120" cy="116" rx="68" ry="56" fill="#FF9A3D" {...stroke} />
        <path d="M54 120L92 134L58 156Z M186 120L148 134L182 156Z" fill="#fff" stroke={N} strokeWidth={4} strokeLinejoin="round" />
        <circle cx="120" cy="140" r="8" fill={N} />
      </g>
      <g id="fenn-accessory" className={animate ? 'm-wiggle' : undefined}>
        <path d="M196 214L232 150Q246 160 238 176Q226 200 196 214Z" fill="#fff" stroke={N} strokeWidth={4} strokeLinejoin="round" />
        <rect x="52" y="196" width="40" height="14" rx="7" fill="#FFD58A" stroke={N} strokeWidth={4} transform="rotate(-12 72 203)" />
      </g>
      <Face p="fenn" e={e} lx={92} rx={148} ey={104} mx={120} my={158} r={12} animate={animate} />
    </>
  ),
  jari: ({ e, animate }) => (
    <>
      <ellipse id="jari-shadow" cx="120" cy="220" rx="68" ry="9" fill="#3DB8FF" opacity=".35" />
      <g id="jari-fx" className={animate ? 'm-flicker' : undefined}>
        <circle cx="120" cy="50" r="40" fill="#FFE14D" opacity=".25" />
        <path d="M120 8Q158 46 142 78Q120 92 98 78Q82 46 120 8Z" fill="#FF9A3D" {...stroke} strokeWidth={5} />
        <path d="M120 38Q140 60 130 78Q120 86 110 78Q100 60 120 38Z" fill="#FFE14D" />
      </g>
      <g id="jari-body">
        <rect x="88" y="78" width="64" height="20" rx="8" fill="#D9653B" {...stroke} />
        <path d="M80 98Q44 150 74 204Q120 228 166 204Q196 150 160 98Z" fill="#D9653B" {...stroke} />
        <path d="M60 140Q120 160 180 140L176 166Q120 186 64 166Z" fill="#F08A5D" stroke={N} strokeWidth={4} strokeLinejoin="round" />
        <path d="M150 196L142 180L150 170" fill="none" stroke={N} strokeWidth={3} strokeLinecap="round" />
      </g>
      <g id="jari-accessory">
        <path d="M60 140L30 168M180 140L214 120" stroke={N} strokeWidth={6} strokeLinecap="round" />
        <path d="M206 100Q236 96 232 128Q224 112 206 110Z" fill="#FFD58A" stroke={N} strokeWidth={4} strokeLinejoin="round" />
      </g>
      <Face p="jari" e={e} lx={100} rx={140} ey={136} mx={120} my={172} r={11} animate={animate} />
    </>
  ),
  tilly: ({ e, animate }) => (
    <>
      <ellipse id="tilly-shadow" cx="120" cy="220" rx="88" ry="9" fill="#3DB8FF" opacity=".35" />
      <g id="tilly-body">
        <path d="M24 176Q24 40 120 40Q216 40 216 176Z" fill="#3DD68C" {...stroke} />
        {[[120, 70], [78, 100], [162, 100], [96, 140], [144, 140]].map(([x, y], i) => (
          <g key={i} className={animate && e === 'thinking' ? 'm-plate' : undefined} style={{ animationDelay: `${i * 0.4}s` }}>
            <path d={`M${x} ${y - 20}L${x + 18} ${y - 10}V${y + 10}L${x} ${y + 20}L${x - 18} ${y + 10}V${y - 10}Z`} fill="#3DD68C" stroke="#25A868" strokeWidth={4} strokeLinejoin="round" />
            <circle cx={x} cy={y} r="4" fill={N} />
          </g>
        ))}
        <rect x="56" y="200" width="36" height="22" rx="11" fill="#8FD6A8" {...stroke} strokeWidth={5} />
        <rect x="148" y="200" width="36" height="22" rx="11" fill="#8FD6A8" {...stroke} strokeWidth={5} />
        <ellipse cx="120" cy="158" rx="52" ry="42" fill="#8FD6A8" {...stroke} />
      </g>
      <g id="tilly-accessory">
        <circle cx="96" cy="150" r="19" fill="none" stroke={N} strokeWidth={4} />
        <circle cx="144" cy="150" r="19" fill="none" stroke={N} strokeWidth={4} />
        <path d="M115 150H125" stroke={N} strokeWidth={4} />
        <path d="M200 176h20M202 214h16M204 176q-4 16 6 19q10 3 6-19" fill="none" stroke={N} strokeWidth={4} strokeLinecap="round" />
      </g>
      <Face p="tilly" e={e} lx={96} rx={144} ey={150} mx={120} my={182} r={10} animate={animate} />
    </>
  ),
  cami: ({ e, animate, reveal, color, clipId }) => {
    const shape = (fill: string, pre: string) => (
      <g id={`cami-${pre}`}>
        <path d="M58 170Q18 172 26 206Q44 232 76 210Q92 192 74 184" fill="none" stroke={fill} strokeWidth={22} strokeLinecap="round" />
        <ellipse cx="116" cy="156" rx="66" ry="48" fill={fill} />
        <circle cx="150" cy="104" r="46" fill={fill} />
      </g>
    );
    const outline = (
      <g fill="none" stroke={N} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="116" cy="156" rx="66" ry="48" />
        <circle cx="150" cy="104" r="46" />
        <path d="M58 170Q18 172 26 206Q44 232 76 210Q92 192 74 184" />
      </g>
    );
    return (
      <>
        <ellipse id="cami-shadow" cx="120" cy="222" rx="84" ry="9" fill="#3DB8FF" opacity=".35" />
        <clipPath id={clipId}><rect x="0" y={240 * (1 - reveal)} width="240" height="240" /></clipPath>
        <g id="cami-body">
          {shape('#2A2670', 'silhouette')}
          <g clipPath={`url(#${clipId})`}>{shape(color, 'color')}<circle cx="96" cy="166" r="9" fill="#fff" opacity=".35" /><circle cx="128" cy="184" r="7" fill="#fff" opacity=".35" /><circle cx="78" cy="148" r="6" fill="#fff" opacity=".35" /></g>
          {outline}
        </g>
        <g id="cami-accessory"><circle cx="176" cy="102" r="22" fill="#fff" fillOpacity=".25" stroke={N} strokeWidth={5} /><path d="M192 118L210 140" stroke={N} strokeWidth={6} strokeLinecap="round" /></g>
        <Face p="cami" e={e} lx={136} rx={176} ey={100} mx={150} my={132} r={12} animate={animate} />
        <path d="M22 196q0 -8 8 -8t8 8q0 6 -8 8" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={reveal < 1 ? 1 : 0} />
      </>
    );
  },
};

const LABEL: Record<MascotName, string> = { arky: 'Arky the ark', olive: 'Olive the dove', wilf: 'Wilf the wolf', fenn: 'Fenn the fox', jari: 'Jari the jar', tilly: 'Tilly the tortoise', cami: 'Cami the chameleon' };

export function MascotView({ name, expression = 'idle', size = 120, animate = true, decorative = true, label, sticker, reveal = 1, color = RAINBOW[3], className }: {
  name: MascotName; expression?: Expression; size?: number; animate?: boolean; decorative?: boolean; label?: string; sticker?: boolean; reveal?: number; color?: string; className?: string;
}) {
  const clipId = useId().replace(/:/g, '');
  const e = ALIAS[expression];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width={size} height={size} className={className} data-expression={expression}
      role={decorative ? undefined : 'img'} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : label ?? LABEL[name]}
      style={{ flex: 'none', ...(sticker ? { filter: 'drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff)' } : null) }}
    >
      <g className={animate ? 'm-bob' : undefined}>
        {BODY[name]({ e, animate, reveal, color, clipId })}
        <Fx p={name} e={e} animate={animate} />
      </g>
    </svg>
  );
}
