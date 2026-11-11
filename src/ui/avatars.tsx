import { AVATAR_NAMES, RAINBOW } from '@/shared/types';

// 24 passenger avatars on a 96 x 96 canvas. Eyes sit at the same height across the set so they read as one family.
type S = ['c', number, number, number, string] | ['e', number, number, number, number, string] | ['p', string, string];
const N = '#14123B';
const A: Record<(typeof AVATAR_NAMES)[number], { skin: string; back?: S[]; front?: S[] }> = {
  lamb: { skin: '#F4F1FF', back: [['c', 26, 40, 12, '#F4F1FF'], ['c', 70, 40, 12, '#F4F1FF'], ['c', 36, 26, 11, '#F4F1FF'], ['c', 60, 26, 11, '#F4F1FF'], ['c', 48, 22, 12, '#F4F1FF']], front: [['e', 48, 60, 11, 8, '#C9C2E8']] },
  lion: { skin: '#FFC83D', back: [['c', 48, 52, 40, '#C98A4B']], front: [['c', 34, 30, 7, '#FFC83D'], ['c', 62, 30, 7, '#FFC83D'], ['e', 48, 62, 12, 9, '#FFD58A']] },
  camel: { skin: '#E0B070', back: [['e', 30, 28, 8, 12, '#E0B070'], ['e', 66, 28, 8, 12, '#E0B070']], front: [['e', 48, 64, 15, 11, '#F2D3A0']] },
  elephant: { skin: '#9AA7BD', back: [['e', 22, 50, 14, 20, '#9AA7BD'], ['e', 74, 50, 14, 20, '#9AA7BD']], front: [['p', 'M42 58 Q48 86 56 80 Q60 76 54 74 Q52 66 54 58Z', '#9AA7BD']] },
  giraffe: { skin: '#FFD58A', back: [['e', 32, 24, 7, 11, '#FFD58A']], front: [['c', 38, 24, 4, '#C98A4B'], ['c', 58, 24, 4, '#C98A4B'], ['c', 60, 38, 5, '#C98A4B'], ['e', 48, 64, 13, 9, '#F2B866']] },
  zebra: { skin: '#FFFFFF', front: [['p', 'M32 28 L40 36 M48 22 V34 M64 28 L56 36', '#14123B'], ['e', 48, 64, 12, 9, '#C9C2E8']] },
  donkey: { skin: '#A9B4C4', back: [['e', 30, 20, 7, 18, '#A9B4C4'], ['e', 66, 20, 7, 18, '#A9B4C4']], front: [['e', 48, 64, 14, 10, '#F4F1FF']] },
  ox: { skin: '#C98A4B', back: [['p', 'M22 34 Q14 22 24 18 M74 34 Q82 22 72 18', '#F4F1FF']], front: [['e', 48, 66, 14, 10, '#FFD58A'], ['c', 43, 66, 2, N], ['c', 53, 66, 2, N]] },
  goat: { skin: '#F4F1FF', back: [['p', 'M34 30 Q28 12 38 10 M62 30 Q68 12 58 10', '#C98A4B']], front: [['p', 'M42 74 L48 90 L54 74Z', '#F4F1FF']] },
  ram: { skin: '#E8D3B0', back: [['c', 22, 44, 14, '#C98A4B'], ['c', 74, 44, 14, '#C98A4B']], front: [['e', 48, 64, 12, 9, '#F4F1FF']] },
  bear: { skin: '#A9692F', back: [['c', 28, 28, 10, '#A9692F'], ['c', 68, 28, 10, '#A9692F']], front: [['e', 48, 64, 13, 10, '#D9A066']] },
  deer: { skin: '#D9A066', back: [['p', 'M32 26 L24 8 M32 18 L22 16 M64 26 L72 8 M64 18 L74 16', '#C98A4B']], front: [['e', 48, 64, 12, 9, '#F2D3A0']] },
  rabbit: { skin: '#F4F1FF', back: [['e', 36, 14, 7, 20, '#F4F1FF'], ['e', 60, 14, 7, 20, '#F4F1FF']], front: [['e', 36, 14, 3, 13, '#FF8FA0'], ['e', 60, 14, 3, 13, '#FF8FA0']] },
  hedgehog: { skin: '#D9A066', back: [['p', 'M14 56 L20 28 L32 40 L40 18 L50 34 L60 16 L66 36 L78 26 L82 56Z', '#A9692F']], front: [['e', 48, 64, 14, 10, '#F2D3A0']] },
  turtle: { skin: '#8FD6A8', back: [['c', 48, 20, 16, '#3DD68C']], front: [['c', 48, 18, 5, '#25A868']] },
  owl: { skin: '#C98A4B', back: [['p', 'M24 30 L28 12 L42 26Z M72 30 L68 12 L54 26Z', '#C98A4B']], front: [['c', 36, 46, 12, '#FFD58A'], ['c', 60, 46, 12, '#FFD58A'], ['p', 'M44 56 L52 56 L48 64Z', '#FF9A3D']] },
  frog: { skin: '#3DD68C', back: [['c', 32, 28, 11, '#3DD68C'], ['c', 64, 28, 11, '#3DD68C']], front: [['p', 'M32 66 Q48 76 64 66', N]] },
  fish: { skin: '#3DB8FF', back: [['p', 'M10 52 L26 40 V64Z M86 52 L70 40 V64Z', '#FF9A3D']], front: [['p', 'M46 66 Q48 70 50 66', N]] },
  dove: { skin: '#FFFFFF', back: [['e', 22, 52, 10, 18, '#F4F1FF'], ['e', 74, 52, 10, 18, '#F4F1FF']], front: [['p', 'M42 58 L54 58 L48 68Z', '#FF9A3D']] },
  duck: { skin: '#FFE14D', front: [['e', 48, 64, 16, 8, '#FF9A3D']] },
  mouse: { skin: '#C9C2E8', back: [['c', 26, 26, 14, '#C9C2E8'], ['c', 70, 26, 14, '#C9C2E8']], front: [['c', 26, 26, 8, '#FF8FA0'], ['c', 70, 26, 8, '#FF8FA0'], ['c', 48, 62, 4, '#FF8FA0']] },
  fox: { skin: '#FF9A3D', back: [['p', 'M22 40 L24 12 L44 28Z M74 40 L72 12 L52 28Z', '#FF9A3D']], front: [['p', 'M26 60 L44 66 L30 78Z M70 60 L52 66 L66 78Z', '#FFFFFF'], ['p', 'M23 36 L25 20 L36 28Z M73 36 L71 20 L60 28Z', '#FF5C6C']] },
  cat: { skin: '#FFC83D', back: [['p', 'M24 40 L26 14 L44 28Z M72 40 L70 14 L52 28Z', '#FFC83D']], front: [['p', 'M20 62 H34 M20 68 L34 66 M76 62 H62 M76 68 L62 66', N]] },
  dog: { skin: '#E0B070', back: [['e', 22, 40, 10, 20, '#A9692F'], ['e', 74, 40, 10, 20, '#A9692F']], front: [['e', 48, 64, 14, 10, '#F2D3A0']] },
};

