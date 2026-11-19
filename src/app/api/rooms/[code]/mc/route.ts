import { McActionSchema } from '@/shared/schemas';
import { getManager } from '@/server/rooms/manager';
import { json, readJson } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getManager();
  m.count();
  const body = await readJson(req, McActionSchema, 4096);
  if ('error' in body) return body.error;
  const { hostKey, type, payload, seq } = body.data;
  if (!m.actionLimiter.allow('mc:' + code.toUpperCase())) return json({ seq, ok: false, error: 'RATE_LIMITED' }, 429);
  const out = await m.mutate(
    code,
    (room) => {
      if (!room.verifyHostKey(hostKey)) return { badKey: true as const };
      const r = room.mcAction(type, payload ?? {});
      const view = !room.closed ? room.viewFor({ role: 'mc' }) : undefined;
      return { badKey: false as const, ...r, ...(view ? { view } : {}) };
    },
    { allowClosed: type === 'CLOSE' },
  );
  if (out.notFound) return json({ seq, ok: false, error: 'ROOM_NOT_FOUND' }, 404);
  if (out.result.badKey) return json({ seq, ok: false, error: 'BAD_KEY' }, 403);
  const { badKey: _bk, ...res } = out.result;
  void _bk;
  return json({ seq, ...res });
}
