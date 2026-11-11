import crypto from 'node:crypto';
import { AVATAR_NAMES, GAME_META } from '@/shared/types';
import type { GameConfig, GameId, McInfo, MyInfo, Player, PlayerPublic, RankEntry, RoomStatus, View } from '@/shared/types';
import { Rng } from '../engine/rng';
import { END, addTime, mkPhase, pausePhase, rankByScore, resumePhase } from '../engine/kit';
import type { GAction, GameCtx, GameModule } from '../engine/kit';
import { cleanText, isBlocked, isReserved } from '../engine/text';
import type { Content } from '../content';
import { getContent } from '../content';
import { GAMES } from '../games/registry';

export interface Sub {
  id: string;
  role: 'screen' | 'player' | 'mc';
  playerId?: string;
  send(event: string, data: string): void;
  close(): void;
  last: string;
}

export interface RoomOpts {
  maxPlayers?: number;
  content?: Content;
  now?: () => number;
  seed?: number;
}

export interface Snapshot {
  v: 1;
  code: string;
  gameId: GameId;
  config: GameConfig;
  hostKeyHash: string;
  players: Record<string, Player>;
  order: string[];
  banned: string[];
  game: unknown;
  rev: number;
  rngState: number;
  createdAt: number;
  lastActivityAt: number;
  spotlight: { ids: string[]; at: number } | null;
  sound: { on: boolean; volume: number };
  savedAt: number;
}

export const hashKey = (k: string) => crypto.createHash('sha256').update(k).digest('hex');
const rint = (n: number) => crypto.randomInt(n);
const pub = (p: Player): PlayerPublic => ({ id: p.id, nickname: p.nickname, avatar: p.avatar, color: p.color, kind: p.kind, teamSize: p.teamSize });

export class Room {
  code: string;
  gameId: GameId;
  config: GameConfig;
  hostKeyHash: string;
  players: Record<string, Player> = {};
  order: string[] = [];
  banned = new Set<string>();
  game: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  rev = 0;
  createdAt: number;
  lastActivityAt: number;
  closed = false;
  closedAt = 0;
  rng: Rng;
  subs = new Set<Sub>();
  spotlight: { ids: string[]; at: number } | null = null;
  sound = { on: true, volume: 0.7 };
  rtts: Record<string, number> = {};
  dirty = false;
  persist: ((urgent: boolean) => void) | null = null;
  onClose: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private rankMemo: { rev: number; ids: string[]; idx: Map<string, number> } | null = null;
  private now: () => number;
  private content: Content;
  private maxPlayers: number;

  constructor(code: string, gameId: GameId, config: GameConfig, hostKeyHash: string, opts: RoomOpts = {}) {
    this.code = code;
    this.gameId = gameId;
    this.config = config;
    this.hostKeyHash = hostKeyHash;
    this.now = opts.now ?? Date.now;
    this.content = opts.content ?? getContent();
    this.maxPlayers = opts.maxPlayers ?? 500;
    this.rng = new Rng(opts.seed ?? crypto.randomInt(1, 2 ** 31 - 1));
    this.createdAt = this.lastActivityAt = this.now();
  }

  get module(): GameModule { return GAMES[this.gameId]; }

  ctx(): GameCtx {
    return { now: this.now, rng: this.rng, players: this.players, content: this.content, config: this.config };
  }

  status(): RoomStatus {
    if (this.closed) return 'closed';
    if (!this.game) return 'lobby';
    if (this.game.phase.name === END) return 'results';
    return this.game.phase.paused ? 'paused' : 'playing';
  }

