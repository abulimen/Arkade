import { GAME_META } from '@/shared/types';
import { getManager } from '@/server/rooms/manager';
import { baseUrl, json } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = getManager().get(code);
  if (!room || room.closed) return json({ error: 'ROOM_NOT_FOUND' }, 404);
  const base = baseUrl(req);
  return json({
    code: room.code,
    gameId: room.gameId,
    gameName: GAME_META[room.gameId].name,
    status: room.status(),
    players: room.order.length,
    mode: room.config.mode,
    audience: room.config.audience,
    configured: !!process.env.PUBLIC_URL,
    urls: { join: `${base}/j/${room.code}`, short: `${base.replace(/^https?:\/\//, '')}/j/${room.code}` },
  });
}
