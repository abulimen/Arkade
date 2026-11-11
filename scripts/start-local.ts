// Local (LAN) mode: runs the same server on the MC laptop and prints the LAN URL and a QR code.
// No internet needed: fonts, assets and content are bundled.   npx tsx scripts/start-local.ts
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import qrcode from 'qrcode-generator';

const PORT = process.env.PORT ?? '3000';

export function lanAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list ?? []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  // hotspot ranges first (Android 192.168.43.x, iOS 172.20.10.x, Windows 192.168.137.x)
  return out.sort((a, b) => Number(/^(192\.168\.(43|137)|172\.20\.10)\./.test(b)) - Number(/^(192\.168\.(43|137)|172\.20\.10)\./.test(a)));
}

const ip = lanAddresses()[0] ?? 'localhost';
const url = `http://${ip}:${PORT}`;
if (!fs.existsSync('.next/BUILD_ID')) {
  console.log('No production build found, building first…');
  if (spawnSync('npm', ['run', 'build'], { stdio: 'inherit' }).status !== 0) process.exit(1);
}
const qr = qrcode(0, 'L');
qr.addData(url);
qr.make();
console.log('\n  ARKADE · local mode\n');
console.log(qr.createASCII(1, 2));
console.log(`  Phones join at:   ${url}`);
console.log(`  MC console:       ${url}/mc   (open on the laptop)`);
console.log(`  Projector view:   ${url}/screen/<CODE>\n`);
console.log('  Tip: turn on the laptop hotspot, connect phones to it, then scan the code above.\n');
const child = spawn('npx', ['next', 'start', '-p', PORT, '-H', '0.0.0.0'], { stdio: 'inherit', env: { ...process.env, PUBLIC_URL: url, SNAPSHOT_DIR: process.env.SNAPSHOT_DIR ?? './data/snapshots' } });
child.on('exit', (c) => process.exit(c ?? 0));
