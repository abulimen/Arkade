import { describe, expect, it } from 'vitest';
import { Room } from '@/server/rooms/Room';
import { mkRoom, act, j } from './helpers';
import type { Sub } from '@/server/rooms/Room';

const sub = (role: Sub['role'], playerId?: string) => {
  const events: { event: string; data: string }[] = [];
  const s: Sub = { id: Math.random().toString(), role, playerId, last: '', send: (event, data) => events.push({ event, data }), close: () => events.push({ event: 'close', data: '' }) };
  return { s, events };
};

describe('rooms and joining', () => {
  it('uniquifies nicknames, filters bad ones, enforces length', () => {
    const { room } = mkRoom('what-came-first', 0);
    const n = (nickname: string) => room.join({ nickname });
    expect('player' in n('Ada') && (n('Ada') as { player: { nickname: string } }).player.nickname).toBe('Ada 2');
    expect(n('a')).toEqual({ error: 'NAME_SHORT' });
    expect(n('fuck')).toEqual({ error: 'NAME_BAD' });
    expect(n('Admin')).toEqual({ error: 'NAME_BAD' });
    const long = n('A'.repeat(40));
    expect('player' in long && long.player.nickname.length).toBe(16);
    room.close();
  });

  it('a device rejoins with its token as the same player with the same score (FR-7)', () => {
    const { room, bots } = mkRoom('what-came-first', 2);
    room.mcAction('START');
    room.mcAction('SKIP');
    const truth = room.game.plan[0].events.map((e: { id: string }) => e.id);
    act(room, bots[0], 'LOCK', { order: truth });
    const again = room.join({ nickname: 'whatever', token: bots[0].token });
    expect('player' in again && again.player.id).toBe(bots[0].id);
    expect(room.order.length).toBe(2);
    room.close();
  });

  it('kicked devices can rejoin, banned devices cannot (FR-8)', () => {
    const { room, bots } = mkRoom('fake-verse', 3);
    const a = sub('player', bots[0].id);
    room.attach(a.s);
    room.mcAction('KICK', { playerId: bots[0].id });
    expect(a.events.some((e) => e.event === 'kicked')).toBe(true);
    room.mcAction('BAN', { playerId: bots[1].id });
    expect(room.join({ nickname: 'Bot2', token: bots[1].token })).toEqual({ error: 'BANNED' });
    expect(Object.keys(room.players).length).toBe(1);
    room.close();
  });

  it('enforces the host key with a hash and capacity', () => {
    const { room } = mkRoom('who-am-i', 0);
    expect(room.verifyHostKey('host-key')).toBe(true);
    expect(room.verifyHostKey('nope')).toBe(false);
    expect(j(room.toSnapshot())).not.toContain('"host-key"');
    room.close();
  });

  it('late join rules follow the game (FR-9)', () => {
    const q = mkRoom('who-am-i', 1);
    q.room.mcAction('START');
    const r1 = q.room.join({ nickname: 'Late' });
    expect('player' in r1 && r1.player.role).toBe('player');
    const g = mkRoom('gideons-300', 3);
    g.room.mcAction('START');
    const r2 = g.room.join({ nickname: 'Late' });
    expect('player' in r2 && r2.player.role).toBe('spectator');
    q.room.close(); g.room.close();
  });

  it('team-device mode keeps team colours and shapes in order', () => {
    const { room } = mkRoom('what-came-first', 0, { mode: 'team' });
    const t = [1, 2, 3].map((i) => room.join({ nickname: `Team ${i}`, kind: 'team', teamSize: 4 }));
    expect(t.map((x) => ('player' in x ? x.player.color : -1))).toEqual([0, 1, 2]);
    const ind = mkRoom('what-came-first', 0, { mode: 'individual' });
    const x = ind.room.join({ nickname: 'Team X', kind: 'team' });
    expect('player' in x && x.player.kind).toBe('individual');
    room.close(); ind.room.close();
  });
});

