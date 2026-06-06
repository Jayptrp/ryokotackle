// Match scraped legacy product folders -> new DB products.
// Read-only: uses the public (publishable) key to read products; writes a
// review CSV (scripts/out/media-match-review.csv). No DB writes here.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// --- env ---
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key);

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const SCRAPE = "scrape-output";

// --- load DB products ---
const { data: products, error } = await sb
  .from("products")
  .select("id, slug, name, name_th")
  .limit(2000);
if (error) throw error;
const byNorm = new Map();
const STOP = new Set(["ryoko", "the", "for", "and", "series", "new", "rod", "reel"]);
const toks = (s) =>
  new Set(
    (s || "")
      .toLowerCase()
      .match(/[a-z0-9]{2,}/g)
      ?.filter((t) => !STOP.has(t)) || [],
  );
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
for (const p of products) {
  byNorm.set(norm(p.slug), p);
  byNorm.set(norm(p.name), p);
  p._tok = toks(`${p.slug} ${p.name} ${p.name_th || ""}`);
}
console.log(`DB products: ${products.length}`);

// --- scan scrape folders ---
const folders = readdirSync(SCRAPE, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

function bestMatch(slug, title) {
  const ns = norm(slug);
  if (byNorm.has(ns)) return { p: byNorm.get(ns), conf: "exact", score: 1 };
  const nt = norm((title || "").replace(/[^\x00-\x7f]/g, " "));
  if (nt && byNorm.has(nt)) return { p: byNorm.get(nt), conf: "exact", score: 1 };

  // token similarity: scrape slug + English title tokens vs DB tokens
  const a = toks(`${slug.replace(/-/g, " ")} ${(title || "").replace(/[^\x00-\x7f]/g, " ")}`);
  let best = null;
  for (const p of products) {
    const s = jaccard(a, p._tok);
    if (!best || s > best.score) best = { p, score: s };
  }
  if (!best || best.score < 0.18) return { p: null, conf: "none", score: best?.score || 0 };
  const conf = best.score >= 0.5 ? "high" : best.score >= 0.3 ? "medium" : "low";
  return { p: best.p, conf, score: best.score };
}

const rows = [];
for (const slug of folders) {
  const metaPath = join(SCRAPE, slug, "meta.json");
  if (!existsSync(metaPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const nImg = (meta.images || []).filter((i) => i.file).length;
  const nVid = (meta.videos || []).length;
  const m = bestMatch(slug, meta.title);
  rows.push({
    scrape_slug: slug,
    title: (meta.title || "").replace(/[\r\n,]+/g, " ").slice(0, 60),
    n_images: nImg,
    n_videos: nVid,
    confidence: m.conf,
    score: m.score.toFixed(2),
    // db_slug = the import target. Auto-filled ONLY for exact matches;
    // for everything else you verify the suggestion and paste it here.
    db_slug: m.conf === "exact" ? m.p?.slug || "" : "",
    suggested_db_slug: m.p?.slug || "",
    suggested_db_name: (m.p?.name || "").replace(/,/g, " "),
  });
}

// de-dup safety: flag scrape slugs that collided (folder reused)
rows.sort((a, b) => a.confidence.localeCompare(b.confidence) || a.scrape_slug.localeCompare(b.scrape_slug));

const order = { exact: 0, high: 1, medium: 2, low: 3, none: 4 };
rows.sort((a, b) => (order[a.confidence] - order[b.confidence]) || a.scrape_slug.localeCompare(b.scrape_slug));

mkdirSync("scripts/out", { recursive: true });
const out = join("scripts/out", "media-match-review.csv");
const cols = ["scrape_slug", "title", "n_images", "n_videos", "confidence", "score", "db_slug", "suggested_db_slug", "suggested_db_name"];
writeFileSync(out, cols.join(",") + "\n" + rows.map((r) =>
  cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(",")).join("\n"), "utf8");

const by = (c) => rows.filter((r) => r.confidence === c).length;
console.log(`folders: ${rows.length}`);
console.log(`  exact:   ${by("exact")}`);
console.log(`  high:    ${by("high")}   (≥0.50 — likely correct)`);
console.log(`  medium:  ${by("medium")} (0.30–0.50 — skim)`);
console.log(`  low:     ${by("low")}    (0.18–0.30 — check)`);
console.log(`  none:    ${by("none")}   (no match — likely non-products)`);
console.log(`review file -> ${out}`);