  verifyHostKey(key: string): boolean {
    const a = Buffer.from(hashKey(key));
    const b = Buffer.from(this.hostKeyHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  // ---------- players ----------
  join(o: { nickname: string; avatar?: number; token?: string; kind?: 'individual' | 'team'; teamSize?: number }): { player: Player } | { error: string } {
    if (this.closed) return { error: 'ROOM_CLOSED' };
    if (o.token && this.banned.has(o.token)) return { error: 'BANNED' };
    if (o.token) {
      const known = Object.values(this.players).find((p) => p.token === o.token);
      if (known) {
        this.lastActivityAt = this.now();
        return { player: known };
      }
    }
    if (this.order.length >= this.maxPlayers) return { error: 'ROOM_FULL' };
    const raw = cleanText(o.nickname, 16);
    if (raw.length < 2) return { error: 'NAME_SHORT' };
    if (isBlocked(raw) || isReserved(raw)) return { error: 'NAME_BAD' };
    const taken = new Set(Object.values(this.players).map((p) => p.nickname.toLowerCase()));
    let nickname = raw;
    for (let n = 2; taken.has(nickname.toLowerCase()); n++) nickname = `${raw.slice(0, 16 - String(n).length - 1)} ${n}`;
    const team = o.kind === 'team' && this.config.mode === 'team';
    const teams = Object.values(this.players).filter((p) => p.kind === 'team').length;
    let id = '';
    do id = 'p' + crypto.randomBytes(3).toString('hex'); while (this.players[id]);
    const spectate = !!this.game && GAME_META[this.gameId].lateJoin === 'spectate';
    const p: Player = {
      id, token: crypto.randomBytes(16).toString('hex'), nickname, avatar: o.avatar ?? rint(AVATAR_NAMES.length), color: team ? teams % 6 : rint(6),
      kind: team ? 'team' : 'individual', teamSize: team ? o.teamSize : undefined, role: spectate ? 'spectator' : 'player', connected: false, rerolled: false, joinedAt: this.now(),
    };
    this.players[id] = p;
    this.order.push(id);
    this.lastActivityAt = this.now();
    this.touch(false);
    return { player: p };
  }

  private removePlayer(id: string, ban: boolean) {
    const p = this.players[id];
    if (!p) return false;
    if (ban) this.banned.add(p.token);
    for (const s of [...this.subs]) {
      if (s.playerId === id) {
        s.send('kicked', JSON.stringify({ code: ban ? 'BANNED' : 'KICKED' }));
        s.close();
        this.subs.delete(s);
      }
    }
    delete this.players[id];
    this.order = this.order.filter((x) => x !== id);
    return true;
  }

  attach(sub: Sub) {
    this.subs.add(sub);
    this.lastActivityAt = this.now();
    if (sub.playerId && this.players[sub.playerId] && !this.players[sub.playerId].connected) {
      this.players[sub.playerId].connected = true;
      this.touch(false);
    }
    const view = this.viewFor(sub);
    const { rev: _r, ...rest } = view;
    void _r;
    sub.last = JSON.stringify(rest);
    sub.send('view', JSON.stringify(view));
  }

  detach(sub: Sub) {
    this.subs.delete(sub);
    const id = sub.playerId;
    if (id && this.players[id] && ![...this.subs].some((s) => s.playerId === id)) {
      this.players[id].connected = false;
      this.touch(false);
    }
  }

  // ---------- state changes ----------
  private commit(next: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const prev = this.game;
    this.game = next;
    const changed = !prev || prev.phase.name !== next.phase.name || prev.phase.startedAt !== next.phase.startedAt || prev.round !== next.round;
    this.touch(changed);
    this.schedule();
    if (changed) this.persist?.(true);
  }

  /** Bump rev and push views (coalesced to 250 ms unless urgent). */
  touch(urgent: boolean) {
    this.rev++;
    this.dirty = true;
    this.rankMemo = null;
    if (urgent) this.flush();
    else if (!this.flushTimer) this.flushTimer = setTimeout(() => this.flush(), 250);
  }

  private flush() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    const cache = new Map<string, { key: string; json: string }>();
    for (const sub of this.subs) {
      let entry = sub.role === 'player' ? undefined : cache.get(sub.role);
      if (!entry) {
        const view = this.viewFor(sub);
        const { rev: _r, ...rest } = view;
        void _r;
        entry = { key: JSON.stringify(rest), json: JSON.stringify(view) };
        if (sub.role !== 'player') cache.set(sub.role, entry);
      }
      if (entry.key !== sub.last) {
        sub.last = entry.key;
        try { sub.send('view', entry.json); } catch { this.subs.delete(sub); }
      }
    }
  }

  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const g = this.game;
    if (this.closed || !g || g.phase.paused || g.phase.endsAt == null) return;
    const delay = Math.max(0, g.phase.endsAt - this.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      const cur = this.game;
      if (!cur || cur.phase.paused || cur.phase.endsAt == null) return;
      if (cur.phase.endsAt - this.now() > 50) return this.schedule();
      this.apply({ by: 'system', type: 'PHASE_TIMEOUT' });
    }, Math.min(delay, 2 ** 31 - 1));
  }

  apply(a: GAction): string | null {
    if (!this.game) return 'NOT_STARTED';
    const r = this.module.reduce(this.game, a, this.ctx());
    if (r.error) return r.error;
    if (r.state !== this.game) this.commit(r.state);
    return null;
  }

  // ---------- intents ----------
  playerAction(token: string, type: string, payload: any, receivedAt: number): { ok: boolean; error?: string } { // eslint-disable-line @typescript-eslint/no-explicit-any
    const p = Object.values(this.players).find((x) => x.token === token);
    if (!p) return { ok: false, error: 'UNKNOWN_PLAYER' };
    if (this.closed) return { ok: false, error: 'ROOM_CLOSED' };
    this.lastActivityAt = receivedAt;
    if (type === 'PING') {
      this.rtts[p.id] = Number(payload?.rtt) || 0;
      return { ok: true };
    }
    if (type === 'REROLL') {
      if (this.game || p.rerolled) return { ok: false, error: 'NO_REROLL' };
      p.avatar = (p.avatar + 1 + rint(AVATAR_NAMES.length - 1)) % AVATAR_NAMES.length;
      p.rerolled = true;
      this.touch(false);
      return { ok: true };
    }
    if (!this.game) return { ok: false, error: 'NOT_STARTED' };
    if (this.game.phase.paused) return { ok: false, error: 'PAUSED' };
    const err = this.apply({ by: 'player', playerId: p.id, type, payload, receivedAt });
    return err ? { ok: false, error: err } : { ok: true };
  }

  mcAction(type: string, payload: Record<string, unknown> = {}): { ok: boolean; error?: string } {
    if (this.closed) return { ok: false, error: 'ROOM_CLOSED' };
    this.lastActivityAt = this.now();
    const now = this.now();
    const g = this.game;
    switch (type) {
      case 'START': return this.start(payload);
      case 'PAUSE': case 'RESUME': case 'ADD_TIME': {
        if (!g) return { ok: false, error: 'NOT_STARTED' };
        const phase = type === 'PAUSE' ? pausePhase(g.phase, now) : type === 'RESUME' ? resumePhase(g.phase, now) : addTime(g.phase, Math.min(Math.max(Number(payload.seconds) || 15, 1), 120) * 1000);
        if (phase !== g.phase) this.commit({ ...g, phase });
        return { ok: true };
      }
      case 'SKIP': case 'HIDE_ANSWER': case 'NEXT': case 'REASK': {
        const err = this.apply({ by: 'mc', type, payload });
        return err ? { ok: false, error: err } : { ok: true };
      }
      case 'KICK': case 'BAN': {
        const ok = this.removePlayer(String(payload.playerId), type === 'BAN');
        if (ok) this.touch(true);
        return { ok };
      }
      case 'CAST_LOTS': {
        const pool = Object.values(this.players).filter((p) => p.role === 'player' && p.connected);
        const n = Math.min(Math.max(Math.floor(Number(payload.n) || 1), 1), 50, pool.length);
        if (!pool.length) return { ok: false, error: 'NO_PLAYERS' };
        this.spotlight = { ids: this.rng.sample(pool, n).map((p) => p.id), at: now };
        this.touch(true);
        return { ok: true };
      }
      case 'CLEAR_LOTS': this.spotlight = null; this.touch(true); return { ok: true };
      case 'SOUND':
        if (typeof payload.on === 'boolean') this.sound.on = payload.on;
        if (typeof payload.volume === 'number') this.sound.volume = Math.min(1, Math.max(0, payload.volume));
        this.touch(true);
        return { ok: true };
      case 'END':
        if (!g) this.close();
        else if (g.phase.name !== END) this.commit({ ...g, phase: mkPhase(END, now, null) });
        return { ok: true };
      case 'CLOSE': this.close(); return { ok: true };
      default: return { ok: false, error: 'UNKNOWN' };
    }
  }

  private start(payload: Record<string, unknown>) {
    if (this.game) return { ok: false, error: 'STARTED' };
    const meta = GAME_META[this.gameId];
    const eligible = Object.values(this.players).filter((p) => p.role === 'player');
    let stage: string[] | undefined;
    if (this.gameId === 'spot-the-wolf') {
      const asked = Array.isArray(payload.stage) ? (payload.stage as unknown[]).map(String) : this.spotlight?.ids;
      let ids = (asked ?? []).filter((id) => this.players[id]);
      if (ids.length < meta.minPlayers || ids.length > 10) ids = asked && asked.length ? ids : this.rng.sample(eligible.filter((p) => p.connected).map((p) => p.id), 10);
      if (ids.length < meta.minPlayers || ids.length > 10) return { ok: false, error: 'STAGE_SIZE' };
      stage = ids;
    } else if (eligible.filter((p) => p.connected).length < meta.minPlayers) return { ok: false, error: 'NEED_PLAYERS' };
    if (stage) for (const p of Object.values(this.players)) p.role = stage.includes(p.id) ? 'player' : 'spectator';
    this.spotlight = null;
    this.commit(this.module.createState(this.ctx(), { stage }));
    return { ok: true };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.closedAt = this.now();
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.flush();
    this.touch(true);
    for (const s of this.subs) { s.send('closed', '{}'); s.close(); }
    this.subs.clear();
    this.onClose?.();
  }

  // ---------- views ----------
  private ranking() {
    if (this.rankMemo && this.rankMemo.rev === this.rev) return this.rankMemo;
    const ids = this.game ? (this.module.rank ? this.module.rank(this.game, this.ctx()) : rankByScore(this.game, this.ctx())) : [];
    const idx = new Map(ids.map((id, i) => [id, i]));
    this.rankMemo = { rev: this.rev, ids, idx };
    return this.rankMemo;
  }

  private entry(id: string): RankEntry {
    const p = this.players[id];
    return { ...pub(p), score: Math.max(0, Math.round(this.game?.scores?.[id] ?? 0)) };
  }

  private mcInfo(hint: string, controls: string[]): McInfo {
    const all = Object.values(this.players);
    const connected = all.filter((p) => p.connected).length;
    const rt = Object.values(this.rtts).sort((a, b) => a - b);
    return {
      hint,
      controls,
      players: this.order.map((id) => this.players[id]).filter(Boolean).map((p) => [p.id, p.nickname, p.avatar, p.connected ? 1 : 0, p.role, p.kind]),
      diag: { connected, away: all.length - connected, medianRtt: rt.length ? rt[Math.floor(rt.length / 2)] : null },
    };
  }

  viewFor(sub: Pick<Sub, 'role' | 'playerId'>): View {
    const all = this.order.map((id) => this.players[id]).filter(Boolean);
    const g = this.game;
    const view: View = {
      rev: this.rev, room: this.code, gameId: this.gameId, status: this.status(), phase: 'lobby', endsAt: null, pausedMs: null, round: null, rounds: null,
      count: { total: all.length, connected: all.filter((p) => p.connected).length },
      config: { audience: this.config.audience, difficulty: this.config.difficulty, mode: this.config.mode, pace: this.config.pace },
      sound: this.sound, data: {},
    };
    if (this.spotlight) view.spotlight = { at: this.spotlight.at, players: this.spotlight.ids.filter((i) => this.players[i]).map((i) => pub(this.players[i])) };
    const me = sub.playerId ? this.players[sub.playerId] : undefined;
    let controls: string[] = [];
    let hint = 'hint.lobby';
    if (!g) {
      view.data = sub.role === 'player' ? {} : { players: all.slice(0, 60).map(pub), total: all.length };
    } else {
      const mv = sub.role === 'screen' ? this.module.views.screen(g, this.ctx()) : sub.role === 'mc' ? this.module.views.mc(g, this.ctx()) : this.module.views.player(g, sub.playerId ?? '', this.ctx());
      view.phase = g.phase.name;
      view.endsAt = g.phase.paused ? null : g.phase.endsAt;
      view.pausedMs = g.phase.paused ? g.phase.paused.remainingMs : null;
      view.round = mv.round ?? null;
      view.rounds = mv.rounds ?? null;
      view.data = mv.data;
      hint = mv.hint ?? 'hint.default';
      controls = mv.controls ?? [];
      if (sub.role === 'screen') {
        const rk = this.ranking();
        if (mv.showTop5) view.top5 = rk.ids.filter((id) => this.players[id] && (g.scores[id] ?? 0) > 0).slice(0, 5).map((id) => this.entry(id));
        if (g.phase.name === END) view.podium = rk.ids.filter((id) => this.players[id]).slice(0, 3).map((id) => this.entry(id));
      }
    }
    if (sub.role === 'player' && me) {
      const rk = this.ranking();
      const i = rk.idx.get(me.id);
      const info: MyInfo = { ...pub(me), role: me.role, score: Math.max(0, Math.round(g?.scores?.[me.id] ?? 0)), rank: i === undefined || !g ? null : i + 1, of: rk.ids.length, rerolled: me.rerolled, spotlighted: !!this.spotlight?.ids.includes(me.id) };
      view.me = info;
    }
    if (sub.role === 'mc') view.mc = this.mcInfo(hint, controls);
    return view;
  }

  // ---------- persistence ----------
  toSnapshot(): Snapshot {
    return {
      v: 1, code: this.code, gameId: this.gameId, config: this.config, hostKeyHash: this.hostKeyHash, players: this.players, order: this.order, banned: [...this.banned], game: this.game,
      rev: this.rev, rngState: this.rng.state, createdAt: this.createdAt, lastActivityAt: this.lastActivityAt, spotlight: this.spotlight, sound: this.sound, savedAt: this.now(),
    };
  }

  static restore(s: Snapshot, opts: RoomOpts = {}): Room {
    const r = new Room(s.code, s.gameId, s.config, s.hostKeyHash, opts);
    r.players = Object.fromEntries(Object.entries(s.players).map(([k, p]) => [k, { ...p, connected: false }]));
    r.order = s.order;
    r.banned = new Set(s.banned);
    r.game = s.game;
    r.rev = s.rev + 1;
    r.rng.state = s.rngState;
    r.createdAt = s.createdAt;
    r.lastActivityAt = r.now();
    r.spotlight = s.spotlight;
    r.sound = s.sound;
    if (r.game && r.game.phase.endsAt != null && !r.game.phase.paused) {
      // Timers resume from the stored endsAt; if it already passed, wait for the MC to resume.
      if (r.game.phase.endsAt <= r.now()) r.game.phase = pausePhase({ ...r.game.phase, endsAt: r.now() }, r.now());
      else r.schedule();
    }
    return r;
  }
}
