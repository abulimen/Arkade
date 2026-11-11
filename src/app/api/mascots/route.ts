import fs from 'node:fs';
import path from 'node:path';
import { json } from '@/server/net/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_EXT = /\.(webp|png|avif|jpe?g|svg)$/i;

export async function GET() {
  const dir = path.join(process.cwd(), 'public', 'mascots');
  const assets: Record<string, string> = {};
  try {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (!VALID_EXT.test(file)) continue;
        const key = file.replace(VALID_EXT, '').toLowerCase();
        assets[key] = `/mascots/${file}`;
      }
    }
  } catch {
    // ignore read errors
  }
  return json({ assets });
}
