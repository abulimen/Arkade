import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentType } from 'react';
import type { GameId, View } from '@/shared/types';
import { GAME_IDS } from '@/shared/types';
import { act, mkRoom, skip } from './helpers';
import type { Player } from '@/shared/types';
import type { Room } from '@/server/rooms/Room';
import { MASCOT_NAMES, CORE_EXPRESSIONS, MascotView } from '@/ui/mascots';
import { Avatar } from '@/ui/avatars';
import { AVATAR_NAMES } from '@/shared/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
import WcfP from '@/features/games/what-came-first/Player'; import WcfS from '@/features/games/what-came-first/Screen'; import WcfM from '@/features/games/what-came-first/Mc';
import FvP from '@/features/games/fake-verse/Player'; import FvS from '@/features/games/fake-verse/Screen'; import FvM from '@/features/games/fake-verse/Mc';
import G3P from '@/features/games/gideons-300/Player'; import G3S from '@/features/games/gideons-300/Screen'; import G3M from '@/features/games/gideons-300/Mc';
import WoP from '@/features/games/spot-the-wolf/Player'; import WoS from '@/features/games/spot-the-wolf/Screen'; import WoM from '@/features/games/spot-the-wolf/Mc';
import WaP from '@/features/games/who-am-i/Player'; import WaS from '@/features/games/who-am-i/Screen'; import WaM from '@/features/games/who-am-i/Mc';

const UI: Record<GameId, { P: ComponentType<any>; S: ComponentType<any>; M: ComponentType<any> }> = {
  'what-came-first': { P: WcfP, S: WcfS, M: WcfM }, 'fake-verse': { P: FvP, S: FvS, M: FvM }, 'gideons-300': { P: G3P, S: G3S, M: G3M },
  'spot-the-wolf': { P: WoP, S: WoS, M: WoM }, 'who-am-i': { P: WaP, S: WaS, M: WaM },
};

const rnd = (n: number) => Math.floor(Math.random() * n);
/** One plausible action per phase so locked / voted / answered states render too. */
function poke(room: Room, bots: Player[], game: GameId) {
  for (const b of bots) {
    const v = room.viewFor({ role: 'player', playerId: b.id }) as View;
    const d = v.data, p = v.phase;
    if (game === 'what-came-first' && p === 'order' && d.cards) act(room, b, 'LOCK', { order: d.cards.map((c: any) => c.id) });
    if (game === 'fake-verse' && p === 'write') act(room, b, 'WRITE', { text: `lie ${b.nickname}` });
    if (game === 'fake-verse' && p === 'vote' && d.options?.length) act(room, b, 'VOTE', { target: d.options[0].id });
    if (game === 'who-am-i' && p.startsWith('clue') && d.options && b === bots[0]) act(room, b, 'ANSWER', { choice: d.options[rnd(d.options.length)] });
    if (game === 'gideons-300' && d.q && (p === 's1q' || p === 's2q')) act(room, b, 'ANSWER', { choice: rnd(4) });
    if (game === 'gideons-300' && p === 's3q' && d.role === 'finalist') act(room, b, 'BUZZ', { choice: rnd(4) });
    if (game === 'gideons-300' && p === 's3pre' && d.targets) act(room, b, 'PREDICT', { target: 'nobody' });
    if (game === 'spot-the-wolf') {
      if (d.myTurn) act(room, b, 'CLUE', { text: 'light' });
      if (p === 'vote' && d.suspects?.length) act(room, b, 'VOTE', { target: d.suspects[0].id });
      if (d.canGuess) act(room, b, 'GUESS', { text: 'nothing' });
    }
  }
}

describe.each(GAME_IDS)('render every phase of %s (server-side) without throwing', (game) => {
  it('player, spectator, screen and MC components render real views', () => {
    const { room, bots } = mkRoom(game, game === 'spot-the-wolf' ? 7 : 6, { audience: game === 'who-am-i' ? 'kids' : 'youth' });
    const { P, S, M } = UI[game];
    const seen = new Set<string>();
    expect(room.mcAction('START').ok).toBe(true);
    if (game === 'spot-the-wolf') room.join({ nickname: 'Late' }); // spectator
    const everyone = [...Object.values(room.players)];
    for (let i = 0; i < 400; i++) {
      const sv = room.viewFor({ role: 'screen' }) as View;
      const mv = room.viewFor({ role: 'mc' }) as View;
      seen.add(sv.phase);
      expect(renderToStaticMarkup(<S view={sv} />).length).toBeGreaterThan(20);
      expect(renderToStaticMarkup(<M view={mv} mc={async () => ({ ok: true })} />).length).toBeGreaterThan(10);
      for (const pl of everyone) {
        const pv = room.viewFor({ role: 'player', playerId: pl.id }) as View;
        expect(renderToStaticMarkup(<P view={pv} send={async () => ({ ok: true })} notify={() => undefined} />).length).toBeGreaterThan(10);
      }
      if (sv.phase === 'end') break;
      if (i % 2 === 0) poke(room, bots, game);
      skip(room);
    }
    expect(seen.has('end')).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(3);
    room.close();
  });
});

describe('mascots and avatars', () => {
  it('7 mascots x 7 core expressions render with stable ids, labels and under ~3.5 KB', () => {
    for (const name of MASCOT_NAMES) {
      for (const e of CORE_EXPRESSIONS) {
        const svg = renderToStaticMarkup(<MascotView name={name} expression={e} decorative={false} />);
        expect(svg).toContain(`id="${name}-eyes"`);
        expect(svg).toContain(`id="${name}-mouth"`);
        expect(svg).toContain(`id="${name}-fx"`);
        expect(svg).toContain(`id="${name}-shadow"`);
        expect(svg).toContain('role="img"');
        expect(svg).not.toContain('<text');
        expect(svg.length, `${name}/${e}`).toBeLessThan(5200);
      }
      expect(renderToStaticMarkup(<MascotView name={name} animate={false} />)).not.toContain('m-bob');
      expect(renderToStaticMarkup(<MascotView name={name} />)).toContain('m-bob');
      expect(renderToStaticMarkup(<MascotView name={name} />)).toContain('m-blink');
    }
  });
  it('24 avatars render under 1.2 KB each', () => {
    expect(AVATAR_NAMES.length).toBe(24);
    for (let i = 0; i < 24; i++) expect(renderToStaticMarkup(<Avatar avatar={i} color={i % 6} />).length, AVATAR_NAMES[i]).toBeLessThan(1700);
  });
});
