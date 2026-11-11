import crypto from 'node:crypto';
import { getManager } from '@/server/rooms/manager';
import type { Sub } from '@/server/rooms/Room';
import { json } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Server-sent events: one stream per surface, each carrying only the view that surface may see. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getManager();
  m.count();
  const room = m.get(code);
  if (!room || room.closed) return json({ error: 'ROOM_NOT_FOUND' }, 404);
  const q = new URL(req.url).searchParams;
  const role = q.get('role');
  let playerId: string | undefined;
  if (role === 'mc') {
    if (!room.verifyHostKey(q.get('key') ?? '')) return json({ error: 'BAD_KEY' }, 403);
  } else if (role === 'player') {
    const token = q.get('token') ?? '';
    if (room.banned.has(token)) return json({ error: 'BANNED' }, 403);
    const p = Object.values(room.players).find((x) => x.token === token);
    if (!p) return json({ error: 'UNKNOWN_PLAYER' }, 404);
    playerId = p.id;
  } else if (role !== 'screen') return json({ error: 'BAD_ROLE' }, 400);

  const enc = new TextEncoder();
  let sub: Sub | null = null;
  let hb: ReturnType<typeof setInterval> | undefined;
  const cleanup = () => {
    if (hb) clearInterval(hb);
    hb = undefined;
    if (sub) room.detach(sub);
    sub = null;
  };
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: string) => {
        try { controller.enqueue(enc.encode(`event: ${event}\ndata: ${data}\n\n`)); } catch { cleanup(); }
      };
      const me: Sub = {
        id: crypto.randomUUID(), role: role as Sub['role'], playerId, send, last: '',
        close: () => { if (hb) clearInterval(hb); hb = undefined; try { controller.close(); } catch { /* already closed */ } },
      };
      sub = me;
      controller.enqueue(enc.encode('retry: 1000\n\n'));
      room.attach(me);
      hb = setInterval(() => { try { controller.enqueue(enc.encode(': hb\n\n')); } catch { cleanup(); } }, 15_000);
      req.signal.addEventListener('abort', () => { cleanup(); try { controller.close(); } catch { /* closed */ } });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-accel-buffering': 'no' },
  });
}
