import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "../../types/models";
import type { ReactNode } from "react";

type Dictionary = Record<string, string>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

async function loadLocale(locale: Locale) {
  const response = await fetch(`${import.meta.env.BASE_URL}locales/${locale}.json`);

  if (!response.ok) {
    throw new Error(`Failed to load locale: ${locale}`);
  }

  return (await response.json()) as Dictionary;
}

export function I18nProvider({
  locale,
  onLocaleChange,
  children,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  children: ReactNode;
}) {
  const [dictionary, setDictionary] = useState<Dictionary>({});

  useEffect(() => {
    void loadLocale(locale).then(setDictionary);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale: onLocaleChange,
      t(key, variables = {}) {
        const template = dictionary[key] ?? key;

        return template.replace(/\{(\w+)\}/g, (_, variable) => String(variables[variable] ?? ""));
      },
    };
  }, [dictionary, locale, onLocaleChange]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}
