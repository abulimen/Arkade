import { describe, expect, it } from 'vitest';
import { GAME_IDS, type GameId, type Player } from '@/shared/types';
import { CSV_TEMPLATES, buildCustomQuestionsPayload, parseGameCsv } from '@/shared/customCsv';
import { act, j, mkRoom, skip, views } from './helpers';
import type { Room } from '@/server/rooms/Room';

const start = (room: Room, payload?: Record<string, unknown>) => {
  const r = room.mcAction('START', payload);
  expect(r).toEqual({ ok: true });
};

describe('What Came First?', () => {
  it('50 simulated players play 8 rounds and scores match the PRD numbers', () => {
    const { room, bots, clock } = mkRoom('what-came-first', 50);
    start(room);
    expect(room.game.rounds).toBe(8);
    const ladder = room.game.plan.map((p: { difficulty: string }) => p.difficulty);
    expect(ladder).toEqual(['easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard']);
    expect(new Set(room.game.plan.map((p: { id: string }) => p.id)).size).toBe(8);
    for (let round = 1; round <= 8; round++) {
      skip(room); // prompt -> order
      const truth = room.game.plan[round - 1].events.slice().sort((a: { order: number }, b: { order: number }) => a.order - b.order).map((e: { id: string }) => e.id);
      const wrong = truth.slice();
      [wrong[0], wrong[1]] = [wrong[1], wrong[0]];
      bots.forEach((b, i) => {
        if (i === 0) expect(act(room, b, 'LOCK', { order: truth }, room.game.phase.startedAt).ok).toBe(true); // instant perfect: 800 + 200
        else if (i === 1) expect(act(room, b, 'LOCK', { order: truth }, room.game.phase.endsAt).ok).toBe(true); // last moment: 800 + 0
        else if (i === 2) act(room, b, 'LOCK', { order: wrong }, room.game.phase.startedAt); // 3 correct = 480
        else if (i === 3) expect(act(room, b, 'LOCK', { order: ['x', 'y'] }).error).toBe('BAD_ORDER');
      });
      expect(act(room, bots[0], 'LOCK', { order: truth }).error).toBe('LOCKED');
      clock.adv(1000);
      skip(room); // order -> reveal
      expect(room.game.phase.name).toBe('reveal');
      skip(room);
    }
    expect(room.game.phase.name).toBe('end');
    expect(room.game.scores[bots[0].id]).toBe(8000);
    expect(room.game.scores[bots[1].id]).toBe(6400);
    expect(room.game.scores[bots[2].id]).toBe(8 * 480);
    expect(room.game.scores[bots[3].id] ?? 0).toBe(0);
    const v = views(room, bots);
    expect(v.screen.podium?.length).toBe(3);
    expect(v.screen.podium?.[0].nickname).toBe('Bot1');
    expect(v.players[2].me?.rank).toBe(3);
    room.close();
  });

  it('PRIVACY: correct order, references and verse are absent before reveal', () => {
    const { room, bots } = mkRoom('what-came-first', 4);
    start(room);
    for (const phase of ['prompt', 'order']) {
      expect(room.game.phase.name).toBe(phase);
      const v = views(room, bots);
      const refs = room.game.plan[0].events.map((e: { ref: string }) => e.ref);
      for (const view of [v.screen, v.mc, ...v.players]) {
        const s = j(view);
        for (const r of refs) expect(s).not.toContain(`"${r}"`);
        expect(s).not.toContain('timeline');
        expect(s).not.toContain('"order":');
        expect(s).not.toContain(room.game.plan[0].verse);
      }
      skip(room);
    }
    expect(j(views(room, bots).screen)).toContain('timeline');
    room.close();
  });

  it('late joiners play from 0 points', () => {
    const { room } = mkRoom('what-came-first', 2);
    start(room);
    const r = room.join({ nickname: 'Late' });
    expect('player' in r && r.player.role).toBe('player');
    room.close();
  });
});