function Shapes({ s }: { s?: S[] }) {
  return (
    <>
      {s?.map((x, i) =>
        x[0] === 'c' ? <circle key={i} cx={x[1]} cy={x[2]} r={x[3]} fill={x[4]} stroke={N} strokeWidth={4} />
        : x[0] === 'e' ? <ellipse key={i} cx={x[1]} cy={x[2]} rx={x[3]} ry={x[4]} fill={x[5]} stroke={N} strokeWidth={4} />
        : <path key={i} d={x[1]} fill={x[2] === N ? 'none' : x[2]} stroke={x[2] === N ? N : N} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />,
      )}
    </>
  );
}

/** Circular passenger avatar on the player's rainbow colour. */
export function Avatar({ avatar, color, size = 48, label }: { avatar: number; color: number; size?: number; label?: string }) {
  const a = A[AVATAR_NAMES[((avatar % 24) + 24) % 24]];
  const id = `av${avatar}-${color}`;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ flex: 'none' }}>
      <defs><clipPath id={id}><circle cx="48" cy="48" r="48" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <rect width="96" height="96" fill={RAINBOW[((color % 6) + 6) % 6]} />
        <g transform="translate(0 6)">
          <Shapes s={a.back} />
          <circle cx="48" cy="52" r="28" fill={a.skin} stroke={N} strokeWidth={4} />
          <Shapes s={a.front} />
          <circle cx="38" cy="46" r="5" fill={N} />
          <circle cx="58" cy="46" r="5" fill={N} />
          <circle cx="39.6" cy="44.4" r="1.6" fill="#fff" />
          <circle cx="59.6" cy="44.4" r="1.6" fill="#fff" />
          <ellipse cx="48" cy="57" rx="3.4" ry="2.4" fill={N} />
        </g>
      </g>
    </svg>
  );
}

export const animalName = (i: number) => AVATAR_NAMES[((i % 24) + 24) % 24];
