import { cookies } from "next/headers";
import { asLang, tr, LANG_COOKIE, type Lang } from "./lang";

/** The visitor's language on the server. Reading the cookie makes the page render per request. */
export async function getLang(): Promise<Lang> {
  return asLang((await cookies()).get(LANG_COOKIE)?.value);
}
export async function serverT() {
  return tr(await getLang());
}
