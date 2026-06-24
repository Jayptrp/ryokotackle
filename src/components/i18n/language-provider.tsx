"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { MESSAGES, type Messages } from "@/lib/i18n/messages";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: NestedKey<Messages>, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isLocale(value) ? value : null;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // SSR/SSG renders Thai (the default + html lang). The cookie is read after
  // mount and applied, so a non-Thai visitor sees a brief Thai flash — the
  // accepted trade-off for keeping routes static (no middleware locale detect).
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const cookieLocale = readCookieLocale();
    if (cookieLocale && cookieLocale !== locale) {
      setLocaleState(cookieLocale);
      // Keep <html lang> in sync on cookie-driven loads (SSR rendered "th").
      document.documentElement.lang = cookieLocale;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    // Reflect on <html lang> for a11y / SEO crawlers that run JS.
    document.documentElement.lang = next;
  }, []);

  const t = useCallback<LanguageContextValue["t"]>(
    (key, vars) => {
      const raw =
        lookup(MESSAGES[locale], key) ?? lookup(MESSAGES[DEFAULT_LOCALE], key) ?? key;
      return vars ? interpolate(raw, vars) : raw;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLocale must be used within a LanguageProvider");
  return { locale: ctx.locale, setLocale: ctx.setLocale };
}

export function useTranslations() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslations must be used within a LanguageProvider");
  return ctx.t;
}

// --- helpers ---------------------------------------------------------------

/** Dot-path keys into the message tree, e.g. "nav.home". */
type NestedKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : `${K}.${NestedKey<T[K]>}`;
}[keyof T & string];

function lookup(obj: unknown, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[part] : undefined,
      obj,
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}
