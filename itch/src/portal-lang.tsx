import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LANG_COOKIE, type Lang, tr } from "../../app/i18n/lang";

const Ctx = createContext<Lang>("en");

export function LangProvider({ children, initial = "en" }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(LANG_COOKIE);
      return saved === "zh" || saved === "en" ? saved : initial;
    } catch {
      return initial;
    }
  });

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(LANG_COOKIE, next); } catch {}
    try { document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`; } catch {}
    try { document.documentElement.lang = next === "zh" ? "zh-CN" : "en"; } catch {}
  }, []);

  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useLang() {
  const lang = useContext(Ctx);
  const t = useMemo(() => tr(lang), [lang]);
  const setLang = useCallback((next: Lang) => {
    try { localStorage.setItem(LANG_COOKIE, next); } catch {}
    try { document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`; } catch {}
    window.location.reload();
  }, []);
  return { lang, t, setLang };
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button type="button" className="lang-toggle" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}
