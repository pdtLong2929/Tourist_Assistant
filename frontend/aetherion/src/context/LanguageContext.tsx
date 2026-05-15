"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, TranslationKey } from "../translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem("app_language") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "vi")) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
  };

  const t = (key: TranslationKey): string => {
    const keys = key.split(".");
    let current: any = translations[language];

    for (const k of keys) {
      if (current[k] === undefined) {
        console.warn(`Missing translation for key: ${key}`);
        return key;
      }
      current = current[k];
    }

    return current as string;
  };

  // Prevent hydration mismatch by not rendering until mounted
  // or return an empty string/default fallback if preferred
  // but to avoid layout shift, we just render with default 'en' during SSR
  // and update on client if needed. Since we use Context, children will re-render.
  if (!mounted) {
    return null;
  }

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
