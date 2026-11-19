// Pure, dependency-free RFC-4180 CSV parser, templates, and validators for MC custom questions.
import type { Audience, CustomQuestions, Difficulty, GameId } from './types';
import {
  FvSchema,
  G3Schema,
  WaiSchema,
  WcfSchema,
  WolfSchema,
  type FvItem,
  type G3Item,
  type WaiItem,
  type WcfItem,
  type WolfItem,
} from './schemas';

export interface CsvParseError {
  row: number;
  message: string;
}

export interface CsvParseResult<T = unknown> {
  items: T[];
  errors: CsvParseError[];
}

export interface GameItemMap {
  'what-came-first': WcfItem;
  'fake-verse': FvItem;
  'who-am-i': WaiItem;
  'gideons-300': G3Item;
  'spot-the-wolf': WolfItem;
}

export interface CsvTemplate {
  filename: string;
  columns: string[];
  sampleCsv: string;
  description: string;
}

export const MAX_CUSTOM_QUESTIONS = 200;

export const WOLF_CATEGORIES = [
  'Animal',
  'Biblical Book',
  'Food',
  'Miracle',
  'New Testament event',
  'Object',
  'Old Testament event',
  'Parable',
  'Person',
  'Place',
] as const;

const DEFAULT_META = {
  difficulty: 'medium' as Difficulty,
  testament: 'both' as const,
  verseRef: 'Bible 1:1',
  verse: 'Custom Bible question uploaded by the host.',
  translation: 'KJV' as const,
  review: 'approved' as const,
  audience: ['kids', 'youth', 'adults'] as Audience[],
};

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value) || value.trim() !== value) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

const WCF_COLUMNS = [
  'event1', 'ref1', 'event2', 'ref2', 'event3', 'ref3', 'event4', 'ref4', 'event5', 'ref5',
  'difficulty', 'testament', 'verse_ref', 'verse',
];
const FV_COLUMNS = ['prompt', 'truth', 'decoy1', 'decoy2', 'difficulty', 'testament', 'verse_ref', 'verse'];
const WAI_COLUMNS = [
  'name', 'clue1', 'clue2', 'clue3', 'clue4', 'clue5',
  'wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5',
  'story', 'difficulty', 'testament', 'verse_ref', 'verse',
];
const G3_COLUMNS = ['question', 'correct_answer', 'wrong1', 'wrong2', 'wrong3', 'difficulty', 'testament', 'verse_ref', 'verse'];
const WOLF_COLUMNS = ['word', 'category', 'aliases', 'lookalike', 'difficulty', 'testament', 'verse_ref', 'verse'];

