import { McActionSchema } from '@/shared/schemas';
import { getManager } from '@/server/rooms/manager';
import { json, readJson } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getManager();
  m.count();
  const room = m.get(code);
  if (!room) return json({ ok: false, error: 'ROOM_NOT_FOUND' }, 404);
  const body = await readJson(req, McActionSchema, 4096);
  if ('error' in body) return body.error;
  const { hostKey, type, payload, seq } = body.data;
  if (!room.verifyHostKey(hostKey)) return json({ seq, ok: false, error: 'BAD_KEY' }, 403);
  if (!m.actionLimiter.allow('mc:' + room.code)) return json({ seq, ok: false, error: 'RATE_LIMITED' }, 429);
  const r = room.mcAction(type, payload ?? {});
  return json({ seq, ...r });
}
