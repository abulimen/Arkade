import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@/shared/types';
import { Room, hashKey } from '@/server/rooms/Room';
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

  it('live restore preserves connected, lastSeenAt, rev, historyRecorded and does not auto-pause expired timers', () => {
    const { room, bots, clock } = mkRoom('what-came-first', 2);
    bots[0].lastSeenAt = clock.t;
    room.historyRecorded = true;
    room.mcAction('START');
    const revBefore = room.rev;
    clock.adv(10 * 60_000);
    const snap = JSON.parse(JSON.stringify(room.toSnapshot()));
    room.close();
    const live = Room.restore(snap, { now: () => clock.t, live: true });
    expect(live.players[bots[0].id].connected).toBe(true);
    expect(live.players[bots[0].id].lastSeenAt).toBe(clock.t - 10 * 60_000);
    expect(live.rev).toBe(revBefore);
    expect(live.historyRecorded).toBe(true);
    expect(live.status()).toBe('playing');
    expect(live.advanceDueTimers()).toBe(true);
    expect(live.game.phase.name).toBe('order');
    expect(live.advanceDueTimers()).toBe(false);
    live.close();
  });

  it('live round-trips mark dirty and preserve PAUSE, RESUME, ADD_TIME, SKIP, KICK, BAN, SOUND, and join', () => {
    const { room, bots, clock } = mkRoom('what-came-first', 3);
    const roundTrip = (r: Room) => {
      expect(r.dirty).toBe(true);
      const snap = JSON.parse(JSON.stringify(r.toSnapshot()));
      r.close();
      return Room.restore(snap, { now: () => clock.t, live: true });
    };

    room.mcAction('START');
    let cur = roundTrip(room);
    cur.mcAction('PAUSE');
    expect(cur.status()).toBe('paused');
    cur = roundTrip(cur);
    expect(cur.status()).toBe('paused');

    cur.mcAction('RESUME');
    cur = roundTrip(cur);
    expect(cur.status()).toBe('playing');

    const prevEnds = cur.game.phase.endsAt as number;
    cur.mcAction('ADD_TIME', { seconds: 20 });
    cur = roundTrip(cur);
    expect(cur.game.phase.endsAt).toBe(prevEnds + 20_000);

    cur.mcAction('SKIP');
    cur = roundTrip(cur);
    expect(cur.game.phase.name).toBe('order');

    cur.mcAction('SOUND', { on: false, volume: 0.3 });
    cur = roundTrip(cur);
    expect(cur.sound).toEqual({ on: false, volume: 0.3 });

    cur.mcAction('KICK', { playerId: bots[0].id });
    cur = roundTrip(cur);
    expect(cur.players[bots[0].id]).toBeUndefined();

    cur.mcAction('BAN', { playerId: bots[1].id });
    cur = roundTrip(cur);
    expect(cur.banned.has(bots[1].token)).toBe(true);
    expect(cur.join({ nickname: 'Bot2', token: bots[1].token })).toEqual({ error: 'BANNED' });

    const lateJoin = cur.join({ nickname: 'Latecomer' });
    expect('player' in lateJoin).toBe(true);
    cur = roundTrip(cur);
    if ('player' in lateJoin) expect(cur.players[lateJoin.player.id]?.nickname).toBe('Latecomer');
    cur.close();
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

describe('pre-game launch countdown', () => {
  it('START enters countdown for default 7s, blocks gameplay actions, and advances straight into round 1 at +7000ms', () => {
    const clock = { t: 1_000_000, adv(ms: number) { this.t += ms; } };
    // Verify Room defaults skipCountdown to false when omitted
    const room = new Room('CNTD', 'what-came-first', { ...DEFAULT_CONFIG }, hashKey('host-key'), { now: () => clock.t, seed: 7, live: true });
    const p1 = room.join({ nickname: 'Alice' });
    const p2 = room.join({ nickname: 'Bob' });
    if ('error' in p1 || 'error' in p2) throw new Error('join failed');
    p1.player.connected = true;
    p2.player.connected = true;

    expect(room.mcAction('START')).toEqual({ ok: true });
    expect(room.game).toBeNull();
    expect(room.countdown).not.toBeNull();
    expect(room.status()).toBe('playing');
    expect(room.currentEndsAt()).toBe(clock.t + 7000);

    const sv = room.viewFor({ role: 'screen' });
    const pv = room.viewFor({ role: 'player', playerId: p1.player.id });
    const mv = room.viewFor({ role: 'mc' });
    for (const v of [sv, pv, mv]) {
      expect(v.phase).toBe('countdown');
      expect(v.status).toBe('playing');
      expect(v.endsAt).toBe(clock.t + 7000);
      expect(v.pausedMs).toBeNull();
      expect(v.round).toBeNull();
      expect(v.rounds).toBeNull();
      expect(v.data).toEqual({ countdownSec: 7, totalPlayers: 2, stageCount: 2 });
    }
    expect(mv.mc?.hint).toBe('hint.countdown');
    expect(mv.mc?.controls).toEqual(['PAUSE', 'SKIP']);

    // Rejects player gameplay actions & rerolls during countdown, allows PING, prevents double START
    expect(act(room, p1.player, 'LOCK', { order: [] })).toEqual({ ok: false, error: 'PHASE' });
    expect(act(room, p1.player, 'REROLL', {})).toEqual({ ok: false, error: 'NO_REROLL' });
    expect(act(room, p1.player, 'PING', { rtt: 42 })).toEqual({ ok: true });
    expect(room.mcAction('START')).toEqual({ ok: false, error: 'STARTED' });

    // Before 7000ms, timer does not fire
    clock.adv(6999);
    expect(room.advanceDueTimers()).toBe(false);
    expect(room.game).toBeNull();
    expect(room.viewFor({ role: 'screen' }).phase).toBe('countdown');

    // Exactly at +7000ms, transitions straight into round 1
    clock.adv(1);
    expect(room.advanceDueTimers()).toBe(true);
    expect(room.countdown).toBeNull();
    expect(room.game).not.toBeNull();
    expect(room.game.round).toBe(1);
    expect(room.game.phase.name).toBe('prompt');
    expect(room.viewFor({ role: 'screen' }).phase).toBe('prompt');
    expect(room.viewFor({ role: 'screen' }).round).toBe(1);
    room.close();
  });

  it('supports PAUSE, RESUME, ADD_TIME, and SKIP on countdown (including custom countdownSec and stage selection)', () => {
    const { room, bots, clock } = mkRoom('spot-the-wolf', 6, { countdownSec: 12 }, 7, { skipCountdown: false });
    const pickedStage = bots.slice(0, 4).map((b) => b.id);
    expect(room.mcAction('START', { stage: pickedStage })).toEqual({ ok: true });
    expect(room.viewFor({ role: 'screen' }).data).toEqual({ countdownSec: 12, totalPlayers: 6, stageCount: 4 });
    expect(room.countdown?.phase.endsAt).toBe(clock.t + 12_000);

    clock.adv(3000);
    expect(room.mcAction('PAUSE')).toEqual({ ok: true });
    expect(room.status()).toBe('paused');
    expect(room.currentEndsAt()).toBeNull();
    expect(room.viewFor({ role: 'screen' }).pausedMs).toBe(9000);
    expect(room.viewFor({ role: 'screen' }).endsAt).toBeNull();
    expect(act(room, bots[0], 'CLUE', { text: 'ark' })).toEqual({ ok: false, error: 'PHASE' });

    clock.adv(25_000);
    expect(room.mcAction('RESUME')).toEqual({ ok: true });
    expect(room.status()).toBe('playing');
    expect(room.countdown?.phase.endsAt).toBe(clock.t + 9000);

    expect(room.mcAction('ADD_TIME', { seconds: 5 })).toEqual({ ok: true });
    expect(room.countdown?.phase.endsAt).toBe(clock.t + 14_000);

    // SKIP launches immediately and applies stage roles
    expect(room.mcAction('SKIP')).toEqual({ ok: true });
    expect(room.countdown).toBeNull();
    expect(room.game).not.toBeNull();
    expect(room.game.round).toBe(1);
    expect(room.game.phase.name).toBe('reveal');
    expect(bots.slice(0, 4).every((b) => b.role === 'player')).toBe(true);
    expect(bots.slice(4).every((b) => b.role === 'spectator')).toBe(true);
    room.close();
  });

  it('snapshot round-trips preserve active and paused countdown state across live and non-live restores', () => {
    const { room, clock } = mkRoom('fake-verse', 3, { countdownSec: 7 }, 7, { live: true, skipCountdown: false });
    expect(room.mcAction('START')).toEqual({ ok: true });
    clock.adv(2000);

    // Live round-trip while running
    const snap1 = JSON.parse(JSON.stringify(room.toSnapshot()));
    room.close();
    const live1 = Room.restore(snap1, { now: () => clock.t, live: true });
    expect(live1.game).toBeNull();
    expect(live1.countdown).not.toBeNull();
    expect(live1.status()).toBe('playing');
    expect(live1.viewFor({ role: 'screen' }).phase).toBe('countdown');
    expect(live1.currentEndsAt()).toBe(snap1.countdown.phase.endsAt);

    // Pause, round-trip again, resume, then advance past remaining 5000ms
    expect(live1.mcAction('PAUSE')).toEqual({ ok: true });
    const snap2 = JSON.parse(JSON.stringify(live1.toSnapshot()));
    live1.close();
    const live2 = Room.restore(snap2, { now: () => clock.t, live: true });
    expect(live2.status()).toBe('paused');
    expect(live2.viewFor({ role: 'screen' }).pausedMs).toBe(5000);

    clock.adv(20_000);
    expect(live2.advanceDueTimers()).toBe(false);
    expect(live2.mcAction('RESUME')).toEqual({ ok: true });
    expect(live2.countdown?.phase.endsAt).toBe(clock.t + 5000);

    clock.adv(5000);
    expect(live2.advanceDueTimers()).toBe(true);
    expect(live2.countdown).toBeNull();
    expect(live2.game.round).toBe(1);
    expect(live2.game.phase.name).toBe('prompt');
    live2.close();

    // Non-live restore pauses an expired countdown instead of auto-launching
    clock.adv(20_000);
    const expired = Room.restore(snap1, { now: () => clock.t });
    expect(expired.status()).toBe('paused');
    expect(expired.game).toBeNull();
    expect(expired.countdown).not.toBeNull();
    expired.mcAction('RESUME');
    expect(expired.status()).toBe('playing');
    expired.close();
  });
});
