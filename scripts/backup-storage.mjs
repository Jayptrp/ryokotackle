// Mirror the entire product-media bucket to a local folder, preserving paths.
// Incremental: skips files already downloaded with a matching size, so re-runs
// only fetch what changed. Read-only against Supabase — never modifies the bucket.
//
// Usage:
//   node scripts/backup-storage.mjs                 # → backups/storage/<date>/
//   node scripts/backup-storage.mjs --out D:/ryoko-media-backup   # custom folder
//
// Pair this with a pg_dump of the database for a full local backup.

import { mkdirSync, writeFileSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createSb, BUCKET, listAllObjects } from "./lib/media-refs.mjs";

const args = process.argv.slice(2);
const outArg = (() => { const i = args.indexOf("--out"); return i >= 0 ? args[i + 1] : null; })();
const OUT = outArg ?? join("backups", "storage", new Date().toISOString().slice(0, 10));

const { sb } = createSb();
console.log(`Backing up bucket "${BUCKET}" → ${OUT}`);

const objects = await listAllObjects(sb);
console.log(`${objects.length} objects found. Downloading (skipping unchanged)...`);

let downloaded = 0, skipped = 0, failed = 0, bytes = 0;

for (const obj of objects) {
  const dest = join(OUT, obj.path);
  // Skip if we already have a local copy of the same size.
  if (existsSync(dest) && statSync(dest).size === obj.size) { skipped++; continue; }

  try {
    const { data, error } = await sb.storage.from(BUCKET).download(obj.path);
    if (error) throw error;
    const buf = Buffer.from(await data.arrayBuffer());
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    downloaded++;
    bytes += buf.length;
    if (downloaded % 200 === 0) console.log(`  …${downloaded} downloaded`);
  } catch (e) {
    console.log(`  ! failed: ${obj.path} — ${e.message}`);
    failed++;
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`\nDone. downloaded ${downloaded} (${mb(bytes)}), skipped ${skipped} unchanged, failed ${failed}.`);
console.log(`Backup at: ${OUT}`);
