import fs from 'node:fs';
import path from 'node:path';

export const RAW_DIR = path.resolve(process.cwd(), 'scripts/content/raw');
export const DATA_DIR = path.resolve(process.cwd(), 'src/server/content/data');

export function readJson<T = unknown>(file: string): T {
  const raw = fs.readFileSync(path.join(RAW_DIR, file), 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw) as T;
}

export function ascii(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normBookName(name: string): string {
  return name === 'Psalms' ? 'Psalm' : name;
}

export interface RawRecord<T> {
  id: string;
  fields: T;
}

export interface BookFields {
  osisName: string;
  bookOrder: number;
  bookName: string;
  bookDiv: string;
  testament: string;
  shortName: string;
  chapterCount: number;
  verseCount: number;
  writers?: string[];
  yearWritten?: string;
}

export interface ChapterFields {
  osisRef: string;
  book: string[];
  chapterNum: number;
}

export interface VerseFields {
  osisRef: string;
  book: string[];
  chapter: string[];
  verseNum: string;
  verseText: string;
  people?: string[];
  places?: string[];
  event?: string[];
  yearNum?: number;
  verseID: string;
}

export interface PersonFields {
  personID: number;
  displayTitle: string;
  name: string;
  isProperName?: boolean;
  gender?: string;
  birthYear?: string | number;
  deathYear?: string | number;
  birthPlace?: string[];
  deathPlace?: string[];
  memberOf?: string[];
  dictionaryText?: string;
  dictText?: string[];
  verseCount?: number;
  verses?: string[];
  mother?: string[];
  father?: string[];
  children?: string[];
  siblings?: string[];
  partners?: string[];
  minYear?: number;
  maxYear?: number;
  events?: string[];
  alsoCalled?: string;
  ambiguous?: boolean;
  chaptersWritten?: string[];
}

export interface PlaceFields {
  placeID: number;
  displayTitle: string;
  kjvName?: string;
  esvName?: string;
  featureType?: string;
  featureSubType?: string;
  comment?: string;
  verseCount?: number;
  verses?: string[];
  dictionaryText?: string;
  dictText?: string[];
  peopleDied?: string[];
  peopleBorn?: string[];
  hasBeenHere?: string[];
  eventsHere?: string[];
  aliases?: string;
  ambiguous?: boolean;
}

export interface EventFields {
  eventID: number;
  title: string;
  startDate?: string;
  duration?: string;
  verses?: string[];
  participants?: string[];
  locations?: string[];
  sortKey?: number;
  notes?: string;
  groups?: string[];
  partOf?: string[];
}

export interface PeopleGroupFields {
  groupName: string;
  members?: string[];
}

export interface BibleQuizzleRow {
  question: string;
  answer: string;
  categories?: string[];
  reference?: string;
}

export interface IndexedVerse {
  id: string;
  ref: string;
  chapterRef: string;
  bookName: string;
  bookOrder: number;
  bookDiv: string;
  testament: 'OT' | 'NT';
  chapterNum: number;
  verseNum: number;
  verseID: string;
  text: string;
  people: string[];
  places: string[];
  events: string[];
  yearNum?: number;
}

export const FORBIDDEN_TEST_STRINGS = new Set([
  'zebra',
  'mango',
  'other',
  'secretlie',
  'rude one',
  'fine one',
]);

export function loadDataset() {
  const rawBooks = readJson<RawRecord<BookFields>[]>('books.json');
  const rawChapters = readJson<RawRecord<ChapterFields>[]>('chapters.json');
  const rawVerses = readJson<RawRecord<VerseFields>[]>('verses.json');
  const rawPeople = readJson<RawRecord<PersonFields>[]>('people.json');
  const rawPlaces = readJson<RawRecord<PlaceFields>[]>('places.json');
  const rawEvents = readJson<RawRecord<EventFields>[]>('events.json');
  const rawGroups = readJson<RawRecord<PeopleGroupFields>[]>('peopleGroups.json');
  const quizzle = readJson<BibleQuizzleRow[]>('biblequizzle.json');

  const bookMap = new Map(rawBooks.map((b) => [b.id, b.fields]));
  const chapterMap = new Map(rawChapters.map((c) => [c.id, c.fields]));
  const personMap = new Map(rawPeople.map((p) => [p.id, p.fields]));
  const placeMap = new Map(rawPlaces.map((p) => [p.id, p.fields]));
  const eventMap = new Map(rawEvents.map((e) => [e.id, e.fields]));
  const groupMap = new Map(rawGroups.map((g) => [g.id, g.fields]));

  const verses: IndexedVerse[] = [];
  const verseById = new Map<string, IndexedVerse>();
  const verseByRef = new Map<string, IndexedVerse>();

  for (const v of rawVerses) {
    const bId = v.fields.book?.[0];
    const cId = v.fields.chapter?.[0];
    const b = bId ? bookMap.get(bId) : undefined;
    const c = cId ? chapterMap.get(cId) : undefined;
    if (!b || !c) continue;
    const bookName = normBookName(b.bookName);
    const chapterNum = c.chapterNum;
    const verseNum = Number(v.fields.verseNum);
    const ref = `${bookName} ${chapterNum}:${verseNum}`;
    const text = ascii(v.fields.verseText || '');
    if (text.length < 10) continue;
    const iv: IndexedVerse = {
      id: v.id,
      ref,
      chapterRef: `${bookName} ${chapterNum}`,
      bookName,
      bookOrder: b.bookOrder,
      bookDiv: b.bookDiv,
      testament: b.bookOrder <= 39 ? 'OT' : 'NT',
      chapterNum,
      verseNum,
      verseID: v.fields.verseID,
      text,
      people: v.fields.people ?? [],
      places: v.fields.places ?? [],
      events: v.fields.event ?? [],
      yearNum: v.fields.yearNum,
    };
    verses.push(iv);
    verseById.set(iv.id, iv);
    verseByRef.set(ref.toLowerCase(), iv);
  }

  verses.sort((a, b) => a.verseID.localeCompare(b.verseID));

  return {
    books: rawBooks,
    bookMap,
    chapterMap,
    personMap,
    placeMap,
    eventMap,
    groupMap,
    verses,
    verseById,
    verseByRef,
    quizzle,
  };
}

/** Stable string hash for deterministic shuffling/tie-breaking without runtime randomness. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function cleanDictSentence(raw: string | undefined): string {
  if (!raw) return '';
  let s = ascii(raw)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  // Take up to first 2 clean sentences
  const sentences = s.match(/[^.!?]+[.!?]/g) ?? [s];
  s = sentences.slice(0, 2).join(' ').trim();
  return s;
}
