import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOM_LETTERS } from '@/shared/types';
import type { GameConfig, GameId } from '@/shared/types';
import { Room, hashKey } from './Room';
import type { Snapshot } from './Room';

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
  private window: number[] = [];
  private timers: ReturnType<typeof setInterval>[] = [];
  started = Date.now();

  constructor() {
    this.restore();
    this.timers.push(setInterval(() => this.snapshotDirty(), 2000), setInterval(() => this.sweep(), 30_000));
    for (const t of this.timers) t.unref?.();
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

  private wire(room: Room) {
    room.persist = () => this.write(room);
    room.onClose = () => this.remove(room.code);
  }

  private async write(room: Room) {
    try {
      fs.mkdirSync(/*turbopackIgnore: true*/ env.dir(), { recursive: true });
      const file = path.join(/*turbopackIgnore: true*/ env.dir(), `${room.code}.json`);
      const tmp = `${file}.${process.pid}.tmp`;
      room.dirty = false;
      await fs.promises.writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(room.toSnapshot()));
      await fs.promises.rename(/*turbopackIgnore: true*/ tmp, file);
    } catch (e) {
      console.error(JSON.stringify({ level: 'error', msg: 'snapshot failed', code: room.code, err: String(e) }));
    }
  }

  snapshotDirty() {
    for (const r of this.rooms.values()) if (r.dirty && !r.closed) void this.write(r);
  }

  private remove(code: string) {
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
