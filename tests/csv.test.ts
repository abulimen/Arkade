import { describe, expect, it } from 'vitest';
import { GET as getTemplate } from '@/app/api/content/template/[game]/route';
import {
  CSV_TEMPLATES,
  MAX_CUSTOM_QUESTIONS,
  WOLF_CATEGORIES,
  buildCustomQuestionsPayload,
  parseCsvRows,
  parseGameCsv,
} from '@/shared/customCsv';
import { CustomQuestionsSchema, FvSchema, G3Schema, WaiSchema, WcfSchema, WolfSchema } from '@/shared/schemas';
import { GAME_IDS, type GameId } from '@/shared/types';

describe('parseCsvRows (RFC-4180)', () => {
  it('strips UTF-8 BOM and handles CRLF, LF, quoted commas, spaces, escaped quotes, multiline cells, and trailing empty lines', () => {
    const raw =
      '\uFEFFcol1,col2,col3\r\n' +
      '"hello, world","  padded  ","say ""hi"""\r\n' +
      '"line 1\r\nline 2",plain,""\n' +
      '\r\n  \n';
    expect(parseCsvRows(raw)).toEqual([
      ['col1', 'col2', 'col3'],
      ['hello, world', '  padded  ', 'say "hi"'],
      ['line 1\nline 2', 'plain', ''],
    ]);
  });

  it('returns empty array for empty or BOM-only input', () => {
    expect(parseCsvRows('')).toEqual([]);
    expect(parseCsvRows('\uFEFF\r\n\n')).toEqual([]);
  });
});

describe('CSV_TEMPLATES round-trip', () => {
  const schemas: Record<GameId, { safeParse: (v: unknown) => { success: boolean } }> = {
    'what-came-first': WcfSchema,
    'fake-verse': FvSchema,
    'who-am-i': WaiSchema,
    'gideons-300': G3Schema,
    'spot-the-wolf': WolfSchema,
  };

  it.each(GAME_IDS)('parses %s template with 0 errors, 2 items, and valid Zod schemas', (gameId) => {
    const tpl = CSV_TEMPLATES[gameId];
    const result = parseGameCsv(gameId, tpl.sampleCsv);
    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(2);
    for (const item of result.items) {
      expect(schemas[gameId].safeParse(item).success).toBe(true);
    }
  });

  it('rotates gideons-300 correct option index deterministically and keeps wolf categories valid', () => {
    const g3 = parseGameCsv('gideons-300', CSV_TEMPLATES['gideons-300'].sampleCsv);
    expect(g3.items[0].correct).toBe(1);
    expect(g3.items[1].correct).toBe(0);

    const wolf = parseGameCsv('spot-the-wolf', CSV_TEMPLATES['spot-the-wolf'].sampleCsv);
    for (const item of wolf.items) {
      expect(WOLF_CATEGORIES).toContain(item.category);
      expect(item.aliases.length).toBeGreaterThan(0);
    }
  });
});

describe('parseGameCsv minimal columns & flexible headers', () => {
  it('defaults optional metadata and normalizes fake-verse blanks and aliases', () => {
    const csv = [
      '\uFEFFPrompt,Answer,Wrong1,Wrong2,VerseRef',
      '"In the beginning God created the [blank].",heaven,earth,oceans,"Genesis 1:1"',
      '"Jesus wept for ___ days?",four,two,seven,',
    ].join('\r\n');

    const res = parseGameCsv('fake-verse', csv);
    expect(res.errors).toEqual([]);
    expect(res.items).toHaveLength(2);

    expect(res.items[0]).toMatchObject({
      id: 'custom-fake-verse-2',
      text: 'In the beginning God created the ____.',
      truth: 'heaven',
      decoys: ['earth', 'oceans'],
      difficulty: 'medium',
      testament: 'both',
      ref: 'Genesis 1:1',
      verse: 'Custom Bible question uploaded by the host.',
      translation: 'KJV',
      review: 'approved',
    });
    expect(res.items[1]).toMatchObject({
      id: 'custom-fake-verse-3',
      text: 'Jesus wept for ____ days?',
      ref: 'Bible 1:1',
    });
  });

  it('defaults what-came-first event refs to verse_ref (or Bible 1:1)', () => {
    const csv = [
      'event1,event2,event3,event4,event5,ref',
      'First day,Second day,Third day,Fourth day,Fifth day,Genesis 1',
      'Creation,Flood,Exodus,Kingdom,Exile,',
    ].join('\n');

    const res = parseGameCsv('what-came-first', csv);
    expect(res.errors).toEqual([]);
    expect(res.items).toHaveLength(2);
    expect(res.items[0].events.map((e) => e.ref)).toEqual(Array(5).fill('Genesis 1'));
    expect(res.items[1].events.map((e) => e.ref)).toEqual(Array(5).fill('Bible 1:1'));
  });

  it('handles minimal who-am-i with short name default story and puts name first in options', () => {
    const csv = [
      'name,clue1,clue2,clue3,clue4,clue5,wrong1,wrong2,wrong3,wrong4,wrong5',
      'Job,I lived in the land of Uz.,I lost my wealth in one day.,My friends gave me poor advice.,God spoke to me from a whirlwind.,God restored twice what I had before.,Noah,Moses,David,Elijah,Daniel',
    ].join('\n');

    const res = parseGameCsv('who-am-i', csv);
    expect(res.errors).toEqual([]);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].options[0]).toBe('Job');
    expect(res.items[0].story.length).toBeGreaterThanOrEqual(10);
  });

  it('handles minimal spot-the-wolf defaulting category to General and splitting semicolon aliases', () => {
    const csv = [
      'word,aliases',
      'Shepherd,good shepherd;pastor',
    ].join('\n');

    const res = parseGameCsv('spot-the-wolf', csv);
    expect(res.errors).toEqual([]);
    expect(res.items[0]).toMatchObject({
      word: 'Shepherd',
      category: 'General',
      aliases: ['good shepherd', 'pastor'],
    });
    expect(res.items[0].lookalike).toBeUndefined();
  });

  it('accepts flexible header aliases for gideons-300', () => {
    const csv = [
      'Question,Correct,wrong1,wrong2,wrong3,ref',
      '"Who built the ark in Genesis?",Noah,Moses,Abraham,Isaac,Genesis 6:14',
    ].join('\n');

    const res = parseGameCsv('gideons-300', csv);
    expect(res.errors).toEqual([]);
    expect(res.items[0].options[res.items[0].correct]).toBe('Noah');
    expect(res.items[0].ref).toBe('Genesis 6:14');
  });
});

