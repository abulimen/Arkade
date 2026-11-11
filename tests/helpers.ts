import { DEFAULT_CONFIG } from '@/shared/types';
import type { GameConfig, GameId, Player, View } from '@/shared/types';
import { Room, hashKey } from '@/server/rooms/Room';

export function mkRoom(gameId: GameId, n: number, cfg: Partial<GameConfig> = {}, seed = 7) {
  const clock = { t: 1_000_000, now() { return this.t; }, adv(ms: number) { this.t += ms; } };
  const room = new Room('TEST', gameId, { ...DEFAULT_CONFIG, ...cfg }, hashKey('host-key'), { now: () => clock.t, seed });
  const bots: Player[] = [];
  for (let i = 0; i < n; i++) {
    const r = room.join({ nickname: `Bot${i + 1}` });
    if ('error' in r) throw new Error(r.error);
    r.player.connected = true;
    bots.push(r.player);
  }
  return { room, clock, bots };
}

export const act = (room: Room, p: Player, type: string, payload: unknown, at?: number) => room.playerAction(p.token, type, payload, at ?? room.ctx().now());
export const skip = (room: Room) => room.mcAction('SKIP');
export const views = (room: Room, bots: Player[]) => ({
  screen: room.viewFor({ role: 'screen' }) as View,
  mc: room.viewFor({ role: 'mc' }) as View,
  players: bots.map((b) => room.viewFor({ role: 'player', playerId: b.id }) as View),
});
export const j = (v: unknown) => JSON.stringify(v);
