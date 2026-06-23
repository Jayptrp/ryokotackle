import { sanitizeRich } from "@/lib/sanitize-rich";
import type { Locale, TranslatedLocale } from "@/lib/i18n/config";

const TRANSLATED_LOCALES: TranslatedLocale[] = ["en", "vi", "id", "ms"];

/** Sanitized rich-text per locale, keyed for `<LocalizedRichContent>`. */
export type RichVariants = Partial<Record<Locale, string>>;

/**
 * Builds the per-locale, pre-sanitized HTML map for one product field.
 *
 * Thai is the DB source-of-truth column (`thHtml`); the non-Thai locales come
 * from the matching `*_i18n` jsonb column (`{ en, vi, id, ms }`). Missing/empty
 * locales are simply absent — the client renderer falls back to Thai. Returns
 * `{}` when the field is empty in every locale.
 */
function variantsFor(
  thHtml: string | null | undefined,
  i18n: Record<string, string> | null | undefined,
): RichVariants {
  const out: RichVariants = {};
  if (thHtml && thHtml.trim()) out.th = sanitizeRich(thHtml);
  for (const locale of TRANSLATED_LOCALES) {
    const value = i18n?.[locale];
    if (value && value.trim()) out[locale] = sanitizeRich(value);
  }
  return out;
}

/** Localized, sanitized `summary` + `description` variants for a product. */
export function getProductRichVariants(source: {
  summary?: string | null;
  summaryI18n?: Record<string, string> | null;
  description?: string | null;
  descriptionI18n?: Record<string, string> | null;
}): { summary: RichVariants; description: RichVariants } {
  return {
    summary: variantsFor(source.summary, source.summaryI18n),
    description: variantsFor(source.description, source.descriptionI18n),
  };
}

/** Whether any locale (incl. Thai) has rich content for this set of variants. */
export function hasAnyVariant(variants: RichVariants): boolean {
  return Object.values(variants).some((html) => html && html.length > 0);
}
