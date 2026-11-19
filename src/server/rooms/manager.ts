import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { and, count, desc, eq, gt, lt } from 'drizzle-orm';
import { getDb } from '@/db';
import { arkadeHistory, arkadeRooms } from '@/db/schema';
import { GAME_META, ROOM_LETTERS } from '@/shared/types';
import type { GameConfig, GameHistoryEntry, GameId } from '@/shared/types';
import { Room, hashKey } from './Room';
import type { Snapshot, Sub } from './Room';

export type DbSub = Sub & { token?: string };

interface DbWatcher {
  subs: Set<DbSub>;
  rev: number;
  timer: ReturnType<typeof setInterval>;
  busy: boolean;
}

const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);
export const env = {
  maxRooms: () => num(process.env.MAX_ROOMS, 10),
  maxPlayers: () => num(process.env.MAX_PLAYERS, 500),
  idleMs: () => num(process.env.ROOM_IDLE_MINUTES, 120) * 60_000,
  dir: () => path.resolve(/*turbopackIgnore: true*/ process.env.SNAPSHOT_DIR ?? './data/snapshots'),
};

/** Token bucket: burst 20, sustained 5 per second. */
export class RateLimiter {
  private b = new Map<string, { t: number; ts: number }>();
  constructor(private cap = 20, private rate = 5) {}
  allow(key: string, now = Date.now()): boolean {
    const e = this.b.get(key) ?? { t: this.cap, ts: now };
    e.t = Math.min(this.cap, e.t + ((now - e.ts) / 1000) * this.rate);
    e.ts = now;
    const okay = e.t >= 1;
    if (okay) e.t -= 1;
    this.b.set(key, e);
    if (this.b.size > 5000) for (const [k, v] of this.b) if (now - v.ts > 60_000) this.b.delete(k);
    return okay;
  }
}

