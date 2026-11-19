import { JoinSchema } from '@/shared/schemas';
import { GAME_META } from '@/shared/types';
import { RateLimiter, getManager } from '@/server/rooms/manager';
import { STATUS, ipOf, json, readJson } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Many phones share one NAT address at a church, so joins get a roomy bucket.
const g = globalThis as typeof globalThis & { __joinLimiter?: RateLimiter };
const limiter = (g.__joinLimiter ??= new RateLimiter(120, 40));

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = getManager();
  m.count();
  if (!limiter.allow(ipOf(req))) return json({ error: 'RATE_LIMITED' }, 429);
  const body = await readJson(req, JoinSchema);
  if ('error' in body) return body.error;
  const out = await m.mutate(code, (room) => {
    const res = room.join(body.data);
    if ('player' in res && m.isDbMode()) {
      res.player.connected = true;
      res.player.lastSeenAt = Date.now();
      room.touch(false);
    }
    return res;
  });
  if (out.notFound) return json({ error: 'ROOM_NOT_FOUND' }, 404);
  const r = out.result;
  if ('error' in r) return json({ error: r.error }, STATUS[r.error] ?? 400);
  const p = r.player;
  return json({
    playerId: p.id,
    token: p.token,
    nickname: p.nickname,
    room: { code: out.room.code, gameId: out.room.gameId, gameName: GAME_META[out.room.gameId].name, status: out.room.status() },
  });
}
