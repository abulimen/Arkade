import { getManager } from '@/server/rooms/manager';
import { json } from '@/server/net/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json(getManager().metrics());
}
