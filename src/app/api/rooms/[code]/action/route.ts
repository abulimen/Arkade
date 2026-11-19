import { PlayerActionSchema, PlayerPayloads } from '@/shared/schemas';
import { getManager } from '@/server/rooms/manager';
import { STATUS, json, readJson } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Player intents. The server stamps receipt time itself; nothing the client claims about time is used. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const receivedAt = Date.now();
  const { code } = await params;
  const m = getManager();
  m.count();
  const body = await readJson(req, PlayerActionSchema, 2048);
  if ('error' in body) return body.error;
  const { token, type, seq } = body.data;
  if (!m.actionLimiter.allow(token)) return json({ seq, ok: false, error: 'RATE_LIMITED' }, 429);
  const parsed = PlayerPayloads[type].safeParse(body.data.payload ?? {});
  if (!parsed.success) return json({ seq, ok: false, error: 'BAD_PAYLOAD' }, 400);
  const out = await m.mutate(
    code,
    (room) => {
      const p = Object.values(room.players).find((x) => x.token === token);
      if (type === 'PING') {
        if (!p) return { ok: false, error: 'UNKNOWN_PLAYER' };
        room.rtts[p.id] = Number((parsed.data as { rtt?: number })?.rtt) || 0;
        if (!p.connected) {
          p.connected = true;
          p.lastSeenAt = receivedAt;
          room.touch(false);
        } else if (receivedAt - (p.lastSeenAt ?? 0) >= 25_000) {
          p.lastSeenAt = receivedAt;
          room.dirty = true;
        }
        return { ok: true };
      }
      if (p && m.isDbMode()) {
        const was = p.connected;
        p.connected = true;
        p.lastSeenAt = receivedAt;
        if (!was) room.touch(false);
      }
      const r = room.playerAction(token, type, parsed.data, receivedAt);
      const view = r.ok && !room.closed && p ? room.viewFor({ role: 'player', playerId: p.id }) : undefined;
      return view ? { ...r, view } : r;
    },
    { skipTimerAdvance: type === 'PING' },
  );
  if (out.notFound) return json({ seq, ok: false, error: 'ROOM_NOT_FOUND' }, 404);
  const r = out.result;
  return json({ seq, ...r }, r.ok ? 200 : (r.error && STATUS[r.error]) || 200);
}
