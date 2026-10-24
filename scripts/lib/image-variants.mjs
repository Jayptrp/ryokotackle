// Image size variants — Node copy of src/lib/image-variants.ts for the
// maintenance scripts (they can't import TypeScript). See that file for what
// variants are and why they exist.
//
// KEEP IN SYNC with src/lib/image-variants.ts — if the two disagree, pages ask
// for variants the scripts never made (falling back to full-size originals) or
// the orphan scripts treat live variants as deletable.

/** Variant name → longest edge in px (never upscaled). */
export const IMAGE_VARIANTS = {
  thumb: 200,
  card: 640,
  "banner-sm": 800,
  banner: 1600,
};

/** JPEG quality for variants (0–1). */
export const VARIANT_QUALITY = 0.8;

/** Variants made for the image at this in-bucket path. */
export function variantsForPath(path) {
  if (!/\.(jpe?g|png|webp)$/i.test(path)) return [];
  const [top, folder] = path.split("/");
  if (top === "home") {
    if (folder === "carousel" || folder === "featured-banner") return ["banner-sm", "banner"];
    if (folder === "category") return ["card"];
    return [];
  }
  if (folder === "media" || folder === "legacy") return ["thumb", "card"];
  return [];
}

/** In-bucket path of a variant: the original's path with its extension swapped. */
export function variantPath(path, variant) {
  return path.replace(/\.[^./]+$/, `.${variant}.jpg`);
}

/** In-bucket paths plus their variants' paths. */
export function withVariantPaths(paths) {
  return paths.flatMap((p) => [p, ...variantsForPath(p).map((v) => variantPath(p, v))]);
}
