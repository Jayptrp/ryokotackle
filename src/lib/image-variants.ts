// Smaller copies ("variants") of product-media images, stored next to each
// original so public pages don't download a full-size image into a small slot.
// Image traffic was nearly all of the project's Supabase Storage egress (Free
// plan: 5 GB cached + 5 GB uncached per month) — see CONTEXT.md "Image variants".
//
// A variant lives at the original's path with the extension swapped:
//   <productId>/media/1781-x7.jpg  →  <productId>/media/1781-x7.thumb.jpg
// Variants are always JPEG (project rule: no WebP — see compress-image.ts).
//
// Which variants an image has is decided by its folder alone, so a page can
// build a variant URL without a DB lookup. They're created on admin upload
// (compress-image.ts → /api/admin/upload) and, for images uploaded before
// variants existed, by scripts/generate-variants.mjs.
//
// KEEP IN SYNC with scripts/lib/image-variants.mjs (Node scripts can't import TS).

/** Variant name → longest edge in px (never upscaled). */
export const IMAGE_VARIANTS = {
  thumb: 200, // gallery thumbnail strip (64px slots)
  card: 640, // product cards, home category cards
  "banner-sm": 800, // hero carousel + featured banners on phones
  banner: 1600, // hero carousel + featured banners on larger screens
} as const;

export type ImageVariant = keyof typeof IMAGE_VARIANTS;

/** JPEG quality for variants (originals use 0.82 — see compress-image.ts). */
export const VARIANT_QUALITY = 0.8;

const BUCKET_PATH = "/storage/v1/object/public/product-media/";

/** Variants made for the image at this in-bucket path (none for GIFs, videos, inline images, …). */
export function variantsForPath(path: string): ImageVariant[] {
  if (!/\.(jpe?g|png|webp)$/i.test(path)) return [];
  const [top, folder] = path.split("/");
  if (top === "home") {
    if (folder === "carousel" || folder === "featured-banner") return ["banner-sm", "banner"];
    if (folder === "category") return ["card"];
    return [];
  }
  // <productId>/media/… (admin uploads) and <productId>/legacy/… (legacy import)
  if (folder === "media" || folder === "legacy") return ["thumb", "card"];
  return [];
}

/** In-bucket path of a variant: the original's path with its extension swapped. */
export function variantPath(path: string, variant: ImageVariant): string {
  return path.replace(/\.[^./]+$/, `.${variant}.jpg`);
}

/** Public URL of `variant` for a product-media URL, or null if that image has no such variant. */
export function variantUrl(url: string, variant: ImageVariant): string | null {
  const i = url.indexOf(BUCKET_PATH);
  if (i < 0) return null;
  const base = url.slice(0, i + BUCKET_PATH.length);
  const path = url.slice(base.length).split(/[?#]/)[0];
  if (!variantsForPath(path).includes(variant)) return null;
  return base + variantPath(path, variant);
}

/** In-bucket paths plus their variants' paths — for deleting images together with their variants. */
export function withVariantPaths(paths: string[]): string[] {
  return paths.flatMap((p) => [p, ...variantsForPath(p).map((v) => variantPath(p, v))]);
}
