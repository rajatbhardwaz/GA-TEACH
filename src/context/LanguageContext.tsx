"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { translations } from "@/utils/translations";

export type Language = "en" | "hi" | "es" | "fr";

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  changeLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Read saved language from localStorage on client side mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ga-language") as Language | null;
      if (saved && ["en", "hi", "es", "fr"].includes(saved)) {
        setLanguage(saved);
      }
    } catch (e) {
      console.error("Failed to read language from localStorage:", e);
    }
    setMounted(true);
  }, []);

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem("ga-language", lang);
    } catch (e) {
      console.error("Failed to save language to localStorage:", e);
    }
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    const langTranslations = translations[language] || translations["en"];
    let val = (langTranslations as Record<string, string>)[key] || (translations["en"] as Record<string, string>)[key] || key;

    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        val = val.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }

    return val;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
