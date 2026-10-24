// Client-side image compression for admin uploads.
//
// The admin upload route runs on the Cloudflare Worker, which can't run native
// image libraries (sharp). So we compress in the browser before upload: resize
// to a sane max edge and re-encode as JPEG. This keeps the Supabase Storage
// bucket (1 GB free-tier limit) from filling up with multi-MB originals.
//
// The same canvas code also makes the smaller size variants that public pages
// load instead of the original (see image-variants.ts, buildImageUploadForm).
//
// Per project decision: output is always JPEG (no WebP — some phones choke on
// downloaded .webp files). The Ryoko logo is a static asset (public/), never
// uploaded through here, so it stays PNG regardless.

import { IMAGE_VARIANTS, VARIANT_QUALITY, variantsForPath } from "@/lib/image-variants";

const MAX_EDGE = 2000; // longest side, px — plenty for catalog display
const QUALITY = 0.82; // JPEG quality

// Formats we must NOT flatten to JPEG: GIF (often animated) and SVG (vector).
// Videos are skipped too (not image/*). Everything else → JPEG.
const SKIP_TYPES = new Set(["image/gif", "image/svg+xml"]);

/** Scale `bitmap` down to fit `maxEdge` (never up) and encode it as a JPEG. */
async function encodeJpeg(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // JPEG has no alpha — flatten transparency onto white instead of black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  // Large downscales (2000px → 200px thumbnails) come out jagged otherwise.
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);

  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

/**
 * Compress an image File to a smaller JPEG. Returns the original File unchanged
 * if it's not a compressible raster image, can't be decoded, or compression
 * wouldn't actually shrink it.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || SKIP_TYPES.has(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // undecodable — let the server reject or store the original
  }

  const blob = await encodeJpeg(bitmap, MAX_EDGE, QUALITY);
  bitmap.close();
  if (!blob || blob.size >= file.size) return file; // no real gain — keep original

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * Form body for /api/admin/upload: the compressed file plus the size variants
 * its folder gets (as `variant:<name>` fields), so public pages can load a
 * right-sized copy instead of the original. If the variants can't be made, the
 * file goes up alone and pages fall back to it.
 */
export async function buildImageUploadForm(
  file: File,
  productId: string,
  folder: string,
): Promise<FormData> {
  const upload = await compressImage(file);
  const fd = new FormData();
  fd.set("file", upload);
  fd.set("productId", productId);
  fd.set("folder", folder);

  // Same folder + extension the route stores it under, so both pick the same variants.
  const variants = variantsForPath(`${productId}/${folder}/${upload.name}`);
  if (variants.length) {
    try {
      const bitmap = await createImageBitmap(upload, { imageOrientation: "from-image" });
      for (const name of variants) {
        const blob = await encodeJpeg(bitmap, IMAGE_VARIANTS[name], VARIANT_QUALITY);
        if (blob) fd.set(`variant:${name}`, blob, `${name}.jpg`);
      }
      bitmap.close();
    } catch {
      // undecodable in this browser — upload the file alone
    }
  }
  return fd;
}
