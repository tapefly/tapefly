/* Two languages. Chinese is the default; English is one click away.
   The choice lives in a cookie so server-rendered pages come out in it too. */
export type Lang = "zh" | "en";
export const LANG_COOKIE = "tapefly.lang";
export const DEFAULT_LANG: Lang = "zh";
export const asLang = (v: string | undefined | null): Lang => (v === "en" ? "en" : DEFAULT_LANG);

/** Pick the string (or element) for a language. */
export function tr(lang: Lang) {
  return function t<T>(zh: T, en: T): T { return lang === "en" ? en : zh; };
}
