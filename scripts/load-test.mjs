// Bot end-to-end + load test over the real HTTP/SSE protocol.
//   node scripts/load-test.mjs --game fake-verse --bots 300 --base http://localhost:3000
// One MC, one projector and N phones play a full game; reports join time, action->screen latency and failures.
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const base = arg('base', process.env.BASE ?? 'http://localhost:3000');
const N = Number(arg('bots', 50));
const game = arg('game', 'what-came-first');
const maxWait = Number(arg('timeout', 600)) * 1000;
const think = Number(arg('think', 1500));

const post = async (path, body) => {
  const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
async function sse(url, onView) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('stream ' + res.status);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i);
          buf = buf.slice(i + 2);
          if (/event: view/.test(chunk)) onView(JSON.parse(/data: (.*)/.exec(chunk)[1]));
        }
      }
    } catch { /* closed */ }
  })();
  return () => reader.cancel().catch(() => {});
}
const rnd = (n) => Math.floor(Math.random() * n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fails = [];
let code, hostKey;
const lat = [];
const sent = { n: 0 };

class Bot {
  constructor(i) { this.i = i; this.done = ''; }
  async join() {
    const r = await post(`/api/rooms/${code}/join`, { nickname: `Bot${this.i + 1}` });
    if (r.status !== 200) throw new Error('join ' + r.status + ' ' + JSON.stringify(r.json));
    this.token = r.json.token;
    this.stop = await sse(`${base}/api/rooms/${code}/stream?role=player&token=${this.token}`, (v) => this.onView(v));
  }
  decide(v) {
    const d = v.data, p = v.phase;
    switch (game) {
      case 'what-came-first': return p === 'order' && !d.locked && d.cards ? ['LOCK', { order: d.cards.map((c) => c.id) }] : null;
      case 'fake-verse':
        if (p === 'write' && !d.submitted) return ['WRITE', { text: `fake ${this.i} r${v.round}` }];
        if (p === 'vote' && !d.voted && d.options?.length) return ['VOTE', { target: d.options[rnd(d.options.length)].id }];
        return null;
      case 'who-am-i': return p.startsWith('clue') && d.status === 'open' && d.options ? ['ANSWER', { choice: d.options[rnd(d.options.length)] }] : null;
      case 'gideons-300':
        if ((p === 's1q' || p === 's2q') && d.role === 'alive' && d.myAnswer == null && d.q) return ['ANSWER', { choice: rnd(4) }];
        if (p === 's3pre' && d.role !== 'finalist' && !d.myPick && d.targets?.length) return ['PREDICT', { target: d.targets[rnd(d.targets.length)].id }];
        if (p === 's3q' && d.role === 'finalist' && !d.frozen && d.q) return ['BUZZ', { choice: rnd(4) }];
        return null;
      case 'spot-the-wolf':
        if (d.spectator) return null;
        if (d.myTurn) return ['CLUE', { text: `word${this.i}` }];
        if (p === 'vote' && !d.myVote && d.suspects?.length) return ['VOTE', { target: d.suspects[rnd(d.suspects.length)].id }];
        if (d.canGuess) return ['GUESS', { text: 'ark' }];
        return null;
      default: return null;
    }
  }
  onView(v) {
    this.view = v;
    const key = `${v.round}:${v.phase}:${v.data?.turnIndex ?? ''}:${v.data?.myTurn ?? ''}`;
    if (this.done === key) return;
    const a = this.decide(v);
    if (!a) return;
    this.done = key;
    setTimeout(async () => {
      sent.n++;
      const r = await post(`/api/rooms/${code}/action`, { token: this.token, type: a[0], payload: a[1], seq: sent.n });
      if (!r.json.ok && !['LOCKED', 'PHASE', 'LATE', 'FROZEN', 'AGAIN', 'NOT_IN', 'PAUSED'].includes(r.json.error)) fails.push(`${this.i} ${a[0]} ${r.json.error}`);
    }, rnd(think));
  }
}

const SKIPPABLE = new Set(['prompt', 'reveal', 'intro', 's1r', 's2r', 's3r', 's1cut', 's2cut', 'roundEnd', 'debate', 'accuse', 'clues1', 'clues2', 'guess']);
async function main() {
  const t0 = Date.now();
  const room = await post('/api/rooms', { gameId: game, config: { audience: 'youth', difficulty: 'mixed', mode: 'individual', pace: 1.5 } });
  if (room.status !== 201) throw new Error('create ' + room.status + JSON.stringify(room.json));
  ({ code, hostKey } = room.json);
  console.log(`room ${code} for ${game}, ${N} bots`);

  let screenView = null;
  let skipAt = 0;
  const waiters = [];
  await sse(`${base}/api/rooms/${code}/stream?role=screen`, (v) => {
    if (screenView && (v.phase !== screenView.phase || v.round !== screenView.round) && skipAt) { lat.push(Date.now() - skipAt); skipAt = 0; }
    screenView = v;
    waiters.splice(0).forEach((w) => w());
  });

  const bots = Array.from({ length: N }, (_, i) => new Bot(i));
  const tj = Date.now();
  for (let i = 0; i < N; i += 20) { await Promise.all(bots.slice(i, i + 20).map((b) => b.join())); await sleep(500); }
  console.log(`joined ${N} bots in ${((Date.now() - tj) / 1000).toFixed(1)}s`);
  await sleep(600);
  if (screenView.count.total !== N) fails.push(`screen shows ${screenView.count.total} players, expected ${N}`);

  const start = await post(`/api/rooms/${code}/mc`, { hostKey, type: 'START', payload: {} });
  if (!start.json.ok) throw new Error('start ' + JSON.stringify(start.json));
  const handled = new Set();
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    await new Promise((r) => { waiters.push(r); setTimeout(r, 1000); });
    const v = screenView;
    if (v.phase === 'end') break;
    const key = `${v.round}:${v.phase}:${v.data?.turnIndex ?? ''}`;
    if (SKIPPABLE.has(v.phase) && !handled.has(key)) {
      handled.add(key);
      await sleep(400);
      skipAt = Date.now();
      await post(`/api/rooms/${code}/mc`, { hostKey, type: 'SKIP', payload: {} });
    }
  }
  const ok = screenView.phase === 'end' && screenView.podium?.length > 0;
  lat.sort((a, b) => a - b);
  const q = (p) => lat[Math.min(lat.length - 1, Math.floor(lat.length * p))] ?? 0;
  const m = await (await fetch(base + '/api/metrics')).json();
  console.log(JSON.stringify({ game, bots: N, finished: ok, seconds: Math.round((Date.now() - t0) / 1000), podium: screenView.podium?.map((p) => `${p.nickname}:${p.score}`), actions: sent.n, mcToScreenMsP50: q(0.5), p95: q(0.95), failures: fails.slice(0, 8), failureCount: fails.length, server: m }, null, 1));
  await post(`/api/rooms/${code}/mc`, { hostKey, type: 'CLOSE', payload: {} });
  process.exit(ok && fails.length === 0 ? 0 : 1);
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
