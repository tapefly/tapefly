"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { tr, LANG_COOKIE, type Lang } from "./lang";

const Ctx = createContext<Lang>("zh");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useLang() {
  const lang = useContext(Ctx);
  const router = useRouter();
  const t = useMemo(() => tr(lang), [lang]);
  const setLang = useCallback((l: Lang) => {
    try { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; } catch {}
    router.refresh();
  }, [router]);
  return { lang, t, setLang };
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button type="button" className="lang-toggle" onClick={() => setLang(lang === "zh" ? "en" : "zh")} aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}>
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
