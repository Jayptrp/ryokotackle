/**
 * Language config for the public site.
 *
 * The site is a Thai-first catalog: Thai is the source of truth (DB `name_th`,
 * `summary`, `description`) and the default locale. The other four locales are
 * UI-chrome translations plus per-product `summary`/`description` overrides
 * stored in the DB `summary_i18n` / `description_i18n` jsonb columns; anything
 * untranslated falls back to Thai. Product *names* are never translated —
 * non-Thai locales simply show the English `name` column.
 *
 * This is intentionally cookieless-friendly and routing-free: the active locale
 * lives in a cookie + React context resolved on the client, so public routes
 * stay statically rendered (a hard Cloudflare/OpenNext constraint — see
 * CONTEXT.md). No `middleware.ts`, no `[locale]` segment.
 */
export const LOCALES = ["th", "en", "vi", "id", "ms"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "th";

/** Locales whose product copy is sourced from JSON overrides (not the DB). */
export type TranslatedLocale = Exclude<Locale, "th">;

/** Cookie that persists the visitor's chosen language across reloads. */
export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Display metadata for the language switcher. `short` shows in the nav chip. */
export const LOCALE_META: Record<Locale, { label: string; short: string }> = {
  th: { label: "ไทย", short: "TH" },
  en: { label: "English", short: "EN" },
  vi: { label: "Tiếng Việt", short: "VI" },
  id: { label: "Bahasa Indonesia", short: "ID" },
  ms: { label: "Bahasa Melayu", short: "MS" },
};
