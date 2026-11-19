import crypto from 'node:crypto';
import { getManager } from '@/server/rooms/manager';
import type { DbSub } from '@/server/rooms/manager';
import type { Sub } from '@/server/rooms/Room';
import { json } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const ROLLOVER_MS = 48_000;

/** Server-sent events: one stream per surface, each carrying only the view that surface may see. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getManager();
  m.count();
  let room = await m.getAsync(code);
  if (!room || room.closed) return json({ error: 'ROOM_NOT_FOUND' }, 404);
  const q = new URL(req.url).searchParams;
  const role = q.get('role');
  let playerId: string | undefined;
  let playerToken: string | undefined;
  if (role === 'mc') {
    if (!room.verifyHostKey(q.get('key') ?? '')) return json({ error: 'BAD_KEY' }, 403);
  } else if (role === 'player') {
    const token = q.get('token') ?? '';
    if (room.banned.has(token)) return json({ error: 'BANNED' }, 403);
    const p = Object.values(room.players).find((x) => x.token === token);
    if (!p) return json({ error: 'UNKNOWN_PLAYER' }, 404);
    playerId = p.id;
    playerToken = token;
    if (m.isDbMode() && (!p.connected || Date.now() - (p.lastSeenAt ?? 0) > 15_000)) {
      await m.setPlayerConnected(code, p.id, true);
      room = (await m.getAsync(code)) ?? room;
    }
  } else if (role !== 'screen') return json({ error: 'BAD_ROLE' }, 400);

  const enc = new TextEncoder();
  let sub: DbSub | null = null;
  let unsubDb: (() => void) | null = null;
  let hb: ReturnType<typeof setInterval> | undefined;
  let rollover: ReturnType<typeof setTimeout> | undefined;
  let rollingOver = false;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (hb) clearInterval(hb);
    hb = undefined;
    if (rollover) clearTimeout(rollover);
    rollover = undefined;
    if (unsubDb) unsubDb();
    else if (sub) room.detach(sub);
    unsubDb = null;
    sub = null;
  };
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        try { controller.enqueue(enc.encode(`event: ${event}\ndata: ${data}\n\n`)); } catch { cleanup(); }
      };
      const me: DbSub = {
        id: crypto.randomUUID(),
        role: role as Sub['role'],
        playerId,
        token: playerToken,
        send,
        last: '',
        close: () => {
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
        },
      };
      sub = me;
      controller.enqueue(enc.encode(m.isDbMode() ? 'retry: 500\n\n' : 'retry: 1000\n\n'));
      if (m.isDbMode()) {
        unsubDb = m.subscribeDb(code, me, room);
        rollover = setTimeout(() => {
          rollingOver = true;
          try { controller.enqueue(enc.encode('event: reconnect\ndata: {}\n\n')); } catch { /* closed */ }
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
        }, ROLLOVER_MS);
        rollover.unref?.();
      } else {
        room.attach(me);
      }
      hb = setInterval(() => { try { controller.enqueue(enc.encode(': hb\n\n')); } catch { cleanup(); } }, 15_000);
      req.signal.addEventListener('abort', () => {
        cleanup();
        if (!rollingOver && m.isDbMode() && role === 'player' && playerId) {
          void m.setPlayerConnected(code, playerId, false);
        }
        try { controller.close(); } catch { /* closed */ }
      });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' },
  });
}
