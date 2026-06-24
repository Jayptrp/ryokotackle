"use client";

import { cn } from "@/lib/utils";
import { RICH_CONTENT_CLASSES } from "@/lib/rich-content-classes";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { useLocale, useTranslations } from "@/components/i18n/language-provider";

type TranslateKey = Parameters<ReturnType<typeof useTranslations>>[0];

/**
 * Renders a UI-chrome translation by key. Lets server components emit
 * locale-aware chrome (e.g. the product detail page) without becoming clients.
 */
export function T({
  k,
  vars,
}: {
  k: TranslateKey;
  vars?: Record<string, string | number>;
}) {
  const t = useTranslations();
  return <>{t(k, vars)}</>;
}

/**
 * Renders the Thai value on the `th` locale, otherwise the English/Latin value.
 * Used for product & category names: non-Thai locales show the English `name`
 * column (we never translate names to JSON).
 */
export function LocalizedName({
  th,
  other,
  fallback = "",
}: {
  th: string | null | undefined;
  other: string | null | undefined;
  fallback?: string;
}) {
  const { locale } = useLocale();
  const value = locale === DEFAULT_LOCALE ? (th ?? other) : (other ?? th);
  return <>{value ?? fallback}</>;
}

/**
 * Renders children only on the Thai locale. Used for the English alias line that
 * sits under the Thai product name — redundant once the name itself is English.
 */
export function ThaiOnly({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  return locale === DEFAULT_LOCALE ? <>{children}</> : null;
}

/**
 * Hook form of {@link LocalizedName} — returns a resolver for places where a
 * component can't go (e.g. `<option>` text, `alt`/`placeholder` attributes).
 */
export function useLocalizedName() {
  const { locale } = useLocale();
  return (th: string | null | undefined, other: string | null | undefined) =>
    (locale === DEFAULT_LOCALE ? (th ?? other) : (other ?? th)) ?? "";
}

/**
 * Picks a plain-text string for the active locale from a per-locale map,
 * falling back to Thai. For short product copy that isn't rich text.
 */
export function LocalizedText({
  values,
}: {
  values: Partial<Record<Locale, string>>;
}) {
  const { locale } = useLocale();
  return <>{values[locale] ?? values[DEFAULT_LOCALE] ?? ""}</>;
}

/**
 * Renders pre-sanitized rich-text HTML for the active locale, falling back to
 * Thai when a locale has no translation. Each `variants` value must already be
 * sanitized server-side (see `sanitizeRich`) — this component only selects and
 * injects, so `sanitize-html` stays out of the client bundle.
 */
export function LocalizedRichContent({
  variants,
  className,
}: {
  variants: Partial<Record<Locale, string>>;
  className?: string;
}) {
  const { locale } = useLocale();
  const html = variants[locale] ?? variants[DEFAULT_LOCALE] ?? "";
  if (!html) return null;
  return (
    <div
      className={cn(RICH_CONTENT_CLASSES, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