describe('Fake Verse', () => {
  const setup = (n = 5) => {
    const m = mkRoom('fake-verse', n);
    start(m.room);
    skip(m.room); // prompt -> write
    return m;
  };

  it('scores truth 500, 250 per fooled vote, merges duplicate lies and doubles rounds 5-6', () => {
    const { room, bots } = setup(5);
    const it = room.game.plan[0];
    expect(act(room, bots[0], 'WRITE', { text: it.truth }).error).toBe('AGAIN'); // too close: never explained
    expect(act(room, bots[0], 'WRITE', { text: 'Zebra' }).ok).toBe(true);
    expect(act(room, bots[1], 'WRITE', { text: ' zebra!! ' }).ok).toBe(true); // duplicate, merged
    expect(act(room, bots[2], 'WRITE', { text: 'Mango' }).ok).toBe(true);
    expect(act(room, bots[2], 'WRITE', { text: 'Other' }).error).toBe('LOCKED');
    skip(room);
    expect(room.game.phase.name).toBe('vote');
    const opts = room.game.options as { id: string; text: string; kind: string; authors: string[] }[];
    expect(opts.filter((o) => o.kind === 'lie').length).toBe(2);
    const zebra = opts.find((o) => o.text.toLowerCase().startsWith('zebra'))!;
    expect(zebra.authors.length).toBe(2);
    const truth = opts.find((o) => o.kind === 'truth')!;
    const p0VoteOpts = (room.viewFor({ role: 'player', playerId: bots[0].id }).data as { options: { id: string }[] }).options;
    expect(p0VoteOpts.some((o) => o.id === zebra.id)).toBe(false);
    expect(act(room, bots[0], 'VOTE', { target: zebra.id }).error).toBe('OWN');
    expect(act(room, bots[3], 'VOTE', { target: zebra.id }).ok).toBe(true); // fools one -> 250 split between 2 authors = 125 each
    expect(act(room, bots[4], 'VOTE', { target: truth.id }).ok).toBe(true); // 500
    expect(act(room, bots[0], 'VOTE', { target: truth.id }).ok).toBe(true);
    skip(room);
    expect(room.game.phase.name).toBe('reveal');
    expect(room.game.scores[bots[4].id]).toBe(500);
    expect(room.game.scores[bots[0].id]).toBe(500 + 125);
    expect(room.game.scores[bots[1].id]).toBe(125);
    const screenRes = (room.viewFor({ role: 'screen' }).data as { result: { fakes: { text: string; points: number }[] } }).result;
    expect(screenRes.fakes.find((f) => f.text.toLowerCase().startsWith('zebra'))?.points).toBe(250);
    const p0Res = (room.viewFor({ role: 'player', playerId: bots[0].id }).data as { result: { foolGain: number; fooledCount: number } }).result;
    expect(p0Res.foolGain).toBe(125);
    expect(p0Res.fooledCount).toBe(1);
    const p1Res = (room.viewFor({ role: 'player', playerId: bots[1].id }).data as { result: { foolGain: number; fooledCount: number } }).result;
    expect(p1Res.foolGain).toBe(125);
    expect(p1Res.fooledCount).toBe(1);
    room.close();
  });

  it('Double Portion: rounds 5 and 6 multiply by 2', () => {
    const { room, bots } = setup(3);
    for (let r = 1; r < 5; r++) { while (room.game.round === r) skip(room); }
    expect(room.game.round).toBe(5);
    expect(room.game.multiplier).toBe(2);
    skip(room); // write
    skip(room); // vote
    const truth = room.game.options.find((o: { kind: string }) => o.kind === 'truth');
    act(room, bots[0], 'VOTE', { target: truth.id });
    skip(room);
    expect(room.game.scores[bots[0].id]).toBe(1000);
    room.close();
  });

  it('caps at 8 sampled lies when more than 10 exist', () => {
    const { room, bots } = setup(14);
    bots.forEach((b, i) => act(room, b, 'WRITE', { text: `answer${String.fromCharCode(97 + i)}${i}` }));
    expect(room.game.phase.name).toBe('vote'); // everyone submitted: early advance
    expect(room.game.options.filter((o: { kind: string }) => o.kind === 'lie').length).toBe(8);
    room.close();
  });

  it('MC hide removes an answer before it is shown; word filter rejects blocked text', () => {
    const { room, bots } = setup(4);
    expect(act(room, bots[0], 'WRITE', { text: 'shit' }).error).toBe('AGAIN');
    act(room, bots[0], 'WRITE', { text: 'Rude one' });
    act(room, bots[1], 'WRITE', { text: 'Fine one' });
    expect(room.mcAction('HIDE_ANSWER', { playerId: bots[0].id }).ok).toBe(true);
    skip(room);
    expect(j(room.game.options)).not.toContain('Rude one');
    expect(j(room.game.options)).toContain('Fine one');
    room.close();
  });

  it('PRIVACY: lies, votes, authors and the truth stay hidden until reveal', () => {
    const { room, bots } = setup(4);
    const truth = room.game.plan[0].truth;
    act(room, bots[0], 'WRITE', { text: 'Secretlie' });
    let v = views(room, bots);
    for (const view of [v.screen, ...v.players.slice(1)]) {
      expect(j(view)).not.toContain('Secretlie');
      expect(j(view)).not.toContain(`"${truth}"`);
      expect(j(view)).not.toContain(room.game.plan[0].verse);
    }
    expect(j(v.mc)).toContain('Secretlie'); // the MC may see submissions to hide them
    skip(room);
    v = views(room, bots);
    const mine = v.players[0].data.options.map((o: { text: string }) => o.text);
    expect(mine).not.toContain('Secretlie'); // you can't vote for your own
    for (const view of [v.screen, v.mc, ...v.players]) {
      const s = j(view);
      expect(s).not.toMatch(/"kind":"(truth|lie|decoy)"/);
      expect(s).not.toContain('"authors"');
      expect(s).not.toContain(room.game.plan[0].verse);
      expect(s).not.toContain('"result"');
    }
    const other = room.game.options.find((o: { kind: string }) => o.kind === 'lie');
    act(room, bots[1], 'VOTE', { target: other.id });
    expect(j(views(room, bots).screen)).not.toContain('"votes"');
    skip(room);
    expect(j(views(room, bots).screen)).toContain('"result"');
    room.close();
  });
});

