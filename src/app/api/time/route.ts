export const dynamic = 'force-dynamic';

/** time:ping / time:pong over HTTP. The client computes offset from the round trip. */
export async function GET() {
  return new Response(JSON.stringify({ serverNow: Date.now() }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
