"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Lang, TranslationKey } from "@/lib/i18n";

interface LanguageContextType {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: (key: TranslationKey, ...args: any[]) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    lang: "fr",
    setLang: () => {},
    t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [lang, setLangState] = useState<Lang>("fr");

    useEffect(() => {
        const stored = localStorage.getItem("ctq-lang") as Lang | null;
        if (stored === "fr" || stored === "en") setLangState(stored);
    }, []);

    const setLang = (l: Lang) => {
        setLangState(l);
        localStorage.setItem("ctq-lang", l);
    };

    const t = (key: TranslationKey, ...args: any[]): string => {
        const dict = translations[lang] as any;
        const val = dict[key];
        if (typeof val === "function") return val(...args);
        return val ?? key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