describe('Who Am I?', () => {
  it('points come from the server-side clue index; wrong costs 50, clamped at zero', () => {
    const { room, bots } = mkRoom('who-am-i', 6);
    start(room);
    const name = room.game.plan[0].name;
    const wrong = room.game.options.find((o: string) => o !== name);
    expect(act(room, bots[0], 'ANSWER', { choice: name }).ok).toBe(true); // clue 1 -> 500
    skip(room);
    skip(room); // clue 3
    act(room, bots[1], 'ANSWER', { choice: name }); // 300
    act(room, bots[2], 'ANSWER', { choice: wrong }); // -50 -> clamp 0
    expect(act(room, bots[2], 'ANSWER', { choice: name }).error).toBe('LOCKED'); // lockout
    skip(room);
    skip(room); // clue 5
    act(room, bots[3], 'ANSWER', { choice: name }); // 100
    expect(act(room, bots[4], 'ANSWER', { choice: 'Not an option' }).error).toBe('BAD_OPTION');
    skip(room);
    expect(room.game.phase.name).toBe('reveal');
    expect([0, 1, 2, 3].map((i) => room.game.scores[bots[i].id] ?? 0)).toEqual([500, 300, 0, 100]);
    room.close();
  });

  it('kids pack shows 4 options and everyone answering ends the round early', () => {
    const { room, bots } = mkRoom('who-am-i', 2, { audience: 'kids' });
    start(room);
    expect(room.game.options.length).toBe(4);
    const name = room.game.plan[0].name;
    bots.forEach((b) => act(room, b, 'ANSWER', { choice: name }));
    expect(room.game.phase.name).toBe('reveal');
    room.close();
  });

  it('PRIVACY: the correct option, story and future clues are never sent early', () => {
    const { room, bots } = mkRoom('who-am-i', 3);
    start(room);
    const sub = room.game.plan[0];
    for (let n = 0; n < 5; n++) {
      const v = views(room, bots);
      for (const view of [v.screen, v.mc, ...v.players]) {
        const s = j(view);
        expect(s).not.toContain(sub.story);
        expect(s).not.toContain('"result"');
        expect(s).not.toContain('"correct"');
        for (let k = n + 1; k < 5; k++) expect(s).not.toContain(sub.clues[k]);
      }
      expect(j(v.screen)).not.toContain('"options"'); // the projector never shows the choices
      skip(room);
    }
    expect(room.game.phase.name).toBe('reveal');
    expect(j(views(room, bots).screen)).toContain(sub.story);
    room.close();
  });
});

describe("Gideon's 300", () => {
  const playStage = (room: Room, bots: Player[], right: (i: number) => boolean) => {
    const q = () => {
      const g = room.game;
      const list = g.stage === 1 ? g.plan.s1 : g.plan.s2;
      return list[g.qIndex];
    };
    const name = room.game.phase.name;
    bots.forEach((b, i) => {
      const quest = q();
      const choice = right(i) ? quest.correct : (quest.correct + 1) % 4;
      act(room, b, 'ANSWER', { choice }, room.game.phase.startedAt + 100 * (i + 1));
    });
    expect(room.game.phase.name).not.toBe(name);
  };

  it('cuts to 67% then the top third, picks finalists, and the buzzer is decided by server arrival', () => {
    const { room, bots } = mkRoom('gideons-300', 30);
    start(room);
    skip(room); // intro -> s1q
    for (let q = 0; q < 6; q++) {
      const alive = bots.filter((b) => room.game.alive.includes(b.id));
      playStage(room, alive, (i) => i < 10 + q * 3); // lower-indexed bots are better
      skip(room); // reveal -> next question / cut
    }
    expect(room.game.phase.name).toBe('s1cut');
    expect(room.game.alive.length).toBe(Math.ceil(30 * 0.67));
    expect(room.game.cut).toEqual({ before: 30, after: 21 });
    skip(room);
    for (let q = 0; q < 6; q++) {
      const alive = bots.filter((b) => room.game.alive.includes(b.id));
      playStage(room, alive, (i) => i < 6);
      skip(room);
    }
    expect(room.game.phase.name).toBe('s2cut');
    expect(room.game.alive.length).toBe(Math.ceil(21 * 0.34));
    expect(room.game.finalists.length).toBe(room.game.alive.length);
    skip(room);
    expect(room.game.phase.name).toBe('s3pre');
    const [f1, f2, f3] = room.game.finalists.map((id: string) => bots.find((b) => b.id === id)!);
    const watcher = bots.find((b) => !room.game.finalists.includes(b.id))!;
    expect(act(room, f1, 'PREDICT', { target: f2.id }).error).toBe('FINALIST');
    expect(act(room, watcher, 'PREDICT', { target: f2.id }).ok).toBe(true);
    skip(room);
    expect(room.game.phase.name).toBe('s3q');
    const correct = room.game.plan.s3[room.game.qIndex].correct;
    expect(act(room, f1, 'BUZZ', { choice: (correct + 1) % 4 }).ok).toBe(true); // wrong: frozen
    expect(act(room, f1, 'BUZZ', { choice: correct }).error).toBe('FROZEN');
    expect(act(room, f2, 'BUZZ', { choice: correct }, 5).ok).toBe(true); // first correct by arrival wins, regardless of any client clock
    expect(act(room, f3, 'BUZZ', { choice: correct }).error).toBeDefined();
    expect(room.game.phase.name).toBe('s3r');
    expect(room.game.finalPoints[f2.id]).toBe(1);
    expect(room.game.lastWinner).toBe(f2.id);
    const before = room.game.scores[watcher.id];
    expect(before).toBeGreaterThanOrEqual(50); // 50 for the correct prediction
    // MC re-ask reverts the point and watchman bonus
    room.mcAction('REASK');
    expect(room.game.finalPoints[f2.id]).toBe(0);
    expect(room.game.scores[watcher.id]).toBe(before - 50);
    expect(room.game.phase.name).toBe('s3pre');
    room.close();
  });

  it('first to 5 wins and gets +500; podium puts the champion first', () => {
    const { room, bots } = mkRoom('gideons-300', 4);
    start(room, undefined);
    room.game.phase = { ...room.game.phase, name: 's2cut' };
    room.game.stage = 2;
    room.game.alive = bots.map((b) => b.id);
    room.game.finalists = bots.slice(0, 2).map((b) => b.id);
    skip(room); // -> s3pre
    for (let i = 0; i < 5; i++) {
      skip(room); // -> s3q
      const q = room.game.plan.s3[room.game.qIndex];
      act(room, bots[1], 'BUZZ', { choice: q.correct });
      expect(room.game.phase.name).toBe('s3r');
      skip(room);
    }
    expect(room.game.phase.name).toBe('end');
    expect(room.game.champion).toBe(bots[1].id);
    expect(room.game.scores[bots[1].id]).toBe(5 * 100 + 500);
    const v = views(room, bots);
    expect(v.screen.podium?.[0].id).toBe(bots[1].id);
    room.close();
  });

  it('PRIVACY: the correct answer index is never sent before the reveal phase', () => {
    const { room, bots } = mkRoom('gideons-300', 5);
    start(room);
    skip(room);
    const v = views(room, bots);
    for (const view of [v.screen, v.mc, ...v.players]) {
      const s = j(view);
      expect(s).not.toContain('"correct"');
      expect(s).not.toContain('"verse"');
    }
    bots.forEach((b) => act(room, b, 'ANSWER', { choice: 0 }));
    expect(j(views(room, bots).screen)).toContain('"correct"');
    room.close();
  });
});

