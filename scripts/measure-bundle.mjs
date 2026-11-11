// First-load JS a phone downloads, measured from the real HTML of a running server (T-8.4 budget: 180 KB gzipped JS).
// nomodule polyfills are excluded: Android Chrome 90+ / iOS Safari 14+ never fetch them.
//   node scripts/measure-bundle.mjs http://localhost:3000
import zlib from 'node:zlib';
const base = process.argv[2] ?? 'http://localhost:3000';
const routes = ['/', '/j/BKDF', '/play/BKDF', '/screen/BKDF', '/mc', '/mc/BKDF'];
let worstPhone = 0;
for (const route of routes) {
  const html = await (await fetch(base + route)).text();
  const tags = [...html.matchAll(/<script[^>]*src="(\/_next\/static\/[^"]+\.js)"[^>]*>/g)].filter((m) => !/noModule/i.test(m[0]));
  const srcs = [...new Set(tags.map((m) => m[1]))];
  let gz = 0, raw = 0;
  for (const s of srcs) { const b = Buffer.from(await (await fetch(base + s)).arrayBuffer()); raw += b.length; gz += zlib.gzipSync(b).length; }
  const kb = gz / 1024;
  console.log(`${route.padEnd(14)} JS ${kb.toFixed(1)} KB gz (${(raw / 1024).toFixed(0)} KB raw), html ${(zlib.gzipSync(html).length / 1024).toFixed(1)} KB gz, ${srcs.length} scripts`);
  if (['/', '/j/BKDF', '/play/BKDF'].includes(route)) worstPhone = Math.max(worstPhone, kb);
}
console.log(`phone budget 180 KB gz JS: worst phone route ${worstPhone.toFixed(1)} KB`);
if (worstPhone > 180) { console.error('OVER BUDGET'); process.exit(1); }
