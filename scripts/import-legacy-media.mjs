// Import scraped legacy media into Supabase: upload images to Storage and
// insert product_media rows (images + YouTube videos), driven by the reviewed
// match CSV (scripts/out/media-match-review.csv).
//
// Only rows whose `db_slug` is filled in are imported, so you stay in control:
// the 86 exact matches are pre-filled; verify/fill the rest yourself.
//
// Requires the Supabase SECRET key (writes bypass RLS). Add to .env.local:
//   SUPABASE_SECRET_KEY=sb_secret_xxx        (Dashboard - Project Settings - API)
//
// Usage:
//   node scripts/import-legacy-media.mjs                 # DRY RUN (no writes)
//   node scripts/import-legacy-media.mjs --commit        # actually upload+insert
//   node scripts/import-legacy-media.mjs --slug ryoko-fortius --commit   # one product
//   node scripts/import-legacy-media.mjs --commit --replace   # replace existing media
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const REPLACE = args.includes("--replace");
const onlySlug = (() => { const i = args.indexOf("--slug"); return i >= 0 ? args[i + 1] : null; })();
const BUCKET = "product-media";
const SCRAPE = "scrape-output";
const REVIEW = "scripts/out/media-match-review.csv";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const publishable = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (COMMIT && !secret) {
  console.error("--commit needs SUPABASE_SECRET_KEY in .env.local (Dashboard → Settings → API → secret key).");
  process.exit(1);
}
// Dry run can use the publishable key (read-only); commit needs the secret key.
const sb = createClient(url, secret || publishable, { auth: { persistSession: false } });

const CT = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".mp4": "video/mp4" };

// tiny CSV parser (handles quoted fields)
function parseCsv(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const review = parseCsv(readFileSync(REVIEW, "utf8"))
  .filter((r) => r.db_slug && r.db_slug.trim())
  .filter((r) => !onlySlug || r.scrape_slug === onlySlug);

console.log(`${COMMIT ? "COMMIT" : "DRY RUN"} — ${review.length} rows with a db_slug target`);

// resolve db_slug -> product id
const slugs = [...new Set(review.map((r) => r.db_slug.trim()))];
const { data: prods, error } = await sb.from("products").select("id, slug").in("slug", slugs);
if (error) throw error;
const idBySlug = new Map(prods.map((p) => [p.slug, p.id]));

let okCount = 0, imgCount = 0, vidCount = 0, skipped = 0;

for (const r of review) {
  const pid = idBySlug.get(r.db_slug.trim());
  if (!pid) { console.log(`  ! no product for db_slug=${r.db_slug}`); continue; }

  // existing media guard
  const { count } = await sb.from("product_media").select("id", { count: "exact", head: true }).eq("product_id", pid);
  if (count && !REPLACE) { console.log(`  ~ skip ${r.db_slug} (already has ${count} media; use --replace)`); skipped++; continue; }

  const meta = JSON.parse(readFileSync(join(SCRAPE, r.scrape_slug, "meta.json"), "utf8"));
  const images = (meta.images || []).filter((i) => i.file);
  const videos = meta.videos || [];

  if (COMMIT && REPLACE && count) await sb.from("product_media").delete().eq("product_id", pid);

  const rows = [];
  let order = 0;
  for (const img of images) {
    const file = join(SCRAPE, r.scrape_slug, img.file);
    if (!existsSync(file)) continue;
    const fname = basename(img.file);
    const path = `${pid}/legacy/${fname}`;
    let publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
    if (COMMIT) {
      const buf = readFileSync(file);
      const { error: upErr } = await sb.storage.from(BUCKET).upload(path, buf, {
        contentType: CT[extname(fname).toLowerCase()] || "application/octet-stream", upsert: true,
      });
      if (upErr) { console.log(`    upload fail ${path}: ${upErr.message}`); continue; }
      publicUrl = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }
    rows.push({ product_id: pid, type: "image", provider: null, url: publicUrl, alt: null, sort_order: order, is_primary: order === 0 });
    order++; imgCount++;
  }
  for (const v of videos) {
    rows.push({ product_id: pid, type: "video", provider: "youtube", url: v.url, alt: null, sort_order: order, is_primary: false });
    order++; vidCount++;
  }

  if (COMMIT && rows.length) {
    const { error: insErr } = await sb.from("product_media").insert(rows);
    if (insErr) { console.log(`  ! insert fail ${r.db_slug}: ${insErr.message}`); continue; }
  }
  okCount++;
  console.log(`  ${COMMIT ? "✓" : "·"} ${r.db_slug}: ${images.length} imgs, ${videos.length} vids`);
}

console.log(`\n${COMMIT ? "Imported" : "Would import"}: ${okCount} products, ${imgCount} images, ${vidCount} videos. Skipped: ${skipped}.`);
if (!COMMIT) console.log("Re-run with --commit to write. Test one first: --slug <scrape_slug> --commit");
