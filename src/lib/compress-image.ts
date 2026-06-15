// Client-side image compression for admin uploads.
//
// The admin upload route runs on the Cloudflare Worker, which can't run native
// image libraries (sharp). So we compress in the browser before upload: resize
// to a sane max edge and re-encode as JPEG. This keeps the Supabase Storage
// bucket (1 GB free-tier limit) from filling up with multi-MB originals.
//
// Per project decision: output is always JPEG (no WebP — some phones choke on
// downloaded .webp files). The Ryoko logo is a static asset (public/), never
// uploaded through here, so it stays PNG regardless.

const MAX_EDGE = 2000; // longest side, px — plenty for catalog display
const QUALITY = 0.82; // JPEG quality

// Formats we must NOT flatten to JPEG: GIF (often animated) and SVG (vector).
// Videos are skipped too (not image/*). Everything else → JPEG.
const SKIP_TYPES = new Set(["image/gif", "image/svg+xml"]);

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

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // JPEG has no alpha — flatten transparency onto white instead of black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob || blob.size >= file.size) return file; // no real gain — keep original

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}
