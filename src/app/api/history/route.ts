import { NextResponse } from 'next/server';
import { getManager } from '@/server/rooms/manager';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const codesParam = searchParams.get('codes');
  const codes = codesParam
    ? codesParam.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean)
    : undefined;
  const entries = await getManager().getHistoryAsync(codes);
  return NextResponse.json({ history: entries });
}