export const CSV_TEMPLATES: Record<GameId, CsvTemplate> = {
  'what-came-first': {
    filename: 'arkade-what-came-first-template.csv',
    columns: WCF_COLUMNS,
    description: 'List 5 Bible events in true chronological order from earliest (event1) to latest (event5).',
    sampleCsv: toCsv(WCF_COLUMNS, [
      [
        'Noah builds the ark', 'Genesis 6:14',
        'Rain falls forty days', 'Genesis 7:12',
        'The dove brings an olive leaf', 'Genesis 8:11',
        'God sets a rainbow in the cloud', 'Genesis 9:13',
        'Builders scatter at Babel', 'Genesis 11:9',
        'easy', 'OT', 'Genesis 8:11',
        'And the dove came in to him in the evening; and, lo, in her mouth was an olive leaf pluckt off.',
      ],
      [
        'Angel Gabriel visits Mary', 'Luke 1:26',
        'Jesus is born in Bethlehem', 'Luke 2:7',
        'Wise men follow the star', 'Matthew 2:1',
        'John baptizes Jesus', 'Matthew 3:16',
        'Jesus calls fishermen by Galilee', 'Matthew 4:19',
        'medium', 'NT', 'Luke 2:7',
        'And she brought forth her firstborn son, and wrapped him in swaddling clothes, and laid him in a manger.',
      ],
    ]),
  },
  'fake-verse': {
    filename: 'arkade-fake-verse-template.csv',
    columns: FV_COLUMNS,
    description: 'Include ____ (or [blank]) in prompt where the missing word goes, plus the real answer and 2 decoy answers.',
    sampleCsv: toCsv(FV_COLUMNS, [
      [
        'Zacchaeus climbed up into a ____ tree to see Jesus.',
        'sycamore', 'palm', 'olive',
        'easy', 'NT', 'Luke 19:4',
        'And he ran before, and climbed up into a sycomore tree to see him: for he was to pass that way.',
      ],
      [
        'Elijah was fed bread and meat morning and evening by ____.',
        'ravens', 'doves', 'eagles',
        'medium', 'OT', '1 Kings 17:6',
        'And the ravens brought him bread and flesh in the morning, and bread and flesh in the evening.',
      ],
    ]),
  },
  'who-am-i': {
    filename: 'arkade-who-am-i-template.csv',
    columns: WAI_COLUMNS,
    description: 'Provide the character name, 5 clues ordered hardest (clue1) to easiest (clue5), and 5 unique wrong options.',
    sampleCsv: toCsv(WAI_COLUMNS, [
      [
        'Daniel',
        'I was carried away as a young captive to Babylon.',
        'I asked to eat vegetables and water instead of royal food.',
        'God helped me interpret King Nebuchadnezzar\'s mysterious dreams.',
        'I prayed three times a day with my windows open toward Jerusalem.',
        'God sent an angel to shut the mouths of hungry lions all night.',
        'Joseph', 'Ezekiel', 'Jeremiah', 'Mordecai', 'Nehemiah',
        'Daniel remained faithful in prayer in Babylon and was delivered safely from the lions\' den.',
        'easy', 'OT', 'Daniel 6:22',
        'My God hath sent his angel, and hath shut the lions\' mouths, that they have not hurt me.',
      ],
      [
        'Barnabas',
        'I was a Levite born on the island of Cyprus.',
        'I sold a field I owned and laid the money at the apostles\' feet.',
        'My name means son of encouragement among the believers.',
        'I introduced former persecutor Saul to the apostles in Jerusalem.',
        'I sailed with John Mark on a mission back to Cyprus.',
        'Silas', 'Timothy', 'Stephen', 'Philip', 'Apollos',
        'Barnabas encouraged the early church, vouched for Saul, and partnered in missionary journeys.',
        'medium', 'NT', 'Acts 4:36',
        'And Joses, who by the apostles was surnamed Barnabas, which is, being interpreted, The son of consolation.',
      ],
    ]),
  },
  'gideons-300': {
    filename: 'arkade-gideons-300-template.csv',
    columns: G3_COLUMNS,
    description: 'Provide a multiple-choice Bible question, the right answer, and 3 unique wrong options.',
    sampleCsv: toCsv(G3_COLUMNS, [
      [
        'How many smooth stones did David pick from the brook before facing Goliath?',
        'Five', 'Three', 'Seven', 'Twelve',
        'easy', 'OT', '1 Samuel 17:40',
        'And he took his staff in his hand, and chose him five smooth stones out of the brook.',
      ],
      [
        'On which island was Paul shipwrecked on his voyage to Rome?',
        'Malta', 'Cyprus', 'Crete', 'Patmos',
        'medium', 'NT', 'Acts 28:1',
        'And when they were escaped, then they knew that the island was called Melita.',
      ],
    ]),
  },
  'spot-the-wolf': {
    filename: 'arkade-spot-the-wolf-template.csv',
    columns: WOLF_COLUMNS,
    description: 'Provide the secret word, category, pipe- or semicolon-separated aliases, and an optional lookalike word.',
    sampleCsv: toCsv(WOLF_COLUMNS, [
      [
        'Fiery Furnace', 'Place', 'furnace|blazing furnace', 'Lions\' Den',
        'easy', 'OT', 'Daniel 3:25',
        'Lo, I see four men loose, walking in the midst of the fire, and they have no hurt.',
      ],
      [
        'Water into Wine', 'Miracle', 'wedding at cana|cana miracle', 'Feeding the Five Thousand',
        'medium', 'NT', 'John 2:9',
        'When the ruler of the feast had tasted the water that was made wine, he knew not whence it was.',
      ],
    ]),
  },
};

