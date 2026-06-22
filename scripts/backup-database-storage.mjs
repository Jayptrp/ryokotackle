// Full local backup of the Supabase project: database (pg_dump) + Storage files.
// Both outputs land in scripts/out/:
//   • scripts/out/backup.dump   — custom-format Postgres dump (restore w/ pg_restore)
//   • scripts/out/storage/      — mirror of the product-media bucket (incremental)
//
// Needs in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (for storage),
// and SUPABASE_PASSWORD (database password, for pg_dump).
//
// Usage:
//   node scripts/backup-database-storage.mjs            # db + storage
//   node scripts/backup-database-storage.mjs --db-only
//   node scripts/backup-database-storage.mjs --storage-only
//
// pg_dump must be installed. Set PG_DUMP to override its path; otherwise this
// tries the default Windows install then falls back to `pg_dump` on PATH.
//
// NOTE: keep scripts/out/ out of git (.gitignore) — these are backups, not source.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnv, createSb, BUCKET, listAllObjects } from "./lib/media-refs.mjs";

const args = process.argv.slice(2);
const DB_ONLY = args.includes("--db-only");
const STORAGE_ONLY = args.includes("--storage-only");

const OUT_DIR = "scripts/out";
const DUMP_PATH = join(OUT_DIR, "backup.dump");
const STORAGE_DIR = join(OUT_DIR, "storage");
mkdirSync(OUT_DIR, { recursive: true });

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// ---------------------------------------------------------------- database
function backupDatabase() {
  const { password } = loadEnv();
  if (!password) {
    console.error("SUPABASE_PASSWORD missing from .env.local — cannot run pg_dump.");
    process.exit(1);
  }

  // Prefer PGPASSWORD + explicit flags over embedding the password in the URI,
  // so passwords with special characters don't need URL-encoding.
  const pgDump =
    process.env.PG_DUMP ||
    (existsSync("C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe")
      ? "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"
      : "pg_dump");

  console.log(`Dumping database → ${DUMP_PATH} ...`);
  const res = spawnSync(
    pgDump,
    [
      "-h", "aws-1-ap-northeast-1.pooler.supabase.com",
      "-p", "5432",
      "-U", "postgres.nqzcxrfnfykzgxtvjjdy",
      "-d", "postgres",
      "--no-owner", "--no-acl",
      "-F", "c",
      "-f", DUMP_PATH,
    ],
    { env: { ...process.env, PGPASSWORD: password }, stdio: "inherit" },
  );

  if (res.error && res.error.code === "ENOENT") {
    console.error(`pg_dump not found (${pgDump}). Install it or set PG_DUMP to its full path.`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error(`pg_dump failed (exit ${res.status}).`);
    process.exit(1);
  }
  console.log(`  ✓ database dumped (${mb(statSync(DUMP_PATH).size)})`);
}

// ----------------------------------------------------------------- storage
async function backupStorage() {
  const { sb } = createSb();
  console.log(`Mirroring bucket "${BUCKET}" → ${STORAGE_DIR} (incremental) ...`);
  const objects = await listAllObjects(sb);

  let downloaded = 0, skipped = 0, failed = 0, bytes = 0;
  for (const obj of objects) {
    const dest = join(STORAGE_DIR, obj.path);
    if (existsSync(dest) && statSync(dest).size === obj.size) { skipped++; continue; }
    try {
      const { data, error } = await sb.storage.from(BUCKET).download(obj.path);
      if (error) throw error;
      const buf = Buffer.from(await data.arrayBuffer());
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, buf);
      downloaded++; bytes += buf.length;
      if (downloaded % 200 === 0) console.log(`  …${downloaded} downloaded`);
    } catch (e) {
      console.log(`  ! failed: ${obj.path} — ${e.message}`);
      failed++;
    }
  }
  console.log(`  ✓ storage: downloaded ${downloaded} (${mb(bytes)}), skipped ${skipped} unchanged, failed ${failed}`);
}

// --------------------------------------------------------------------- run
if (!STORAGE_ONLY) backupDatabase();
if (!DB_ONLY) await backupStorage();
console.log(`\nBackup complete → ${OUT_DIR}/ (backup.dump + storage/)`);
