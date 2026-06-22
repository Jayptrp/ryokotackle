// Delete products by id (from scripts/out/delete-ids.txt), produced & reviewed
// via match-delete-list.mjs. Deletes BY ID only — never by a fuzzy name match.
//
// FK cascade (verified): deleting a product also removes its product_media,
// product_channels, and carousel_slides rows; categories.image_product_id and
// carousel_slides.link_product_id are SET NULL. Storage FILES are NOT deleted —
// they become orphans; run list-orphans.mjs afterward to reclaim that space.
//
// Usage:
//   node scripts/delete-products.mjs            # DRY RUN — shows impact
//   node scripts/delete-products.mjs --commit   # actually delete
//
// Needs SUPABASE_SECRET_KEY in .env.local. Take a DB backup first.

import { readFileSync } from "node:fs";
import { createSb, selectAll } from "./lib/media-refs.mjs";

const COMMIT = process.argv.includes("--commit");
const IDS = "scripts/out/delete-ids.txt";

const ids = readFileSync(IDS, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const { sb } = createSb({ needWrite: COMMIT });

console.log(`${COMMIT ? "COMMIT" : "DRY RUN"} — ${ids.length} product ids from ${IDS}\n`);

// Confirm the ids still exist, and tally what cascades.
const products = (await selectAll(sb, "products", "id, name")).filter((p) => ids.includes(p.id));
const idSet = new Set(products.map((p) => p.id));

const media = (await selectAll(sb, "product_media", "id, product_id, url, type")).filter((m) => idSet.has(m.product_id));
const channels = (await selectAll(sb, "product_channels", "id, product_id")).filter((c) => idSet.has(c.product_id));
const slides = (await selectAll(sb, "carousel_slides", "id, product_id, link_product_id"));
const slidesCascade = slides.filter((s) => idSet.has(s.product_id));
const slidesNulled = slides.filter((s) => s.link_product_id && idSet.has(s.link_product_id));
const cats = (await selectAll(sb, "categories", "id, image_product_id")).filter((c) => idSet.has(c.image_product_id));
const mediaFiles = media.filter((m) => m.type === "image" && m.url?.includes("/product-media/")).length;

console.log("Cascade impact:");
console.log(`  products deleted:        ${products.length}${products.length !== ids.length ? `  (⚠ ${ids.length - products.length} id(s) already gone)` : ""}`);
console.log(`  product_media removed:   ${media.length}  (~${mediaFiles} image files will become storage orphans)`);
console.log(`  product_channels removed:${channels.length}`);
console.log(`  carousel_slides removed: ${slidesCascade.length}`);
console.log(`  carousel link_product_id set null: ${slidesNulled.length}`);
console.log(`  categories image_product_id set null: ${cats.length}`);

if (!COMMIT) {
  console.log(`\nDry run only. Re-run with --commit to delete. Then run list-orphans.mjs to clean storage.`);
  process.exit(0);
}

let deleted = 0;
for (let i = 0; i < products.length; i += 100) {
  const batch = products.slice(i, i + 100).map((p) => p.id);
  const { error } = await sb.from("products").delete().in("id", batch);
  if (error) { console.log(`  ! delete batch failed: ${error.message}`); continue; }
  deleted += batch.length;
}
console.log(`\nDeleted ${deleted} products (and cascaded rows).`);
console.log(`Next: run list-orphans.mjs to find/clean the now-orphaned image files, then redeploy.`);
