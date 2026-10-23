"use client";

/**
 * Active interface language. English by default; Turkish via the header
 * toggle or ?lang=tr. The choice is remembered in this browser.
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DICTS, LANG_STORAGE_KEY, type Dict, type Lang } from "@/lib/i18n";

interface LangState {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangState>({ lang: "en", t: DICTS.en, setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let initial: Lang | null = null;
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "tr" || q === "en") initial = q;
    if (!initial) {
      try {
        const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
        if (stored === "tr" || stored === "en") initial = stored;
      } catch {
        /* storage unavailable */
      }
    }
    if (initial && initial !== "en") setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ lang, t: DICTS[lang], setLang }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
