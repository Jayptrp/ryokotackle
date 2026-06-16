// Delete orphaned files from the product-media bucket to reclaim space.
//
// An orphan = a storage object referenced by NO url column AND not embedded in
// any rich-text body (products.description/summary, pages.content). The set is
// recomputed live every run, and this script will NEVER delete a path that is
// currently referenced — so a stale input list can't take out a live image.
//
// Usage:
//   node scripts/delete-orphans.mjs                 # DRY RUN, all orphans
//   node scripts/delete-orphans.mjs --commit        # delete all orphans
//   node scripts/delete-orphans.mjs --from scripts/out/keep-delete.txt          # only these paths (still orphan-checked)
//   node scripts/delete-orphans.mjs --from scripts/out/keep-delete.txt --commit
//
// The --from file takes one path per line (e.g. the "Copy paths of UNCHECKED"
// output from orphans.html). Needs SUPABASE_SECRET_KEY for --commit.
// Tip: run list-orphans.mjs first and review orphans.html before committing.

import { readFileSync } from "node:fs";
import { createSb, BUCKET, listAllObjects, loadReferenceIndex } from "./lib/media-refs.mjs";

const COMMIT = process.argv.includes("--commit");
const fromArg = (() => { const i = process.argv.indexOf("--from"); return i >= 0 ? process.argv[i + 1] : null; })();

const { sb } = createSb({ needWrite: COMMIT });
console.log(`${COMMIT ? "COMMIT" : "DRY RUN"} — scanning bucket "${BUCKET}"...`);

const [allObjects, refIndex] = await Promise.all([listAllObjects(sb), loadReferenceIndex(sb)]);
const sizeByPath = new Map(allObjects.map((o) => [o.path, o.size]));

// Live orphan set — the only paths we will ever delete.
const orphanSet = new Set(allObjects.filter((o) => !refIndex.isReferenced(o.path)).map((o) => o.path));

let target;
if (fromArg) {
  const requested = readFileSync(fromArg, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const safe = requested.filter((p) => orphanSet.has(p));
  const refused = requested.filter((p) => !orphanSet.has(p));
  const unknown = requested.filter((p) => !sizeByPath.has(p));
  console.log(`Input list: ${requested.length} paths — ${safe.length} confirmed orphans, ${refused.length} skipped.`);
  if (refused.length) {
    console.log(`  ⚠ skipped (referenced or not found, NOT deleted):`);
    for (const p of refused) console.log(`     ${p}${unknown.includes(p) ? " (not in bucket)" : " (still referenced!)"}`);
  }
  target = safe;
} else {
  target = [...orphanSet];
}

const bytes = target.reduce((s, p) => s + (sizeByPath.get(p) ?? 0), 0);
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`\n${COMMIT ? "Deleting" : "Would delete"} ${target.length} orphan(s), freeing ${mb(bytes)}.`);

if (!COMMIT) {
  console.log(`\nDry run only. Review scripts/out/orphans.html, then re-run with --commit.`);
  process.exit(0);
}

let deleted = 0;
for (let i = 0; i < target.length; i += 100) {
  const batch = target.slice(i, i + 100);
  const { error } = await sb.storage.from(BUCKET).remove(batch);
  if (error) { console.log(`  ! delete batch failed: ${error.message}`); continue; }
  deleted += batch.length;
}
console.log(`\nDeleted ${deleted} files, freed ${mb(bytes)}. Re-run list-orphans.mjs to confirm.`);