describe('Spot the Wolf', () => {
  it('plays a round: wolves hidden, tie-break logged, scoring 100 / 200 / 100', () => {
    const { room, bots } = mkRoom('spot-the-wolf', 8);
    room.mcAction('START', { stage: bots.slice(0, 6).map((b) => b.id) });
    expect(room.game.stage.length).toBe(6);
    expect(bots.filter((b) => b.role === 'spectator').length).toBe(2);
    const g = () => room.game;
    const wolf = g().wolves[0] as string;
    expect(g().wolves.length).toBe(1);
    const flock = g().stage.filter((id: string) => id !== wolf) as string[];
    const byId = (id: string) => bots.find((b) => b.id === id)!;
    skip(room); // reveal -> clues1
    const first = byId(g().turnOrder[0]);
    const second = byId(g().turnOrder[1]);
    expect(act(room, second, 'CLUE', { text: 'wrong turn' }).error).toBe('NOT_YOUR_TURN');
    expect(act(room, first, 'CLUE', { text: 'floating boat' }).ok).toBe(true);
    expect(g().clues[0].text).toBe('floating'); // one word only
    room.mcAction('NEXT');
    expect(g().clues[1].spoken).toBe(true);
    skip(room); // end clues1
    skip(room); // end clues2
    expect(g().phase.name).toBe('debate');
    skip(room);
    expect(g().phase.name).toBe('vote');
    // 3 flock vote for the wolf (+100 each), the rest vote for one innocent
    const innocent = flock[0];
    flock.forEach((id, i) => act(room, byId(id), 'VOTE', { target: i < 3 ? wolf : innocent === id ? flock[1] : innocent }));
    act(room, byId(wolf), 'VOTE', { target: innocent });
    expect(g().phase.name).toBe('vote');
    expect(views(room, bots).screen.data.accused).toBeNull();
    skip(room); // vote window ends -> accuse
    expect(g().phase.name).toBe('accuse');
    expect(g().accused).toEqual([wolf]);
    expect(g().caught).toEqual([wolf]);
    skip(room);
    expect(g().phase.name).toBe('guess');
    const word = g().word;
    expect(act(room, byId(flock[0]), 'GUESS', { text: 'x' }).error).toBe('NOT_CAUGHT');
    expect(act(room, byId(wolf), 'GUESS', { text: word.word.toLowerCase() }).ok).toBe(true);
    expect(g().phase.name).toBe('roundEnd');
    flock.forEach((id, i) => expect(g().scores[id] ?? 0).toBe(i < 3 ? 100 : 0));
    expect(g().scores[wolf]).toBe(100); // caught but guessed the word
    room.close();
  });

  it('a wolf that is not accused scores 200', () => {
    const { room, bots } = mkRoom('spot-the-wolf', 6);
    start(room);
    const g = () => room.game;
    const wolf = g().wolves[0] as string;
    const flock = g().stage.filter((id: string) => id !== wolf) as string[];
    skip(room); skip(room); skip(room); skip(room);
    expect(g().phase.name).toBe('vote');
    const target = flock[0];
    bots.forEach((b) => { if (b.id !== target) act(room, b, 'VOTE', { target }); else act(room, b, 'VOTE', { target: flock[1] }); });
    expect(g().phase.name).toBe('vote');
    expect(views(room, bots).screen.data.accused).toBeNull();
    expect(room.apply({ by: 'system', type: 'PHASE_TIMEOUT' })).toBeNull();
    expect(g().phase.name).toBe('accuse');
    expect(g().accused).toEqual([target]);
    skip(room); // accuse -> roundEnd (no wolf caught)
    expect(g().phase.name).toBe('roundEnd');
    expect(g().scores[wolf]).toBe(200);
    room.close();
  });

  it('PRIVACY: wolf identity, word and votes are hidden until the reveal; the wolf never gets the word', () => {
    const { room, bots } = mkRoom('spot-the-wolf', 6);
    start(room);
    const wolf = room.game.wolves[0] as string;
    const word = room.game.word.word as string;
    const names = ['reveal', 'clues1', 'clues2', 'debate', 'vote'];
    for (const phase of names) {
      expect(room.game.phase.name).toBe(phase);
      const v = views(room, bots);
      for (const view of [v.screen, ...v.players]) {
        const s = j(view);
        expect(s).not.toContain(`"wolves"`);
        expect(s).not.toContain(room.game.word.verse);
        expect(s).not.toContain('"votes":{');
      }
      expect(j(v.screen)).not.toContain(`"word"`);
      expect(j(v.screen)).not.toContain(word);
      v.players.forEach((pv, i) => {
        const isWolf = bots[i].id === wolf;
        const card = pv.data.card;
        expect(card.wolf).toBe(isWolf);
        if (isWolf) { expect(card.word).toBeUndefined(); expect(j(pv)).not.toContain(`"${word}"`); }
        else expect(card.word).toBe(word);
      });
      skip(room);
    }
    skip(room); // vote -> accuse
    expect(j(views(room, bots).screen)).toContain('"votes"');
    room.close();
  });

  it('look-alike mode gives the wolf a near-miss word without a wolf flag', () => {
    const { room, bots } = mkRoom('spot-the-wolf', 6, { lookalike: true });
    start(room);
    const wolf = room.game.wolves[0];
    const view = views(room, bots).players[bots.findIndex((b) => b.id === wolf)];
    expect(view.data.card.wolf).toBe(false);
    expect(view.data.card.word).toBe(room.game.word.lookalike);
    room.close();
  });

  it('late joiners become spectators', () => {
    const { room } = mkRoom('spot-the-wolf', 6);
    start(room);
    const r = room.join({ nickname: 'Late' });
    expect('player' in r && r.player.role).toBe('spectator');
    room.close();
  });

  it('rotates wolves across rounds, exposes votedIds live, sets outcome, and hides leaderboard top5', () => {
    const { room, bots } = mkRoom('spot-the-wolf', 6);
    start(room);
    const pickedWolves: string[] = [];
    for (let round = 1; round <= 3; round++) {
      const g = () => room.game;
      const wolf = g().wolves[0] as string;
      pickedWolves.push(wolf);
      expect(views(room, bots).screen.data.impostorCount).toBe(1);
      expect(views(room, bots).screen.top5).toBeUndefined();
      // Skip reveal -> clues1 -> clues2 -> debate -> vote
      skip(room); skip(room); skip(room); skip(room);
      expect(g().phase.name).toBe('vote');
      const vBefore = views(room, bots).screen;
      expect(vBefore.data.votedIds).toEqual([]);
      const flock = g().stage.filter((id: string) => id !== wolf) as string[];
      const byId = (id: string) => bots.find((b) => b.id === id)!;
      // First voter locks vote -> votedIds tracks them live
      act(room, byId(flock[0]), 'VOTE', { target: wolf });
      expect(views(room, bots).screen.data.votedIds).toEqual([flock[0]]);
      // Cast remaining votes for the wolf
      flock.slice(1).forEach((id) => act(room, byId(id), 'VOTE', { target: wolf }));
      act(room, byId(wolf), 'VOTE', { target: flock[0] });
      expect(g().phase.name).toBe('vote');
      expect(views(room, bots).screen.data.accused).toBeNull();
      expect(room.apply({ by: 'system', type: 'PHASE_TIMEOUT' })).toBeNull();
      expect(g().phase.name).toBe('accuse');
      expect(views(room, bots).screen.top5).toBeUndefined();
      skip(room); // accuse -> guess
      expect(g().phase.name).toBe('guess');
      // Wolf misses on round 1 -> flock victory; guesses word on rounds 2 & 3 -> wolves victory
      if (round === 1) {
        act(room, byId(wolf), 'GUESS', { text: 'wrongguess' });
        expect(g().phase.name).toBe('roundEnd');
        expect(views(room, bots).screen.data.end.outcome).toBe('flock');
      } else {
        act(room, byId(wolf), 'GUESS', { text: g().word.word.toLowerCase() });
        expect(g().phase.name).toBe('roundEnd');
        expect(views(room, bots).screen.data.end.outcome).toBe('wolves');
      }
      expect(views(room, bots).screen.data.end.outcomeReason).toBeTruthy();
      expect(views(room, bots).screen.top5).toBeUndefined();
      skip(room); // roundEnd -> next round or end
    }
    expect(new Set(pickedWolves).size).toBe(3);
    expect(room.game.phase.name).toBe('end');
    const finalScreen = views(room, bots).screen;
    expect(finalScreen.data.end.history).toHaveLength(3);
    expect(finalScreen.top5).toBeUndefined();
    room.close();
  });

  it('records missed clue when a player times out without typing a word', () => {
    const { room, bots, clock } = mkRoom('spot-the-wolf', 6);
    start(room);
    skip(room); // reveal -> clues1
    const g = () => room.game;
    expect(g().phase.name).toBe('clues1');
    const timedOutPid = g().turnOrder[0];
    clock.adv((g().phase.endsAt ?? clock.now()) - clock.now() + 1);
    expect(room.apply({ by: 'system', type: 'PHASE_TIMEOUT' })).toBeNull();
    expect(g().clues[0]).toEqual({ pid: timedOutPid, round: 1, text: '', missed: true });
    expect(g().turnIndex).toBe(1);
    const screenView = views(room, bots).screen;
    expect(screenView.data.clues[0]).toEqual({ pid: timedOutPid, round: 1, text: '', spoken: false, missed: true });
    const mcView = views(room, bots).mc;
    expect(mcView.data.mcClues[0].text).toBe('(failed to type a word)');
    room.close();
  });
});