export class RoomManager {
  rooms = new Map<string, Room>();
  actionLimiter = new RateLimiter(20, 5);
  createLimiter = new RateLimiter(5, 5 / 60);
  messages = 0;
  history: GameHistoryEntry[] = [];
  private window: number[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  private dbWatchers = new Map<string, DbWatcher>();
  started = Date.now();

  constructor() {
    if (!this.isDbMode()) {
      this.loadHistory();
      this.restore();
      this.timers.push(setInterval(() => this.snapshotDirty(), 2000), setInterval(() => this.sweep(), 30_000));
      for (const t of this.timers) t.unref?.();
    }
  }

  isDbMode(): boolean {
    return Boolean(process.env.DATABASE_URL);
  }

  count() { this.messages++; this.window.push(Date.now()); }

  metrics() {
    const now = Date.now();
    this.window = this.window.filter((t) => now - t < 10_000);
    let players = 0, connected = 0;
    for (const r of this.rooms.values()) { if (r.closed) continue; for (const p of Object.values(r.players)) { players++; if (p.connected) connected++; } }
    return { rooms: this.activeRooms(), players, connected, messages: this.messages, messagesPerSecond: Math.round((this.window.length / 10) * 10) / 10, uptimeSeconds: Math.round((now - this.started) / 1000), memoryMb: Math.round(process.memoryUsage().rss / 1048576) };
  }

  activeRooms() { return [...this.rooms.values()].filter((r) => !r.closed).length; }
  get(code: string) { return this.rooms.get(code.toUpperCase()); }

  async getAsync(code: string): Promise<Room | undefined> {
    const upper = code.toUpperCase();
    if (!this.isDbMode()) return this.rooms.get(upper);
    try {
      const rows = await getDb().select().from(arkadeRooms).where(eq(arkadeRooms.code, upper)).limit(1);
      const row = rows[0];
      if (!row || row.closed) return undefined;
      const snap = row.snapshot;
      if (!snap || snap.v !== 1 || Date.now() - snap.savedAt > 2 * 3600_000) return undefined;
      if (row.endsAt != null && row.endsAt <= Date.now()) {
        return await this.advanceRoomTimers(upper);
      }
      return Room.restore(snap, { maxPlayers: env.maxPlayers(), live: true });
    } catch {
      return undefined;
    }
  }

  create(gameId: GameId, config: GameConfig): { room: Room; hostKey: string } | { error: string } {
    if (this.activeRooms() >= env.maxRooms()) return { error: 'TOO_MANY_ROOMS' };
    let code = '';
    do code = Array.from({ length: 4 }, () => ROOM_LETTERS[crypto.randomInt(ROOM_LETTERS.length)]).join('');
    while (this.rooms.has(code));
    const hostKey = crypto.randomBytes(16).toString('hex');
    const room = new Room(code, gameId, config, hashKey(hostKey), { maxPlayers: env.maxPlayers() });
    this.wire(room);
    this.rooms.set(code, room);
    return { room, hostKey }; // the plain key is handed to the creator once; only its hash is kept
  }

  async createAsync(gameId: GameId, config: GameConfig): Promise<{ room: Room; hostKey: string } | { error: string }> {
    if (!this.isDbMode()) return this.create(gameId, config);
    const db = getDb();
    await db.delete(arkadeRooms).where(lt(arkadeRooms.updatedAt, new Date(Date.now() - 3 * 3600_000))).catch(() => undefined);
    const activeSince = new Date(Date.now() - 2 * 3600_000);
    const [{ total }] = await db
      .select({ total: count() })
      .from(arkadeRooms)
      .where(and(eq(arkadeRooms.closed, false), gt(arkadeRooms.updatedAt, activeSince)));
    if (total >= env.maxRooms()) return { error: 'TOO_MANY_ROOMS' };

    const hostKey = crypto.randomBytes(16).toString('hex');
    const hostKeyHash = hashKey(hostKey);
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = Array.from({ length: 4 }, () => ROOM_LETTERS[crypto.randomInt(ROOM_LETTERS.length)]).join('');
      const room = new Room(code, gameId, config, hostKeyHash, { maxPlayers: env.maxPlayers(), live: true });
      const inserted = await db
        .insert(arkadeRooms)
        .values({ code, snapshot: room.toSnapshot(), rev: room.rev, endsAt: null, closed: false, updatedAt: new Date() })
        .onConflictDoNothing({ target: arkadeRooms.code })
        .returning({ code: arkadeRooms.code });
      if (inserted.length > 0) return { room, hostKey };
    }
    return { error: 'TOO_MANY_ROOMS' };
  }

  async mutate<T>(
    code: string,
    fn: (room: Room) => T,
    opts?: { allowClosed?: boolean; skipTimerAdvance?: boolean },
  ): Promise<{ notFound: true } | { notFound: false; room: Room; result: T }> {
    const upper = code.toUpperCase();
    if (!this.isDbMode()) {
      const room = this.rooms.get(upper);
      if (!room || (!opts?.allowClosed && room.closed)) return { notFound: true };
      const result = fn(room);
      return { notFound: false, room, result };
    }
    return await getDb().transaction(async (tx) => {
      const rows = await tx.select().from(arkadeRooms).where(eq(arkadeRooms.code, upper)).for('update');
      const row = rows[0];
      if (!row || (row.closed && !opts?.allowClosed)) return { notFound: true } as const;
      const snap = row.snapshot;
      if (!snap || snap.v !== 1 || Date.now() - snap.savedAt > 2 * 3600_000) return { notFound: true } as const;

      const room = Room.restore(snap, { maxPlayers: env.maxPlayers(), live: true });
      const timersAdvanced = !opts?.skipTimerAdvance && room.advanceDueTimers();
      const prevRev = room.rev;
      const prevHistory = room.historyRecorded;
      const result = fn(room);

      if (timersAdvanced || room.rev !== prevRev || room.dirty || room.closed !== row.closed) {
        room.dirty = false;
        const nextSnap = room.toSnapshot();
        await tx
          .update(arkadeRooms)
          .set({
            snapshot: nextSnap,
            rev: room.rev,
            endsAt: room.currentEndsAt(),
            closed: room.closed,
            updatedAt: new Date(),
          })
          .where(eq(arkadeRooms.code, upper));
        if (!prevHistory && (room.historyRecorded || room.game?.phase?.name === 'end')) {
          room.historyRecorded = true;
          const entry = this.buildHistoryEntry(room);
          await tx
            .insert(arkadeHistory)
            .values({ id: entry.id, code: room.code, entry, endedAt: entry.endedAt })
            .onConflictDoUpdate({ target: arkadeHistory.id, set: { entry, endedAt: entry.endedAt } });
        }
      }
      return { notFound: false, room, result } as const;
    });
  }

