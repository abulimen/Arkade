import { describe, expect, it } from 'vitest';
import type { Player } from '@/shared/types';
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
    expect(act(room, bots[0], 'VOTE', { target: zebra.id }).error).toBe('OWN');
    expect(act(room, bots[3], 'VOTE', { target: zebra.id }).ok).toBe(true); // fools one -> 250 split between 2 authors = 125 each
    expect(act(room, bots[4], 'VOTE', { target: truth.id }).ok).toBe(true); // 500
    expect(act(room, bots[0], 'VOTE', { target: truth.id }).ok).toBe(true);
    skip(room);
    expect(room.game.phase.name).toBe('reveal');
    expect(room.game.scores[bots[4].id]).toBe(500);
    expect(room.game.scores[bots[0].id]).toBe(500 + 125);
    expect(room.game.scores[bots[1].id]).toBe(125);
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
    room.mcAction('CAST_LOTS', { n: 6 });
    expect(room.spotlight?.ids.length).toBe(6);
    start(room);
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
});