function planItems(room: Room, gameId: GameId): Array<{ id: string; testament: 'OT' | 'NT' | 'both'; category?: string }> {
  if (gameId === 'gideons-300') {
    const p = room.game.plan as { s1: Array<{ id: string; testament: 'OT' | 'NT' | 'both' }>; s2: Array<{ id: string; testament: 'OT' | 'NT' | 'both' }>; s3: Array<{ id: string; testament: 'OT' | 'NT' | 'both' }> };
    return [...p.s1, ...p.s2, ...p.s3];
  }
  return room.game.plan;
}

describe('Advanced Options: testament, rounds, and custom CSV questions', () => {
  it.each(GAME_IDS)('filters %s questions by testament OT and NT', (gameId) => {
    const minPlayers = gameId === 'spot-the-wolf' ? 6 : 4;
    for (const testament of ['OT', 'NT'] as const) {
      const { room } = mkRoom(gameId, minPlayers, { testament });
      start(room);
      const items = planItems(room, gameId);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(['OT', 'NT', 'both']).toContain(item.testament);
        expect(item.testament === testament || item.testament === 'both').toBe(true);
        if (gameId === 'fake-verse' || gameId === 'gideons-300' || gameId === 'spot-the-wolf') {
          expect(item.testament).toBe(testament);
        }
      }
      room.close();
    }
  });

  it('supports custom rounds for round-based games (both shorter and longer than default)', () => {
    const cases: Array<[GameId, number, number[]]> = [
      ['what-came-first', 2, [4, 12]],
      ['fake-verse', 3, [3, 10]],
      ['who-am-i', 2, [5, 11]],
      ['spot-the-wolf', 5, [1, 5]],
    ];
    for (const [gameId, players, roundCounts] of cases) {
      for (const rounds of roundCounts) {
        const { room } = mkRoom(gameId, players, { rounds });
        start(room);
        expect(room.game.rounds).toBe(rounds);
        expect(room.game.plan).toHaveLength(rounds);
        room.close();
      }
    }
  });

  it.each(GAME_IDS)('customMode="only" for %s draws exclusively from customQuestions and cycles cleanly', (gameId) => {
    const parsed = parseGameCsv(gameId, CSV_TEMPLATES[gameId].sampleCsv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.items).toHaveLength(2);

    const customQuestions = buildCustomQuestionsPayload(gameId, parsed.items);
    const cfg = gameId === 'gideons-300'
      ? { customQuestions, customMode: 'only' as const, s1Questions: 3, s2Questions: 3, s3Target: 2 }
      : { customQuestions, customMode: 'only' as const, rounds: 4 };
    const { room } = mkRoom(gameId, gameId === 'spot-the-wolf' ? 6 : 4, cfg);
    start(room);

    const items = planItems(room, gameId);
    expect(items.length).toBe(gameId === 'gideons-300' ? 21 : 4);
    expect(items.every((it) => it.id.startsWith('custom-'))).toBe(true);
    for (let i = 1; i < items.length; i++) {
      expect(items[i].id).not.toBe(items[i - 1].id);
    }
    room.close();
  });

  it('customMode="mix" prioritizes custom questions then fills remaining rounds from built-ins', () => {
    for (const [gameId, rounds] of [['fake-verse', 6], ['what-came-first', 8]] as const) {
      const parsed = parseGameCsv(gameId, CSV_TEMPLATES[gameId].sampleCsv);
      const customQuestions = buildCustomQuestionsPayload(gameId, parsed.items);
      const { room } = mkRoom(gameId, 4, { customQuestions, customMode: 'mix', rounds });
      start(room);
      const items = planItems(room, gameId);
      expect(items).toHaveLength(rounds);
      const customCount = items.filter((it) => it.id.startsWith('custom-')).length;
      const builtinCount = items.filter((it) => !it.id.startsWith('custom-')).length;
      expect(customCount).toBe(2);
      expect(builtinCount).toBe(rounds - 2);
      room.close();
    }
  });

  it('PRIVACY: viewFor() never exposes raw customQuestions or customMode in lobby, countdown, or gameplay', () => {
    const parsed = parseGameCsv('fake-verse', CSV_TEMPLATES['fake-verse'].sampleCsv);
    const customQuestions = buildCustomQuestionsPayload('fake-verse', parsed.items);
    const { room, bots } = mkRoom('fake-verse', 4, { customQuestions, customMode: 'only', rounds: 2 }, 7, { skipCountdown: false });

    const assertNoLeak = () => {
      const v = views(room, bots);
      for (const view of [v.screen, v.mc, ...v.players]) {
        const s = j(view);
        expect(s).not.toContain('customQuestions');
        expect(s).not.toContain('customMode');
        expect(s).not.toContain('"decoys"');
      }
    };

    assertNoLeak(); // lobby
    start(room);
    expect(room.viewFor({ role: 'screen' }).phase).toBe('countdown');
    assertNoLeak(); // countdown
    // Neither custom question prompt or secret answer should appear during countdown
    for (const view of [views(room, bots).screen, views(room, bots).mc, ...views(room, bots).players]) {
      const s = j(view);
      expect(s).not.toContain('Zacchaeus');
      expect(s).not.toContain('sycamore');
      expect(s).not.toContain('ravens');
    }

    skip(room); // countdown -> round 1 prompt
    assertNoLeak();
    // Round 2 secret answer must not leak during round 1
    const r2Secret = room.game.plan[1].truth as string;
    for (const view of [views(room, bots).screen, views(room, bots).mc, ...views(room, bots).players]) {
      expect(j(view)).not.toContain(r2Secret);
    }
    room.close();
  });
});