/**
 * Pure RFC-4180 CSV parser handling UTF-8 BOM, CRLF/LF, quoted fields with
 * commas/spaces/escaped quotes (`""`), multiline cells, and trailing empty lines.
 */
export function parseCsvRows(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  if (!input) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let wasQuoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (ch === '\r') {
        field += '\n';
        if (next === '\n') i++;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field === '' && !wasQuoted) {
      inQuotes = true;
      wasQuoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      wasQuoted = false;
    } else if (ch === '\r') {
      if (next === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      wasQuoted = false;
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      wasQuoted = false;
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0 || wasQuoted) {
    row.push(field);
    rows.push(row);
  }

  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === '')) {
    rows.pop();
  }

  return rows;
}

const normHeaderKey = (raw: string): string => raw.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_-]+/g, '');

const COMMON_HEADER_ALIASES: Record<string, string> = {
  difficulty: 'difficulty',
  diff: 'difficulty',
  level: 'difficulty',
  testament: 'testament',
  test: 'testament',
  verseref: 'verse_ref',
  ref: 'verse_ref',
  reference: 'verse_ref',
  scriptureref: 'verse_ref',
  passage: 'verse_ref',
  verse: 'verse',
  versetext: 'verse',
  scripture: 'verse',
  scripturetext: 'verse',
  fullverse: 'verse',
  audience: 'audience',
  translation: 'translation',
  trans: 'translation',
};

const GAME_HEADER_ALIASES: Record<GameId, Record<string, string>> = {
  'what-came-first': {
    event1: 'event1', e1: 'event1',
    event2: 'event2', e2: 'event2',
    event3: 'event3', e3: 'event3',
    event4: 'event4', e4: 'event4',
    event5: 'event5', e5: 'event5',
    ref1: 'ref1', r1: 'ref1',
    ref2: 'ref2', r2: 'ref2',
    ref3: 'ref3', r3: 'ref3',
    ref4: 'ref4', r4: 'ref4',
    ref5: 'ref5', r5: 'ref5',
  },
  'fake-verse': {
    prompt: 'prompt', question: 'prompt', sentence: 'prompt', text: 'prompt', blank: 'prompt', verseprompt: 'prompt',
    truth: 'truth', answer: 'truth', correct: 'truth', correctanswer: 'truth', word: 'truth',
    decoy1: 'decoy1', wrong1: 'decoy1', fake1: 'decoy1',
    decoy2: 'decoy2', wrong2: 'decoy2', fake2: 'decoy2',
    decoy3: 'decoy3', wrong3: 'decoy3', fake3: 'decoy3',
  },
  'who-am-i': {
    name: 'name', answer: 'name', person: 'name', subject: 'name', character: 'name', correct: 'name', correctanswer: 'name',
    clue1: 'clue1', clue2: 'clue2', clue3: 'clue3', clue4: 'clue4', clue5: 'clue5',
    wrong1: 'wrong1', distractor1: 'wrong1', decoy1: 'wrong1', option1: 'wrong1',
    wrong2: 'wrong2', distractor2: 'wrong2', decoy2: 'wrong2', option2: 'wrong2',
    wrong3: 'wrong3', distractor3: 'wrong3', decoy3: 'wrong3', option3: 'wrong3',
    wrong4: 'wrong4', distractor4: 'wrong4', decoy4: 'wrong4', option4: 'wrong4',
    wrong5: 'wrong5', distractor5: 'wrong5', decoy5: 'wrong5', option5: 'wrong5',
    story: 'story', summary: 'story', explanation: 'story', bio: 'story',
  },
  'gideons-300': {
    question: 'question', prompt: 'question', q: 'question',
    correctanswer: 'correct_answer', correct: 'correct_answer', answer: 'correct_answer', truth: 'correct_answer', right: 'correct_answer', rightanswer: 'correct_answer',
    wrong1: 'wrong1', distractor1: 'wrong1', decoy1: 'wrong1',
    wrong2: 'wrong2', distractor2: 'wrong2', decoy2: 'wrong2',
    wrong3: 'wrong3', distractor3: 'wrong3', decoy3: 'wrong3',
  },
  'spot-the-wolf': {
    word: 'word', answer: 'word', secretword: 'word', term: 'word', prompt: 'word',
    category: 'category', cat: 'category', type: 'category', group: 'category',
    aliases: 'aliases', alias: 'aliases', alt: 'aliases', accepted: 'aliases',
    lookalike: 'lookalike', decoy: 'lookalike', fake: 'lookalike',
  },
};

