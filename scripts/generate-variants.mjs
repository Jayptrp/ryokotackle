// Backfill the image size variants (see src/lib/image-variants.ts) for images
// uploaded before variants existed. New admin uploads get theirs in the browser
// at upload time; this fills in everything older.
//
// For every image a page shows through <VariantImage> — product_media images,
// categories.image_url / featured_banner_url, carousel_slides.image_url — it
// works out which variants the image's folder gets, skips those already in the
// bucket, then downloads the original once, resizes it with sharp and uploads
// the missing variants. Originals and DB rows are never modified, so it's safe
// to re-run: it only fills gaps.
//
// Run it BEFORE deploying the code that loads variants, so visitors don't hit
// missing ones (pages fall back to the original, but that wastes a request).
//
// Runs LOCALLY with sharp (the Cloudflare Worker can't run sharp). --commit
// needs SUPABASE_SECRET_KEY in .env.local (writes bypass RLS).
//
// Usage:
//   node scripts/generate-variants.mjs                                 # DRY RUN — report only, downloads nothing
//   node scripts/generate-variants.mjs --prefix <productId> --commit   # try one product first
//   node scripts/generate-variants.mjs --commit                        # everything
//   node scripts/generate-variants.mjs --commit --force                # remake variants that already exist

import sharp from "sharp";
import { createSb, BUCKET, listAllObjects, selectAll, urlToPath } from "./lib/media-refs.mjs";
import { IMAGE_VARIANTS, VARIANT_QUALITY, variantsForPath, variantPath } from "./lib/image-variants.mjs";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const FORCE = args.includes("--force");
const prefix = (() => { const i = args.indexOf("--prefix"); return i >= 0 ? args[i + 1] : null; })();
const CONCURRENCY = 4; // images in flight — one at a time would take ~20 min for the bucket

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

const { sb } = createSb({ needWrite: COMMIT });

console.log(
  `${COMMIT ? "COMMIT" : "DRY RUN"} — image variants in bucket "${BUCKET}"` +
    `${prefix ? ` (prefix ${prefix})` : ""}${FORCE ? " (--force)" : ""}...`,
);

const [allObjects, media, categories, slides] = await Promise.all([
  listAllObjects(sb),
  selectAll(sb, "product_media", "url, type"),
  selectAll(sb, "categories", "image_url, featured_banner_url"),
  selectAll(sb, "carousel_slides", "image_url"),
]);
const sizeByPath = new Map(allObjects.map((o) => [o.path, o.size]));

// In-bucket paths of the images shown in variant slots.
const shown = new Set();
const addUrl = (value) => {
  if (!value?.includes("/product-media/")) return; // YouTube, other hosts
  shown.add(urlToPath(value).split(/[?#]/)[0]);
};
for (const r of media) if (r.type === "image") addUrl(r.url);
for (const r of categories) {
  addUrl(r.image_url);
  addUrl(r.featured_banner_url);
}
for (const r of slides) addUrl(r.image_url);

const jobs = []; // { path, variants } — one download each
const missingOriginals = [];
const toMake = Object.fromEntries(Object.keys(IMAGE_VARIANTS).map((v) => [v, 0]));
let inScope = 0, present = 0;

for (const path of shown) {
  if (prefix && !path.startsWith(prefix)) continue;
  const wanted = variantsForPath(path);
  if (!wanted.length) continue; // GIFs etc. render the original
  inScope++;
  const variants = wanted.filter((v) => FORCE || !sizeByPath.has(variantPath(path, v)));
  present += wanted.length - variants.length;
  if (!variants.length) continue;
  if (!sizeByPath.has(path)) {
    missingOriginals.push(path);
    continue;
  }
  for (const v of variants) toMake[v]++;
  jobs.push({ path, variants });
}

const pending = Object.entries(toMake).filter(([, n]) => n);
console.log(`\n${inScope} images get variants.`);
console.log(`  already in the bucket: ${present} variants${FORCE ? " (remade anyway: --force)" : ""}`);
console.log(
  `  to create: ${pending.reduce((s, [, n]) => s + n, 0)} variants` +
    (pending.length ? ` (${pending.map(([v, n]) => `${v} ${n}`).join(", ")})` : ""),
);
console.log(
  `  originals to download: ${jobs.length}, ` +
    `${mb(jobs.reduce((s, j) => s + sizeByPath.get(j.path), 0))} (one-off uncached egress)`,
);
if (missingOriginals.length) {
  console.log(`  ! ${missingOriginals.length} referenced images are missing from the bucket (skipped):`);
  for (const p of missingOriginals.slice(0, 20)) console.log(`      ${p}`);
}

if (!COMMIT) {
  console.log(
    "\nDry run — nothing downloaded or written. Try one product first:\n" +
      "  node scripts/generate-variants.mjs --prefix <productId> --commit",
  );
  process.exit(0);
}

let created = 0, addedBytes = 0, done = 0;
const failures = [];

async function makeVariants({ path, variants }) {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error) throw new Error(`download failed: ${error.message}`);
  const input = Buffer.from(await data.arrayBuffer());

  for (const v of variants) {
    const edge = IMAGE_VARIANTS[v];
    const out = await sharp(input, { failOn: "none" })
      .rotate() // honor EXIF orientation before metadata is stripped
      .resize(edge, edge, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // JPEG has no alpha — white, like the browser path
      .jpeg({ quality: Math.round(VARIANT_QUALITY * 100), mozjpeg: true })
      .toBuffer();
    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(variantPath(path, v), out, { upsert: FORCE, contentType: "image/jpeg" });
    if (upErr) throw new Error(`upload of ${v} failed: ${upErr.message}`);
    created++;
    addedBytes += out.length;
  }
}

let next = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        await makeVariants(job);
      } catch (e) {
        failures.push(`${job.path} — ${e.message}`);
      }
      if (++done % 50 === 0 || done === jobs.length) console.log(`  ${done}/${jobs.length} images`);
    }
  }),
);

console.log("\nDone.");
console.log(`  variants created: ${created} (${mb(addedBytes)} added to the bucket)`);
console.log(`  images failed: ${failures.length}`);
for (const f of failures) console.log(`    ! ${f}`);
if (failures.length) console.log("Re-run to retry them — variants that exist are skipped.");