  async advanceRoomTimers(code: string): Promise<Room | undefined> {
    const res = await this.mutate(code, () => undefined);
    return res.notFound ? undefined : res.room;
  }

  async setPlayerConnected(code: string, playerId: string, connected: boolean): Promise<void> {
    if (!this.isDbMode()) return;
    try {
      await this.mutate(
        code,
        (room) => {
          const p = room.players[playerId];
          if (!p) return;
          const now = Date.now();
          if (connected) {
            const was = p.connected;
            p.connected = true;
            p.lastSeenAt = now;
            if (!was) room.touch(false);
            else room.dirty = true;
          } else if (p.connected) {
            p.connected = false;
            room.touch(false);
          }
        },
        { skipTimerAdvance: true },
      );
    } catch {
      /* non-fatal */
    }
  }

  private wire(room: Room) {
    room.persist = () => this.write(room);
    room.onClose = () => this.remove(room.code);
    room.onEnd = () => this.recordHistory(room);
  }

  private historyFile() {
    return path.join(/*turbopackIgnore: true*/ env.dir(), '..', 'history.json');
  }

  private loadHistory() {
    try {
      const f = this.historyFile();
      if (!fs.existsSync(/*turbopackIgnore: true*/ f)) return;
      const raw = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ f, 'utf8'));
      if (Array.isArray(raw)) this.history = raw.slice(0, 50);
    } catch {
      this.history = [];
    }
  }

  private buildHistoryEntry(room: Room): GameHistoryEntry {
    const endedAt = Date.now();
    return {
      id: `${room.code}-${room.createdAt}`,
      code: room.code,
      gameId: room.gameId,
      gameName: GAME_META[room.gameId].name,
      audience: room.config.audience,
      mode: room.config.mode,
      startedAt: room.createdAt,
      endedAt,
      playerCount: room.order.length,
      top10: room.topEntries(10),
    };
  }

  recordHistory(room: Room) {
    const entry = this.buildHistoryEntry(room);
    this.history = [entry, ...this.history.filter((h) => h.id !== entry.id)].slice(0, 50);
    try {
      const f = this.historyFile();
      fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(f), { recursive: true });
      fs.writeFileSync(/*turbopackIgnore: true*/ f, JSON.stringify(this.history));
    } catch {
      /* non-fatal */
    }
    if (this.isDbMode()) {
      void getDb()
        .insert(arkadeHistory)
        .values({ id: entry.id, code: room.code, entry, endedAt: entry.endedAt })
        .onConflictDoUpdate({ target: arkadeHistory.id, set: { entry, endedAt: entry.endedAt } })
        .catch(() => undefined);
    }
  }

  getHistory(codes?: string[]): GameHistoryEntry[] {
    if (!codes?.length) return this.history.slice(0, 25);
    const set = new Set(codes);
    const mine = this.history.filter((h) => set.has(h.code));
    return (mine.length ? mine : this.history).slice(0, 25);
  }

  async getHistoryAsync(codes?: string[]): Promise<GameHistoryEntry[]> {
    if (this.isDbMode()) {
      try {
        const rows = await getDb().select().from(arkadeHistory).orderBy(desc(arkadeHistory.endedAt)).limit(50);
        this.history = rows.map((r) => r.entry);
      } catch {
        /* non-fatal */
      }
    }
    return this.getHistory(codes);
  }

  subscribeDb(code: string, sub: DbSub, initialRoom: Room): () => void {
    const upper = code.toUpperCase();
    const initialView = initialRoom.viewFor(sub);
    const { rev: _ir, ...initialRest } = initialView;
    void _ir;
    sub.last = JSON.stringify(initialRest);
    sub.send('view', JSON.stringify(initialView));

    let w = this.dbWatchers.get(upper);
    if (!w) {
      const created: DbWatcher = {
        subs: new Set(),
        rev: initialRoom.rev,
        busy: false,
        timer: setInterval(() => void this.pollDbWatcher(upper, created), 350),
      };
      created.timer.unref?.();
      this.dbWatchers.set(upper, created);
      w = created;
    } else if (initialRoom.rev > w.rev) {
      w.rev = initialRoom.rev;
    }
    w.subs.add(sub);

    return () => {
      const cur = this.dbWatchers.get(upper);
      if (!cur) return;
      cur.subs.delete(sub);
      if (cur.subs.size === 0) {
        clearInterval(cur.timer);
        this.dbWatchers.delete(upper);
      }
    };
  }

  private async pollDbWatcher(code: string, w: DbWatcher) {
    if (w.busy || w.subs.size === 0) return;
    w.busy = true;
    try {
      const rows = await getDb()
        .select({ rev: arkadeRooms.rev, endsAt: arkadeRooms.endsAt, closed: arkadeRooms.closed })
        .from(arkadeRooms)
        .where(eq(arkadeRooms.code, code))
        .limit(1);
      const row = rows[0];
      if (!row || row.closed) {
        for (const s of [...w.subs]) {
          try {
            s.send('closed', '{}');
          } catch {
            /* closed */
          }
          s.close();
          w.subs.delete(s);
        }
        clearInterval(w.timer);
        this.dbWatchers.delete(code);
        return;
      }

      let roomToBroadcast: Room | undefined;
      if (row.endsAt != null && row.endsAt <= Date.now()) {
        const advanced = await this.advanceRoomTimers(code);
        if (advanced && advanced.closed) {
          for (const s of [...w.subs]) {
            try {
              s.send('closed', '{}');
            } catch {
              /* closed */
            }
            s.close();
            w.subs.delete(s);
          }
          clearInterval(w.timer);
          this.dbWatchers.delete(code);
          return;
        }
        if (advanced && advanced.rev !== w.rev) roomToBroadcast = advanced;
      }

      if (!roomToBroadcast && row.rev !== w.rev) {
        const freshRows = await getDb().select().from(arkadeRooms).where(eq(arkadeRooms.code, code)).limit(1);
        const fresh = freshRows[0];
        if (!fresh || fresh.closed) {
          for (const s of [...w.subs]) {
            try {
              s.send('closed', '{}');
            } catch {
              /* closed */
            }
            s.close();
            w.subs.delete(s);
          }
          clearInterval(w.timer);
          this.dbWatchers.delete(code);
          return;
        }
        roomToBroadcast = Room.restore(fresh.snapshot, { maxPlayers: env.maxPlayers(), live: true });
      }

      if (!roomToBroadcast) return;
      w.rev = roomToBroadcast.rev;
      const cache = new Map<string, { key: string; json: string }>();
      for (const s of [...w.subs]) {
        if (s.role === 'player') {
          const kickCode =
            s.token && roomToBroadcast.banned.has(s.token)
              ? 'BANNED'
              : !s.playerId || !roomToBroadcast.players[s.playerId]
                ? 'KICKED'
                : null;
          if (kickCode) {
            try {
              s.send('kicked', JSON.stringify({ code: kickCode }));
            } catch {
              /* closed */
            }
            s.close();
            w.subs.delete(s);
            continue;
          }
        }
        let entry = s.role === 'player' ? undefined : cache.get(s.role);
        if (!entry) {
          const view = roomToBroadcast.viewFor(s);
          const { rev: _r, ...rest } = view;
          void _r;
          entry = { key: JSON.stringify(rest), json: JSON.stringify(view) };
          if (s.role !== 'player') cache.set(s.role, entry);
        }
        if (entry.key !== s.last) {
          s.last = entry.key;
          try {
            s.send('view', entry.json);
          } catch {
            w.subs.delete(s);
          }
        }
      }
      if (w.subs.size === 0) {
        clearInterval(w.timer);
        this.dbWatchers.delete(code);
      }
    } catch {
      /* transient poll error */
    } finally {
      w.busy = false;
    }
  }

  private async write(room: Room) {
    room.dirty = false;
    const snap = room.toSnapshot();
    if (process.env.DATABASE_URL) {
      try {
        await getDb()
          .insert(arkadeRooms)
          .values({ code: room.code, snapshot: snap, updatedAt: new Date() })
          .onConflictDoUpdate({ target: arkadeRooms.code, set: { snapshot: snap, updatedAt: new Date() } });
      } catch (e) {
        console.error(JSON.stringify({ level: 'error', msg: 'db snapshot failed', code: room.code, err: String(e) }));
      }
    }
    try {
      fs.mkdirSync(/*turbopackIgnore: true*/ env.dir(), { recursive: true });
      const file = path.join(/*turbopackIgnore: true*/ env.dir(), `${room.code}.json`);
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.promises.writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(snap));
      await fs.promises.rename(/*turbopackIgnore: true*/ tmp, file);
    } catch (e) {
      if (!process.env.DATABASE_URL) {
        console.error(JSON.stringify({ level: 'error', msg: 'snapshot failed', code: room.code, err: String(e) }));
      }
    }
  }

  snapshotDirty() {
    for (const r of this.rooms.values()) if (r.dirty && !r.closed) void this.write(r);
  }

  private remove(code: string) {
    if (process.env.DATABASE_URL) {
      void getDb().delete(arkadeRooms).where(eq(arkadeRooms.code, code)).catch(() => undefined);
    }
    fs.promises.rm(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ env.dir(), `${code}.json`), { force: true }).catch(() => undefined);
  }

  restore() {
    try {
      const dir = env.dir();
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) return;
      for (const f of fs.readdirSync(/*turbopackIgnore: true*/ dir)) {
        if (!f.endsWith('.json')) continue;
        try {
          const snap = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, f), 'utf8')) as Snapshot;
          if (snap.v !== 1 || Date.now() - snap.savedAt > 2 * 3600_000) { fs.rmSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, f), { force: true }); continue; }
          const room = Room.restore(snap, { maxPlayers: env.maxPlayers() });
          this.wire(room);
          this.rooms.set(room.code, room);
          console.log(JSON.stringify({ level: 'info', msg: 'room restored', code: room.code }));
        } catch (e) { console.error(JSON.stringify({ level: 'error', msg: 'bad snapshot', file: f, err: String(e) })); }
      }
    } catch { /* no snapshots */ }
  }

  sweep() {
    const now = Date.now();
    for (const [code, r] of this.rooms) {
      if (r.closed) { if (now - r.closedAt > 10 * 60_000) this.rooms.delete(code); continue; }
      const finished = r.status() === 'results' && now - r.lastActivityAt > 15 * 60_000;
      if (finished || now - r.lastActivityAt > env.idleMs()) r.close();
    }
  }
}

const g = globalThis as typeof globalThis & { __arkade?: RoomManager };
export function getManager(): RoomManager {
  if (!g.__arkade) g.__arkade = new RoomManager();
  return g.__arkade;
}