const REQUIRED_COLUMNS: Record<GameId, string[]> = {
  'what-came-first': ['event1', 'event2', 'event3', 'event4', 'event5'],
  'fake-verse': ['prompt', 'truth', 'decoy1', 'decoy2'],
  'who-am-i': ['name', 'clue1', 'clue2', 'clue3', 'clue4', 'clue5', 'wrong1', 'wrong2', 'wrong3', 'wrong4', 'wrong5'],
  'gideons-300': ['question', 'correct_answer', 'wrong1', 'wrong2', 'wrong3'],
  'spot-the-wolf': ['word'],
};

function buildHeaderIndex(gameId: GameId, headers: string[]): Record<string, number> {
  const gameAliases = GAME_HEADER_ALIASES[gameId];
  const index: Record<string, number> = {};
  headers.forEach((rawHeader, colIdx) => {
    const normalized = normHeaderKey(rawHeader);
    if (!normalized) return;
    const canonical = gameAliases[normalized] ?? COMMON_HEADER_ALIASES[normalized];
    if (canonical && index[canonical] === undefined) {
      index[canonical] = colIdx;
    }
  });
  return index;
}

function cell(row: string[], headerIndex: Record<string, number>, key: string): string {
  const idx = headerIndex[key];
  return idx === undefined ? '' : (row[idx] ?? '').trim();
}

function parseDifficulty(raw: string): Difficulty | null {
  if (!raw) return DEFAULT_META.difficulty;
  const v = raw.trim().toLowerCase();
  if (v === 'e' || v === 'easy') return 'easy';
  if (v === 'm' || v === 'medium' || v === 'med') return 'medium';
  if (v === 'h' || v === 'hard') return 'hard';
  return null;
}

function parseTestament(raw: string): 'OT' | 'NT' | 'both' | null {
  if (!raw) return DEFAULT_META.testament;
  const v = raw.trim().toLowerCase();
  if (v === 'ot' || v === 'old' || v === 'old testament') return 'OT';
  if (v === 'nt' || v === 'new' || v === 'new testament') return 'NT';
  if (v === 'both' || v === 'all') return 'both';
  return null;
}

function parseTranslation(raw: string): 'KJV' | 'WEB' | null {
  if (!raw) return DEFAULT_META.translation;
  const v = raw.trim().toUpperCase();
  if (v === 'KJV' || v === 'WEB') return v;
  return null;
}

function parseAudience(raw: string): Audience[] | null {
  if (!raw) return DEFAULT_META.audience;
  const v = raw.trim().toLowerCase();
  if (v === 'all' || v === 'kya') return ['kids', 'youth', 'adults'];
  const tokens = v.split(/[|,;]+/).map((s) => s.trim()).filter(Boolean);
  const mapped: Audience[] = [];
  for (const tok of tokens) {
    if (tok === 'k' || tok === 'kids') mapped.push('kids');
    else if (tok === 'y' || tok === 'youth') mapped.push('youth');
    else if (tok === 'a' || tok === 'adults') mapped.push('adults');
    else return null;
  }
  const unique = [...new Set(mapped)];
  return unique.length > 0 ? unique : null;
}