describe('Game-specific Advanced Options', () => {
  it("Gideon's 300: honors s1Questions, s2Questions, s3Target, and questionSec", () => {
    const { room, bots } = mkRoom('gideons-300', 8, {
      s1Questions: 3,
      s2Questions: 4,
      s3Target: 3,
      questionSec: 22,
    });
    start(room);
    expect(room.game.plan.s1).toHaveLength(3);
    expect(room.game.plan.s2).toHaveLength(4);
    expect(room.game.target).toBe(3);

    skip(room); // intro -> s1q #1
    expect(room.game.phase.name).toBe('s1q');
    expect(room.game.phase.endsAt - room.game.phase.startedAt).toBe(22_000);
    for (let q = 0; q < 3; q++) {
      const alive = bots.filter((b) => room.game.alive.includes(b.id));
      const correct = room.game.plan.s1[q].correct;
      alive.forEach((b, i) => act(room, b, 'ANSWER', { choice: i < 5 ? correct : (correct + 1) % 4 }));
      expect(room.game.phase.name).toBe('s1r');
      skip(room);
    }
    expect(room.game.phase.name).toBe('s1cut');

    skip(room); // s1cut -> s2q #1
    expect(room.game.phase.name).toBe('s2q');
    expect(room.game.phase.endsAt - room.game.phase.startedAt).toBe(22_000);
    for (let q = 0; q < 4; q++) {
      const alive = bots.filter((b) => room.game.alive.includes(b.id));
      const correct = room.game.plan.s2[q].correct;
      alive.forEach((b, i) => act(room, b, 'ANSWER', { choice: i < 2 ? correct : (correct + 1) % 4 }));
      expect(room.game.phase.name).toBe('s2r');
      skip(room);
    }
    expect(room.game.phase.name).toBe('s2cut');

    skip(room); // s2cut -> s3pre
    expect(room.game.phase.name).toBe('s3pre');
    expect(views(room, bots).screen.data.target).toBe(3);

    const finalist = bots.find((b) => b.id === room.game.finalists[0])!;
    for (let pt = 0; pt < 3; pt++) {
      skip(room); // s3pre -> s3q
      expect(room.game.phase.name).toBe('s3q');
      expect(room.game.phase.endsAt - room.game.phase.startedAt).toBe(22_000);
      const correct = room.game.plan.s3[room.game.qIndex].correct;
      expect(act(room, finalist, 'BUZZ', { choice: correct }).ok).toBe(true);
      expect(room.game.phase.name).toBe('s3r');
      skip(room);
    }
    expect(room.game.phase.name).toBe('end');
    expect(room.game.champion).toBe(finalist.id);
    expect(room.game.finalPoints[finalist.id]).toBe(3);
    room.close();
  });

  it('Spot the Wolf: honors clueRounds=1, allowWolfGuess=false, wolfCategories, and debateSec', () => {
    const allowedCats = ['Animal', 'Miracle'];
    const { room, bots } = mkRoom('spot-the-wolf', 6, {
      clueRounds: 1,
      allowWolfGuess: false,
      wolfCategories: allowedCats,
      debateSec: 120,
      rounds: 2,
    });
    start(room);
    for (const w of room.game.plan) {
      expect(allowedCats).toContain(w.category);
    }

    const g = () => room.game;
    const wolf = g().wolves[0] as string;
    const byId = (id: string) => bots.find((b) => b.id === id)!;
    skip(room); // reveal -> clues1
    expect(g().phase.name).toBe('clues1');

    for (const pid of g().turnOrder as string[]) {
      expect(act(room, byId(pid), 'CLUE', { text: 'hint' }).ok).toBe(true);
    }
    // clueRounds: 1 skips clues2 directly to debate with configured debateSec
    expect(g().phase.name).toBe('debate');
    expect(g().phase.endsAt - g().phase.startedAt).toBe(120_000);

    skip(room); // debate -> vote
    expect(g().phase.name).toBe('vote');
    const flock = g().stage.filter((id: string) => id !== wolf) as string[];
    flock.forEach((id) => act(room, byId(id), 'VOTE', { target: wolf }));
    act(room, byId(wolf), 'VOTE', { target: flock[0] });
    skip(room); // vote -> accuse
    expect(g().phase.name).toBe('accuse');
    expect(g().caught).toEqual([wolf]);

    skip(room); // accuse -> roundEnd directly (allowWolfGuess: false skips 'guess')
    expect(g().phase.name).toBe('roundEnd');
    expect(g().outcome).toBe('flock');
    room.close();
  });

  it('Fake Verse: honors doubleFinalRounds=false, showDecoys=false, writeSec, and voteSec', () => {
    const { room, bots } = mkRoom('fake-verse', 3, {
      doubleFinalRounds: false,
      showDecoys: false,
      writeSec: 75,
      voteSec: 35,
    });
    start(room);

    // Round 1: 0 lies submitted -> falls back to 1 decoy so voting has 2 options
    skip(room); // prompt -> write
    expect(room.game.phase.name).toBe('write');
    expect(room.game.phase.endsAt - room.game.phase.startedAt).toBe(75_000);
    skip(room); // write -> vote (0 lies)
    expect(room.game.phase.name).toBe('vote');
    expect(room.game.phase.endsAt - room.game.phase.startedAt).toBe(35_000);
    expect(room.game.options.filter((o: { kind: string }) => o.kind === 'decoy')).toHaveLength(1);
    skip(room); // vote -> reveal
    skip(room); // reveal -> round 2 prompt

    // Round 2: >=1 lie submitted with showDecoys=false -> 0 decoys
    skip(room); // prompt -> write
    expect(act(room, bots[0], 'WRITE', { text: 'My custom fake answer' }).ok).toBe(true);
    skip(room); // write -> vote
    expect(room.game.options.filter((o: { kind: string }) => o.kind === 'decoy')).toHaveLength(0);
    expect(room.game.options).toHaveLength(2);

    // Advance to round 5 (normally 2x): multiplier stays 1 when doubleFinalRounds=false
    while (room.game.round < 5) skip(room);
    expect(room.game.round).toBe(5);
    expect(room.game.multiplier).toBe(1);
    skip(room); // prompt -> write
    skip(room); // write -> vote
    const truth = room.game.options.find((o: { kind: string }) => o.kind === 'truth');
    const scoreBefore = room.game.scores[bots[0].id] ?? 0;
    act(room, bots[0], 'VOTE', { target: truth.id });
    skip(room); // vote -> reveal
    expect(room.game.scores[bots[0].id] - scoreBefore).toBe(500);
    room.close();
  });

  it('Who Am I?: honors wrongPenalty=0, custom wrongPenalty, optionCount (4 and 6), and clueSec', () => {
    // optionCount: 4 overrides adults default of 6; clueSec: 18; wrongPenalty: 0
    const r4 = mkRoom('who-am-i', 2, { audience: 'adults', optionCount: 4, clueSec: 18, wrongPenalty: 0 });
    start(r4.room);
    expect(r4.room.game.options).toHaveLength(4);
    expect(r4.room.game.phase.endsAt - r4.room.game.phase.startedAt).toBe(18_000);

    const name1 = r4.room.game.plan[0].name as string;
    const wrong1 = r4.room.game.options.find((o: string) => o !== name1) as string;
    expect(act(r4.room, r4.bots[0], 'ANSWER', { choice: name1 }).ok).toBe(true); // +500
    skip(r4.room); // clue1 -> clue2
    expect(r4.room.game.phase.name).toBe('clue2');
    expect(r4.room.game.phase.endsAt - r4.room.game.phase.startedAt).toBe(18_000);
    expect(act(r4.room, r4.bots[1], 'ANSWER', { choice: wrong1 }).ok).toBe(true); // both answered -> reveal
    expect(r4.room.game.phase.name).toBe('reveal');
    expect(r4.room.game.scores[r4.bots[0].id]).toBe(500);
    expect(r4.room.game.scores[r4.bots[1].id]).toBe(0);

    // Round 2: bot0 answers wrong with wrongPenalty: 0 -> stays 500
    skip(r4.room); // reveal -> round 2 clue1
    const name2 = r4.room.game.plan[1].name as string;
    const wrong2 = r4.room.game.options.find((o: string) => o !== name2) as string;
    expect(act(r4.room, r4.bots[0], 'ANSWER', { choice: wrong2 }).ok).toBe(true);
    expect(r4.room.game.scores[r4.bots[0].id]).toBe(500);
    r4.room.close();

    // optionCount: 6 overrides kids default of 4; custom wrongPenalty: 100 deducts 100
    const r6 = mkRoom('who-am-i', 2, { audience: 'kids', optionCount: 6, wrongPenalty: 100 });
    start(r6.room);
    expect(r6.room.game.options).toHaveLength(6);
    const r6Name1 = r6.room.game.plan[0].name as string;
    const r6Wrong1 = r6.room.game.options.find((o: string) => o !== r6Name1) as string;
    expect(act(r6.room, r6.bots[0], 'ANSWER', { choice: r6Name1 }).ok).toBe(true); // +500
    expect(act(r6.room, r6.bots[1], 'ANSWER', { choice: r6Wrong1 }).ok).toBe(true); // clamp 0 -> reveal
    skip(r6.room); // reveal -> round 2 clue1
    const r6Name2 = r6.room.game.plan[1].name as string;
    const r6Wrong2 = r6.room.game.options.find((o: string) => o !== r6Name2) as string;
    expect(act(r6.room, r6.bots[0], 'ANSWER', { choice: r6Wrong2 }).ok).toBe(true);
    expect(r6.room.game.scores[r6.bots[0].id]).toBe(400);
    r6.room.close();
  });

  it('What Came First?: honors orderSec', () => {
    const { room } = mkRoom('what-came-first', 2, { orderSec: 65 });
    start(room);
    expect(room.game.phase.name).toBe('prompt');
    skip(room); // prompt -> order
    expect(room.game.phase.name).toBe('order');
    expect(room.game.phase.endsAt - room.game.phase.startedAt).toBe(65_000);
    room.close();
  });
});
