import en from './en.json';

export type Strings = Record<string, string>;
const catalogs: Record<string, Strings> = { en: en as Strings };
let locale = 'en';

export const setLocale = (l: string) => { if (catalogs[l]) locale = l; };
/** All visible text lives in i18n/en.json so other languages can be added by dropping in a file. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const s = catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
}