function formatZodIssues(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues.map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`).join('; ');
}

function extractMeta(gameId: GameId, rowNum: number, row: string[], headerIndex: Record<string, number>) {
  const rawDifficulty = cell(row, headerIndex, 'difficulty');
  const difficulty = parseDifficulty(rawDifficulty);
  if (!difficulty) {
    return { error: `Invalid difficulty "${rawDifficulty}" (expected easy, medium, or hard).` };
  }

  const rawTestament = cell(row, headerIndex, 'testament');
  const testament = parseTestament(rawTestament);
  if (!testament) {
    return { error: `Invalid testament "${rawTestament}" (expected OT, NT, or both).` };
  }

  const rawTranslation = cell(row, headerIndex, 'translation');
  const translation = parseTranslation(rawTranslation);
  if (!translation) {
    return { error: `Invalid translation "${rawTranslation}" (expected KJV or WEB).` };
  }

  const rawAudience = cell(row, headerIndex, 'audience');
  const audience = parseAudience(rawAudience);
  if (!audience) {
    return { error: `Invalid audience "${rawAudience}" (expected kids, youth, adults, or kya).` };
  }

  const ref = cell(row, headerIndex, 'verse_ref') || DEFAULT_META.verseRef;
  const verse = cell(row, headerIndex, 'verse') || DEFAULT_META.verse;

  return {
    meta: {
      id: `custom-${gameId}-${rowNum}`,
      difficulty,
      audience,
      testament,
      ref,
      verse,
      translation,
      review: DEFAULT_META.review,
    },
  };
}

function parseRowForGame(
  gameId: GameId,
  rowNum: number,
  validCount: number,
  row: string[],
  headerIndex: Record<string, number>,
): { item?: GameItemMap[GameId]; error?: string } {
  const metaResult = extractMeta(gameId, rowNum, row, headerIndex);
  if ('error' in metaResult) return { error: metaResult.error };
  const { meta } = metaResult;

  if (gameId === 'what-came-first') {
    const texts = [1, 2, 3, 4, 5].map((n) => cell(row, headerIndex, `event${n}`));
    const missing = texts.map((val, i) => (val ? null : `event${i + 1}`)).filter(Boolean);
    if (missing.length) return { error: `Missing required event(s): ${missing.join(', ')}.` };
    if (new Set(texts.map((s) => s.toLowerCase())).size !== 5) {
      return { error: 'All 5 events must be unique.' };
    }
    const events = texts.map((text, order) => ({
      id: `e${order + 1}`,
      text,
      ref: cell(row, headerIndex, `ref${order + 1}`) || meta.ref,
      order,
    }));
    const res = WcfSchema.safeParse({ ...meta, events });
    return res.success ? { item: res.data } : { error: formatZodIssues(res.error.issues) };
  }

  if (gameId === 'fake-verse') {
    const rawPrompt = cell(row, headerIndex, 'prompt');
    const text = rawPrompt.replace(/_{3,}|\[blank\]/gi, '____');
    if (!text.includes('____')) {
      return { error: 'Prompt must include a blank (____ or [blank]).' };
    }
    const truth = cell(row, headerIndex, 'truth');
    const decoys = [1, 2, 3].map((n) => cell(row, headerIndex, `decoy${n}`)).filter(Boolean);
    if (decoys.length < 2) {
      return { error: 'At least 2 decoy answers (decoy1, decoy2) are required.' };
    }
    const lowered = [truth, ...decoys].map((s) => s.toLowerCase());
    if (new Set(lowered).size !== lowered.length) {
      return { error: 'Truth and decoy answers must all be unique.' };
    }
    const res = FvSchema.safeParse({ ...meta, text, truth, decoys });
    return res.success ? { item: res.data } : { error: formatZodIssues(res.error.issues) };
  }

  if (gameId === 'who-am-i') {
    const name = cell(row, headerIndex, 'name');
    if (!name) return { error: 'Missing required name.' };
    const clues = [1, 2, 3, 4, 5].map((n) => cell(row, headerIndex, `clue${n}`));
    const missingClues = clues.map((val, i) => (val ? null : `clue${i + 1}`)).filter(Boolean);
    if (missingClues.length) return { error: `Missing required clue(s): ${missingClues.join(', ')}.` };
    const wrongs = [1, 2, 3, 4, 5].map((n) => cell(row, headerIndex, `wrong${n}`));
    const missingWrongs = wrongs.map((val, i) => (val ? null : `wrong${i + 1}`)).filter(Boolean);
    if (missingWrongs.length) return { error: `Missing required wrong option(s): ${missingWrongs.join(', ')}.` };
    const allOptions = [name, ...wrongs];
    if (new Set(allOptions.map((o) => o.toLowerCase())).size !== 6) {
      return { error: 'Name and all 5 wrong options must be unique.' };
    }
    const rawStory = cell(row, headerIndex, 'story');
    const fallbackStory = `${name} (${meta.ref})`;
    const story = rawStory || (fallbackStory.length >= 10 ? fallbackStory : `${name} from Scripture (${meta.ref})`);
    const res = WaiSchema.safeParse({ ...meta, name, clues, options: allOptions, story });
    return res.success ? { item: res.data } : { error: formatZodIssues(res.error.issues) };
  }

  if (gameId === 'gideons-300') {
    const question = cell(row, headerIndex, 'question');
    const correctAnswer = cell(row, headerIndex, 'correct_answer');
    const wrongs = [1, 2, 3].map((n) => cell(row, headerIndex, `wrong${n}`));
    if (!question || !correctAnswer || wrongs.some((w) => !w)) {
      return { error: 'Missing required question, correct_answer, or wrong1..wrong3.' };
    }
    const uniqueCheck = [correctAnswer, ...wrongs].map((o) => o.toLowerCase());
    if (new Set(uniqueCheck).size !== 4) {
      return { error: 'Correct answer and all 3 wrong options must be unique.' };
    }
    const correct = (validCount * 3 + 1) % 4;
    const options = wrongs.slice();
    options.splice(correct, 0, correctAnswer);
    const res = G3Schema.safeParse({ ...meta, question, options, correct });
    return res.success ? { item: res.data } : { error: formatZodIssues(res.error.issues) };
  }

  // spot-the-wolf
  const word = cell(row, headerIndex, 'word');
  if (!word) return { error: 'Missing required word.' };
  const category = cell(row, headerIndex, 'category') || 'General';
  const rawAliases = cell(row, headerIndex, 'aliases');
  const aliases = rawAliases ? rawAliases.split(/[|;]/).map((s) => s.trim()).filter(Boolean) : [];
  const rawLookalike = cell(row, headerIndex, 'lookalike');
  const candidate = {
    ...meta,
    word,
    category,
    aliases,
    ...(rawLookalike ? { lookalike: rawLookalike } : {}),
  };
  const res = WolfSchema.safeParse(candidate);
  return res.success ? { item: res.data } : { error: formatZodIssues(res.error.issues) };
}

/** Parse and validate custom CSV text for a specific game, returning validated items and 1-based row errors. */
export function parseGameCsv<G extends GameId>(gameId: G, text: string): CsvParseResult<GameItemMap[G]> {
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    return { items: [], errors: [{ row: 1, message: 'CSV file is empty.' }] };
  }

  const headerIndex = buildHeaderIndex(gameId, rows[0]);
  const missingCols = REQUIRED_COLUMNS[gameId].filter((col) => headerIndex[col] === undefined);
  if (missingCols.length > 0) {
    return {
      items: [],
      errors: [{ row: 1, message: `Missing required column(s): ${missingCols.join(', ')}.` }],
    };
  }

  if (rows.length === 1) {
    return { items: [], errors: [{ row: 1, message: 'No question rows found after the header row.' }] };
  }

  const items: GameItemMap[G][] = [];
  const errors: CsvParseError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.every((c) => c.trim() === '')) continue;

    const rowNum = i + 1;
    if (items.length >= MAX_CUSTOM_QUESTIONS) {
      errors.push({
        row: rowNum,
        message: `Maximum of ${MAX_CUSTOM_QUESTIONS} custom questions reached; remaining rows were skipped.`,
      });
      break;
    }

    const parsed = parseRowForGame(gameId, rowNum, items.length, row, headerIndex);
    if (parsed.error) {
      errors.push({ row: rowNum, message: parsed.error });
    } else if (parsed.item) {
      items.push(parsed.item as GameItemMap[G]);
    }
  }

  return { items, errors };
}

const PAYLOAD_KEY: Record<GameId, keyof CustomQuestions> = {
  'what-came-first': 'wcf',
  'fake-verse': 'fv',
  'gideons-300': 'g300',
  'spot-the-wolf': 'wolf',
  'who-am-i': 'wai',
};

/** Wrap parsed custom items into the `CustomQuestions` object expected by room creation config. */
export function buildCustomQuestionsPayload(gameId: GameId, items: unknown[]): CustomQuestions {
  const key = PAYLOAD_KEY[gameId];
  return { [key]: items.slice(0, MAX_CUSTOM_QUESTIONS) } as CustomQuestions;
}
