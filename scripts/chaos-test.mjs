// Chaos test (T-8.2): kill the server mid-game, restart it, and confirm the room is restored from its snapshot,
// players rejoin with their tokens (same id, same score) and the MC can resume.
//   node scripts/chaos-test.mjs   (requires a production build: npm run build)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 3150;
const base = `http://localhost:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arkade-chaos-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (p, b) => { const r = await fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, json: await r.json() }; };
const boot = async () => {
  const child = spawn('npx', ['next', 'start', '-p', String(PORT)], { env: { ...process.env, SNAPSHOT_DIR: dir }, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/healthz')).ok) return child; } catch { /* booting */ } await sleep(500); }
  throw new Error('server did not start');
};
const killTree = (c) => { try { process.kill(-c.pid, 'SIGKILL'); } catch { /* gone */ } };
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!ok) process.exitCode = 1; };
const view = async (code, q) => {
  const res = await fetch(`${base}/api/rooms/${code}/stream?${q}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value } = await reader.read();
    buf += dec.decode(value, { stream: true });
    const m = /event: view\ndata: (.*)\n\n/.exec(buf);
    if (m) { reader.cancel().catch(() => {}); return JSON.parse(m[1]); }
  }
};

let server = await boot();
const { json: room } = await post('/api/rooms', { gameId: 'what-came-first', config: { pace: 0.75 } });
const bots = [];
for (let i = 0; i < 3; i++) bots.push((await post(`/api/rooms/${room.code}/join`, { nickname: `Chaos${i}` })).json);
const hold = await Promise.all(bots.map((b) => fetch(`${base}/api/rooms/${room.code}/stream?role=player&token=${b.token}`))); // a connected phone (players count once their stream is open)
await sleep(300);
check('start', (await post(`/api/rooms/${room.code}/mc`, { hostKey: room.hostKey, type: 'START' })).json.ok);
await post(`/api/rooms/${room.code}/mc`, { hostKey: room.hostKey, type: 'SKIP' }); // prompt -> order
let v = await view(room.code, `role=player&token=${bots[0].token}`);
check('in order phase', v.phase === 'order');
const lock = await post(`/api/rooms/${room.code}/action`, { token: bots[0].token, type: 'LOCK', payload: { order: v.data.cards.map((c) => c.id) }, seq: 1 });
check('bot locked in', lock.json.ok);
await sleep(2600); // snapshots are written every 2 seconds and on every phase change
killTree(server);
console.log('server killed');
await sleep(800);
server = await boot();
const info = await fetch(`${base}/api/rooms/${room.code}`);
check('room restored after restart', info.ok);
v = await view(room.code, `role=player&token=${bots[0].token}`);
check('same player, same lock state', v.me.id === bots[0].playerId && v.data.locked === true, `(me=${v.me.nickname}, locked=${v.data.locked})`);
check('phase preserved', v.phase === 'order', `(phase=${v.phase}, status=${v.status})`);
const rejoin = await post(`/api/rooms/${room.code}/join`, { nickname: 'whoever', token: bots[1].token });
check('token rejoin returns the same player', rejoin.json.playerId === bots[1].playerId);
const mc = await view(room.code, `role=mc&key=${room.hostKey}`);
if (mc.status === 'paused') check('MC resumes', (await post(`/api/rooms/${room.code}/mc`, { hostKey: room.hostKey, type: 'RESUME' })).json.ok);
const after = await view(room.code, 'role=screen');
check('game continues', after.status === 'playing', `(status=${after.status})`);
await post(`/api/rooms/${room.code}/mc`, { hostKey: room.hostKey, type: 'CLOSE' });
await sleep(300);
check('snapshot deleted on close', !fs.existsSync(path.join(dir, `${room.code}.json`)));
killTree(server);
fs.rmSync(dir, { recursive: true, force: true });