describe('parseGameCsv validation & row-level errors', () => {
  it('reports 1-based row numbers for malformed rows while keeping valid rows', () => {
    const fvCsv = [
      'prompt,truth,decoy1,decoy2',
      'Valid prompt with ____ blank.,bread,stone,fish',
      '',
      'Prompt missing blank altogether.,bread,stone,fish',
    ].join('\n');
    const fvRes = parseGameCsv('fake-verse', fvCsv);
    expect(fvRes.items).toHaveLength(1);
    expect(fvRes.errors).toHaveLength(1);
    expect(fvRes.errors[0].row).toBe(4);

    const g3Csv = [
      'question,correct_answer,wrong1,wrong2,wrong3',
      'Valid Bible trivia question?,David,david,Saul,Jonathan',
    ].join('\n');
    const g3Res = parseGameCsv('gideons-300', g3Csv);
    expect(g3Res.items).toHaveLength(0);
    expect(g3Res.errors[0].row).toBe(2);

    const waiCsv = [
      'name,clue1,clue2,clue3,clue4,clue5,wrong1,wrong2,wrong3,wrong4,wrong5',
      'Ruth,Short,Second clue is long enough,Third clue is long enough,Fourth clue is long enough,Fifth clue is long enough,Naomi,Orpah,Esther,Hannah,Ruth',
    ].join('\n');
    const waiRes = parseGameCsv('who-am-i', waiCsv);
    expect(waiRes.items).toHaveLength(0);
    expect(waiRes.errors[0].row).toBe(2);

    const wcfCsv = [
      'event1,event2,event3,event4,event5',
      'Creation,Flood,Creation,Exodus,Exile',
      'Creation,,Babel,Exodus,Exile',
    ].join('\n');
    const wcfRes = parseGameCsv('what-came-first', wcfCsv);
    expect(wcfRes.items).toHaveLength(0);
    expect(wcfRes.errors.map((e) => e.row)).toEqual([2, 3]);
  });

  it('reports missing required header columns on row 1', () => {
    const res = parseGameCsv('fake-verse', 'question,correct_answer\nFoo?,Bar');
    expect(res.items).toEqual([]);
    expect(res.errors[0].row).toBe(1);
    expect(res.errors[0].message).toContain('Missing required column');
  });

  it('caps parsed items cleanly at 200 and emits a warning on the skipped row', () => {
    const header = 'word,category';
    const rows = Array.from({ length: 205 }, (_, i) => `Word${i + 1},Object`);
    const res = parseGameCsv('spot-the-wolf', [header, ...rows].join('\n'));
    expect(res.items).toHaveLength(MAX_CUSTOM_QUESTIONS);
    expect(res.errors).toEqual([
      {
        row: MAX_CUSTOM_QUESTIONS + 2,
        message: `Maximum of ${MAX_CUSTOM_QUESTIONS} custom questions reached; remaining rows were skipped.`,
      },
    ]);
  });
});

describe('buildCustomQuestionsPayload', () => {
  it('maps each GameId to its CustomQuestions property', () => {
    expect(buildCustomQuestionsPayload('what-came-first', [{ id: '1' }])).toEqual({ wcf: [{ id: '1' }] });
    expect(buildCustomQuestionsPayload('fake-verse', [{ id: '2' }])).toEqual({ fv: [{ id: '2' }] });
    expect(buildCustomQuestionsPayload('gideons-300', [{ id: '3' }])).toEqual({ g300: [{ id: '3' }] });
    expect(buildCustomQuestionsPayload('spot-the-wolf', [{ id: '4' }])).toEqual({ wolf: [{ id: '4' }] });
    expect(buildCustomQuestionsPayload('who-am-i', [{ id: '5' }])).toEqual({ wai: [{ id: '5' }] });
  });

  it.each(GAME_IDS)('produces payloads accepted by CustomQuestionsSchema for %s', (gameId) => {
    const parsed = parseGameCsv(gameId, CSV_TEMPLATES[gameId].sampleCsv);
    const payload = buildCustomQuestionsPayload(gameId, parsed.items);
    expect(CustomQuestionsSchema.safeParse(payload).success).toBe(true);
  });
});

describe('GET /api/content/template/[game]', () => {
  it.each(GAME_IDS)('returns downloadable CSV template for %s', async (game) => {
    const res = await getTemplate(new Request(`http://localhost/api/content/template/${game}`), {
      params: Promise.resolve({ game }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain(CSV_TEMPLATES[game].filename);
    const body = await res.text();
    expect(body).toBe(CSV_TEMPLATES[game].sampleCsv);
  });

  it('returns 404 JSON for unknown game id', async () => {
    const res = await getTemplate(new Request('http://localhost/api/content/template/unknown-game'), {
      params: Promise.resolve({ game: 'unknown-game' }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'GAME_NOT_FOUND' });
  });
});
