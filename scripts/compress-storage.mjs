// Recompress existing product-media images to smaller JPEGs to get the bucket
// back under the Supabase free-tier 1 GB Storage limit.
//
// What it does, per REFERENCED image (orphans are left untouched for review —
// see list-orphans.mjs):
//   • jpg/jpeg  → re-encode in place (same path), only if it actually shrinks
//   • png/webp  → convert to .jpg, rewrite every DB reference (url columns AND
//                 rich-text bodies), then delete the original
//   • gif/video → skipped (animation / not an image)
//   • images that wouldn't shrink → skipped (keeps transparency-heavy PNGs,
//     which is why the Ryoko logo-style graphics stay as-is)
//
// Runs LOCALLY with sharp (the Cloudflare Worker can't run sharp — new uploads
// are compressed in the browser instead, see src/lib/compress-image.ts).
//
// Needs SUPABASE_SECRET_KEY in .env.local for --commit (writes bypass RLS).
//
// Usage:
//   node scripts/compress-storage.mjs                       # DRY RUN, whole bucket
//   node scripts/compress-storage.mjs --prefix <productId>  # limit to one product
//   node scripts/compress-storage.mjs --commit              # actually do it
//   node scripts/compress-storage.mjs --prefix <pid> --commit   # test one product first
//
// STRONGLY recommended: take a DB backup (pg_dump) before --commit, because the
// png→jpg path rewrites edit products/pages/product_media/categories/carousel.

import sharp from "sharp";
import { createSb, BUCKET, listAllObjects, loadReferenceIndex, urlToPath, selectAll } from "./lib/media-refs.mjs";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const prefix = (() => { const i = args.indexOf("--prefix"); return i >= 0 ? args[i + 1] : null; })();

const MAX_EDGE = 2000;
const QUALITY = 80;
const MIN_GAIN = 0.95; // only act if new size < 95% of old (meaningful shrink)

const COMPRESSIBLE = new Set(["jpg", "jpeg", "png", "webp"]);
const ext = (p) => p.split(".").pop()?.toLowerCase() ?? "";
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

const { sb } = createSb({ needWrite: COMMIT });

console.log(`${COMMIT ? "COMMIT" : "DRY RUN"} — scanning bucket "${BUCKET}"${prefix ? ` (prefix ${prefix})` : ""}...`);

const [allObjects, refIndex] = await Promise.all([listAllObjects(sb), loadReferenceIndex(sb)]);

const candidates = allObjects.filter(
  (o) =>
    COMPRESSIBLE.has(ext(o.path)) &&
    (!prefix || o.path.startsWith(prefix)) &&
    refIndex.isReferenced(o.path), // skip orphans — kept pristine for the boss review
);

console.log(`${allObjects.length} objects total, ${candidates.length} referenced & compressible to inspect.\n`);

const renames = new Map(); // oldPath -> newPath (png/webp → jpg)
let oldBytes = 0, newBytes = 0, recompressed = 0, converted = 0, skipped = 0, failed = 0;

for (const obj of candidates) {
  const { path, size } = obj;
  let buf;
  try {
    const { data, error } = await sb.storage.from(BUCKET).download(path);
    if (error) throw error;
    buf = Buffer.from(await data.arrayBuffer());
  } catch (e) {
    console.log(`  ! download failed: ${path} — ${e.message}`);
    failed++;
    continue;
  }

  let out;
  try {
    out = await sharp(buf, { failOn: "none" })
      .rotate() // honor EXIF orientation before stripping metadata
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // JPEG has no alpha — white background
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
  } catch (e) {
    console.log(`  ! sharp failed: ${path} — ${e.message}`);
    failed++;
    continue;
  }

  if (out.length >= size * MIN_GAIN) {
    skipped++;
    continue; // not worth it — leave original (e.g. transparent PNGs, tiny imgs)
  }

  const newPath = path.replace(/\.[^.]+$/, ".jpg");
  const isRename = newPath !== path;
  oldBytes += size;
  newBytes += out.length;
  if (isRename) converted++; else recompressed++;

  console.log(`  ${isRename ? "→jpg" : "recmp"}  ${path}  ${mb(size)} → ${mb(out.length)}`);

  if (COMMIT) {
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(newPath, out, { upsert: true, contentType: "image/jpeg" });
    if (upErr) { console.log(`    upload failed: ${upErr.message}`); failed++; continue; }
    if (isRename) renames.set(path, newPath);
  } else if (isRename) {
    renames.set(path, newPath); // track for the dry-run reference-rewrite report
  }
}

// --- Rewrite DB references for png/webp → jpg conversions -------------------
if (renames.size) {
  console.log(`\n${COMMIT ? "Rewriting" : "Would rewrite"} DB references for ${renames.size} renamed files...`);

  if (COMMIT) {
    // URL columns: replace the path substring inside the stored URL (keeps
    // whatever URL prefix/encoding was originally saved).
    const rewriteUrlColumn = async (table, col) => {
      const rows = await selectAll(sb, table, `id, ${col}`);
      for (const row of rows) {
        const p = urlToPath(row[col]);
        if (p && renames.has(p)) {
          const next = row[col].split(p).join(renames.get(p));
          const { error: uErr } = await sb.from(table).update({ [col]: next }).eq("id", row.id);
          if (uErr) console.log(`  ! update ${table}#${row.id}: ${uErr.message}`);
        }
      }
    };
    await rewriteUrlColumn("product_media", "url");
    await rewriteUrlColumn("categories", "image_url");
    await rewriteUrlColumn("carousel_slides", "image_url");

    // Rich-text bodies: replace the path substring everywhere it appears.
    const rewriteBody = async (table, cols) => {
      const rows = await selectAll(sb, table, ["id", ...cols].join(", "));
      for (const row of rows) {
        const patch = {};
        for (const col of cols) {
          let text = row[col];
          if (!text) continue;
          for (const [oldP, newP] of renames) {
            if (text.includes(oldP)) text = text.split(oldP).join(newP);
          }
          if (text !== row[col]) patch[col] = text;
        }
        if (Object.keys(patch).length) {
          const { error: uErr } = await sb.from(table).update(patch).eq("id", row.id);
          if (uErr) console.log(`  ! update ${table}#${row.id}: ${uErr.message}`);
        }
      }
    };
    await rewriteBody("products", ["description", "summary"]);
    await rewriteBody("pages", ["content"]);

    // Only now is it safe to delete the originals (references moved to .jpg).
    const oldPaths = [...renames.keys()];
    for (let i = 0; i < oldPaths.length; i += 100) {
      const batch = oldPaths.slice(i, i + 100);
      const { error: dErr } = await sb.storage.from(BUCKET).remove(batch);
      if (dErr) console.log(`  ! delete batch failed: ${dErr.message}`);
    }
    console.log(`  deleted ${oldPaths.length} original png/webp files.`);
  }
}

// --- Summary ----------------------------------------------------------------
console.log(`\n${COMMIT ? "Done." : "Dry run complete."}`);
console.log(`  recompressed (jpg in place): ${recompressed}`);
console.log(`  converted (png/webp → jpg):  ${converted}`);
console.log(`  skipped (no meaningful gain): ${skipped}`);
console.log(`  failed: ${failed}`);
console.log(`  size of touched files: ${mb(oldBytes)} → ${mb(newBytes)}  (saves ${mb(oldBytes - newBytes)})`);
if (!COMMIT) console.log(`\nRe-run with --commit to apply. Test one product first: --prefix <productId> --commit`);
