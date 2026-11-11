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
  const room = m.get(code);
  if (!room || room.closed) return json({ ok: false, error: 'ROOM_NOT_FOUND' }, 404);
  const body = await readJson(req, PlayerActionSchema, 2048);
  if ('error' in body) return body.error;
  const { token, type, seq } = body.data;
  if (!m.actionLimiter.allow(token)) return json({ seq, ok: false, error: 'RATE_LIMITED' }, 429);
  const parsed = PlayerPayloads[type].safeParse(body.data.payload ?? {});
  if (!parsed.success) return json({ seq, ok: false, error: 'BAD_PAYLOAD' }, 400);
  const r = room.playerAction(token, type, parsed.data, receivedAt);
  return json({ seq, ...r }, r.ok ? 200 : (r.error && STATUS[r.error]) || 200);
}
