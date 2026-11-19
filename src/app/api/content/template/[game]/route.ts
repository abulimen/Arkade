import { CSV_TEMPLATES } from '@/shared/customCsv';
import { GAME_IDS, type GameId } from '@/shared/types';
import { json } from '@/server/net/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!GAME_IDS.includes(game as GameId)) {
    return json({ error: 'GAME_NOT_FOUND' }, 404);
  }
  const tpl = CSV_TEMPLATES[game as GameId];
  return new Response(tpl.sampleCsv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tpl.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
