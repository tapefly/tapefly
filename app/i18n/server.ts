import { cookies } from "next/headers";
import { asLang, tr, LANG_COOKIE, type Lang } from "./lang";

/** The visitor's language on the server. Reading the cookie makes the page render per request. */
export function getLang(): Lang {
  return asLang(cookies().get(LANG_COOKIE)?.value);
}
export function serverT() {
  return tr(getLang());
}