describe('control, pause and views', () => {
  it('pause stores remaining time, blocks player actions, resume recomputes endsAt, add time extends', () => {
    const { room, bots, clock } = mkRoom('what-came-first', 2);
    room.mcAction('START');
    const ends = room.game.phase.endsAt;
    clock.adv(4000);
    room.mcAction('PAUSE');
    expect(room.status()).toBe('paused');
    expect(room.game.phase.paused.remainingMs).toBe(ends - clock.t);
    expect(act(room, bots[0], 'LOCK', { order: [] }).error).toBe('PAUSED');
    clock.adv(60000);
    room.mcAction('RESUME');
    expect(room.game.phase.endsAt).toBe(clock.t + (ends - (clock.t - 60000)));
    const e2 = room.game.phase.endsAt;
    room.mcAction('ADD_TIME', { seconds: 15 });
    expect(room.game.phase.endsAt).toBe(e2 + 15000);
    expect(room.viewFor({ role: 'screen' }).status).toBe('playing');
    room.close();
  });

  it('streams only the audience view and skips unchanged views', async () => {
    const { room, bots } = mkRoom('fake-verse', 3);
    const screen = sub('screen');
    const player = sub('player', bots[0].id);
    const mc = sub('mc');
    [screen.s, player.s, mc.s].forEach((x) => room.attach(x));
    expect(j(JSON.parse(screen.events[0].data))).not.toContain('"token"');
    expect(JSON.parse(player.events[0].data).me.id).toBe(bots[0].id);
    expect(JSON.parse(mc.events[0].data).mc.players.length).toBe(3);
    expect(JSON.parse(screen.events[0].data).mc).toBeUndefined();
    const n = player.events.length;
    room.touch(true); // nothing changed in the view
    expect(player.events.length).toBe(n);
    room.mcAction('START');
    expect(player.events.length).toBe(n + 1);
    for (const e of [...screen.events, ...player.events]) expect(e.data).not.toContain(bots[0].token);
    room.close();
  });

  it('casting lots highlights the chosen phones (FR-28, FR-33)', () => {
    const { room, bots } = mkRoom('spot-the-wolf', 8);
    room.mcAction('CAST_LOTS', { n: 3 });
    const chosen = new Set(room.spotlight!.ids);
    const flags = bots.map((b) => room.viewFor({ role: 'player', playerId: b.id }).me!.spotlighted);
    expect(flags.filter(Boolean).length).toBe(3);
    bots.forEach((b, i) => expect(flags[i]).toBe(chosen.has(b.id)));
    expect(room.viewFor({ role: 'screen' }).spotlight?.players.length).toBe(3);
    room.close();
  });

  it('the projector never lists the bottom of the ranking', () => {
    const { room, bots } = mkRoom('what-came-first', 12);
    room.mcAction('START');
    room.mcAction('SKIP');
    const truth = room.game.plan[0].events.slice().sort((a: { order: number }, b: { order: number }) => a.order - b.order).map((e: { id: string }) => e.id);
    bots.slice(0, 11).forEach((b) => act(room, b, 'LOCK', { order: truth })); // Bot12 never locks in
    room.mcAction('SKIP');
    expect(room.game.phase.name).toBe('reveal');
    const v = room.viewFor({ role: 'screen' });
    expect(v.top5?.length).toBe(5);
    expect(j(v)).not.toContain('Bot12"');
    room.close();
  });
});

describe('snapshots (restart recovery)', () => {
  it('restores a mid-game room; players rejoin with tokens; timers resume or wait for the MC', () => {
    const { room, bots, clock } = mkRoom('what-came-first', 3);
    room.mcAction('START');
    room.mcAction('SKIP');
    const truth = room.game.plan[0].events.map((e: { id: string }) => e.id);
    act(room, bots[0], 'LOCK', { order: truth });
    const snap = JSON.parse(JSON.stringify(room.toSnapshot()));
    room.close();
    const back = Room.restore(snap, { now: () => clock.t });
    expect(back.game.phase.name).toBe('order');
    expect(back.game.locks[bots[0].id]).toBeDefined();
    expect(back.verifyHostKey('host-key')).toBe(true);
    const again = back.join({ nickname: 'x', token: bots[0].token });
    expect('player' in again && again.player.id).toBe(bots[0].id);
    expect(Object.values(back.players).every((p) => !p.connected)).toBe(true);
    back.close();
    clock.adv(10 * 60_000);
    const late = Room.restore(snap, { now: () => clock.t });
    expect(late.status()).toBe('paused');
    late.mcAction('RESUME');
    expect(late.status()).toBe('playing');
    late.close();
  });
});

describe('scale', () => {
  it('300 bots join and answer a Gideon question; views stay small', () => {
    const { room, bots } = mkRoom('gideons-300', 300);
    room.mcAction('START');
    room.mcAction('SKIP');
    const t0 = performance.now();
    bots.forEach((b, i) => act(room, b, 'ANSWER', { choice: i % 4 }));
    const dt = performance.now() - t0;
    expect(room.game.phase.name).toBe('s1r');
    expect(dt).toBeLessThan(3000);
    const p = j(room.viewFor({ role: 'player', playerId: bots[0].id }));
    const s = j(room.viewFor({ role: 'screen' }));
    expect(p.length).toBeLessThan(2048);
    expect(s.length).toBeLessThan(8192);
    room.close();
  });
});
