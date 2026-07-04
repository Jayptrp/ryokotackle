/**
 * Slugify a string to lowercase ASCII kebab-case.
 *
 * Returns an **empty string** when nothing usable survives (e.g. a Thai-only
 * name, whose characters are all stripped) — callers pick a domain-appropriate
 * fallback so we never silently collapse to a misleading shared slug. This is
 * the fix for the "TH sub-category → no EN → /category/product-n" bug: category
 * creation now falls back to "category", never "product".
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD") // decompose accents so "é" → "e", etc.
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

/** True when `slug` is a valid public-URL slug (lowercase ASCII kebab-case). */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
