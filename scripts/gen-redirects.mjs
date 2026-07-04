#!/usr/bin/env node
/**
 * Build the legacy -> new-site 301 redirect map for the ReadyPlanet cutover.
 *
 * Source of truth for *which* URLs matter: the GSC "Performance on Search > Pages"
 * export (every legacy URL that actually earned impressions/clicks). The scraper
 * _manifest.csv is NOT used as a source — its URLs are the dead trytackle.com host
 * with cp874-mangled paths, not what Google indexed.
 *
 * Matching strategy (the new slugs were re-slugged on import, so exact slug match
 * is unreliable): normalise both sides to [a-z0-9] only (this also drops the Thai
 * descriptor prefix on product names) and match by name/slug, with a containment
 * fallback. Anything that doesn't resolve to a live product falls back to its
 * section's category — never a 404.
 *
 * Outputs (scripts/out/):
 *   redirects.csv         high-confidence rows (exact product matches + deterministic rules)
 *   redirects-review.csv  rows that need a human eyeball (fuzzy / discontinued / category)
 *   redirects.html        interactive viewer over ALL rows (search / sort / filter / export)
 *
 * Usage:  node scripts/gen-redirects.mjs [path/to/Pages.csv]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "out");

const GSC_PAGES =
  process.argv[2] ||
  path.join(
    ROOT,
    "gsc-index-page",
    "ryokotackle.com-Performance-on-Search-2026-06-26",
    "หน้า.csv",
  );

/* ----------------------------------------------------------------- env / db */

function loadEnv() {
  const env = {};
  const file = path.join(ROOT, ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m) env[m[1]] = m[2];
    }
  }
  return env;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SITE = (ENV.NEXT_PUBLIC_SITE_URL || "https://www.ryokotackle.com").replace(/\/$/, "");

async function rest(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

/* ------------------------------------------------------------- section map */
// Legacy brand-based sections -> closest new (type-based) category, or /products
// when the brand spans too many types. Edit freely — this is judgement, hence
// every row it produces lands in the REVIEW bucket.
const SECTION_MAP = {
  ryoko: "/products",
  "คัน-ryoko": "/category/rods",
  ballista: "/products",
  "ballista-product": "/products",
  kaido: "/products",
  sakura: "/products",
  relix: "/products",
  "relix-lines": "/category/lines",
  lure: "/category/lures-jigs",
  "jiglure-akari": "/category/lures-jigs",
  "เหยื่อปลอม-akari": "/category/lures-jigs",
  accressories: "/category/accessories",
  hook: "/category/hooks-rigging",
  "g-luck-product": "/products",
  "กล่องเหยื่อปลอม-g-luck": "/category/tackle-boxes",
  "กล่องใส่เหยื่อปลอม-g-luck": "/category/tackle-boxes",
  "ryoko-store": "/products",
  "relix-store": "/products",
  "akari-store": "/products",
  "ร้านอุปกรณ์ตกปลา": "/products",
  "atisen-product": "/products",
  decoy: "/category/hooks-rigging",
  ads: "/",
};

// Whole-path overrides for non-product .html pages.
const PATH_MAP = {
  "/contact-payment.html": "/contact",
  "/gallery.html": "/",
  "/clip.html": "/",
  "/สภาพอากาศปัจจุบัน.html": "/",
  "/ryoko/part-diagrams-reel.html": "/warranty",
};

/* ------------------------------------------------------------------ helpers */

const norm = (s) => (s || "").toLowerCase().normalize("NFC").replace(/[^a-z0-9]+/g, "");
// Distinctive English/numeric tokens (Thai + separators become delimiters, so the
// Thai descriptor prefix on product names is dropped). Used for order-insensitive
// subset matching ("RYOKO Polaris" vs "Polaris RYOKO Jigging Rod").
const tokenize = (s) =>
  [...new Set((s || "").toLowerCase().normalize("NFC").split(/[^a-z0-9]+/).filter((t) => t.length >= 2))];

function parseCsv(text) {
  // Simple line/comma split — none of the GSC fields contain commas
  // (URLs are comma-free; CTR is "4.44%"). Strips BOM + header.
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  lines.shift();
  return lines.map((l) => {
    const f = l.split(",");
    return { url: f[0], clicks: +f[1] || 0, impressions: +f[2] || 0 };
  });
}

function sourcePath(url) {
  const noHost = url.replace(/^https?:\/\/[^/]+/i, "");
  const q = noHost.indexOf("?");
  return q === -1 ? noHost : noHost.slice(0, q);
}

/* ------------------------------------------------------------- the matcher */

function buildMatcher(products) {
  const items = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    keys: [...new Set([norm(p.slug), norm(p.name), norm(p.name_th)].filter((k) => k.length))],
    // tokens come from the English name + slug (Thai name drops to nothing useful)
    tokens: [...new Set([...tokenize(p.name), ...tokenize(p.slug)])],
  }));
  const exact = new Map();
  for (const it of items) for (const k of it.keys) if (!exact.has(k)) exact.set(k, it);

  return function match(basename) {
    const nB = norm(basename);
    if (nB.length < 4) return null;
    if (exact.has(nB)) return { it: exact.get(nB), conf: "exact" };

    // tier 2 — one normalised key is a prefix of the other (shortest len-diff wins)
    if (nB.length >= 6) {
      const cands = [];
      for (const it of items)
        for (const k of it.keys) {
          if (k.length < 6) continue;
          if (k.startsWith(nB) || nB.startsWith(k))
            cands.push({ it, diff: Math.abs(k.length - nB.length) });
        }
      if (cands.length) {
        cands.sort((a, b) => a.diff - b.diff);
        const best = cands[0];
        const ambiguous = cands.some((c) => c.it.slug !== best.it.slug && c.diff === best.diff);
        return { it: best.it, conf: ambiguous ? "fuzzy-ambiguous" : "fuzzy" };
      }
    }

    // tier 3 — order-insensitive token subset (recovers reversed / extra-token names)
    const L = new Set(tokenize(basename));
    if (L.size >= 2) {
      const cands = [];
      for (const it of items) {
        if (it.tokens.length < 2) continue;
        const shared = it.tokens.filter((t) => L.has(t)).length;
        if (shared < 2) continue;
        const subset = shared === it.tokens.length || shared === L.size; // P⊆L or L⊆P
        if (subset) cands.push({ it, shared, extra: Math.abs(it.tokens.length - L.size) });
      }
      if (cands.length) {
        cands.sort((a, b) => b.shared - a.shared || a.extra - b.extra);
        const best = cands[0];
        const ambiguous = cands.some(
          (c) => c.it.slug !== best.it.slug && c.shared === best.shared && c.extra === best.extra,
        );
        return { it: best.it, conf: ambiguous ? "fuzzy-ambiguous" : "fuzzy" };
      }
    }
    return null;
  };
}

/* ----------------------------------------------------------------- classify */

function classify(url, match, catSlugs) {
  const pRaw = sourcePath(url);
  const p = pRaw.toLowerCase();
  const segs = pRaw.split("/").filter(Boolean);

  // home + legacy dynamic article/mobile URLs -> homepage
  if (p === "/" || p === "") return null; // home maps to home; no redirect
  if (p.includes("index.php") || p.startsWith("/_m/") || p.includes("content.php"))
    return { target: "/", type: "home/article", conf: "rule" };

  if (PATH_MAP[p]) return { target: PATH_MAP[p], type: "page", conf: "rule" };

  // product detail pages
  if (/\.html?$/i.test(p)) {
    const base = segs[segs.length - 1].replace(/\.html?$/i, "");
    const m = match(base);
    if (m) return { target: `/products/${m.it.slug}`, type: "product", conf: m.conf, slug: m.it.slug };
    // discontinued -> its section's category
    const dir = (segs.length > 1 ? segs[0] : "").toLowerCase();
    return { target: SECTION_MAP[dir] || "/products", type: "product-discontinued", conf: "fallback" };
  }

  // category / brand / pagination / store landing pages
  const key = segs[0].toLowerCase().replace(/_page\d+$/i, "");
  const target = SECTION_MAP[key];
  if (target) return { target, type: "category", conf: "rule" };
  return { target: "/products", type: "category", conf: "fallback" };
}

/* --------------------------------------------------------------------- main */

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY in .env.local");
    process.exit(1);
  }
  if (!fs.existsSync(GSC_PAGES)) {
    console.error("GSC Pages CSV not found:\n  " + GSC_PAGES);
    process.exit(1);
  }

  const [products, categories] = await Promise.all([
    rest("products", "select=slug,name,name_th,legacy_category&status=eq.published&limit=2000"),
    rest("categories", "select=slug"),
  ]);
  const catSlugs = new Set(categories.map((c) => c.slug));

  // sanity-check the section map targets exist
  for (const t of new Set(Object.values(SECTION_MAP)))
    if (t.startsWith("/category/") && !catSlugs.has(t.slice("/category/".length)))
      console.warn(`!! SECTION_MAP target has no category: ${t}`);

  const match = buildMatcher(products);
  const rows = parseCsv(fs.readFileSync(GSC_PAGES, "utf8"));

  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!/^https?:\/\//i.test(r.url)) continue;
    // Cloudflare Bulk Redirects reject a query string in the source URL. Strip
    // ?query (and #fragment) — a path-only source still matches all its query
    // variants — then dedupe (all /index.php?... collapse onto /index.php).
    const source = r.url.split("#")[0].split("?")[0];
    if (seen.has(source)) continue;
    seen.add(source);
    const c = classify(r.url, match, catSlugs);
    if (!c) continue;
    const target = SITE + c.target;
    if (source === target) continue; // skip self-redirects
    const bucket =
      c.conf === "exact" || (c.conf === "rule" && c.type !== "category") ? "auto" : "review";
    out.push({
      source,
      target,
      status: 301,
      clicks: r.clicks,
      impressions: r.impressions,
      type: c.type,
      confidence: c.conf,
      slug: c.slug || "",
      bucket,
    });
  }
  out.sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

  const auto = out.filter((r) => r.bucket === "auto");
  const review = out.filter((r) => r.bucket === "review");

  fs.mkdirSync(OUT, { recursive: true });
  const csv = (list) =>
    "source,target,status,clicks,impressions,type,confidence,slug\n" +
    list
      .map((r) =>
        [r.source, r.target, r.status, r.clicks, r.impressions, r.type, r.confidence, r.slug].join(","),
      )
      .join("\n");
  fs.writeFileSync(path.join(OUT, "redirects.csv"), csv(auto));
  fs.writeFileSync(path.join(OUT, "redirects-review.csv"), csv(review));
  fs.writeFileSync(path.join(OUT, "redirects.html"), html(out));

  // Cloudflare Bulk Redirects import (all rows, UTF-8, no BOM, lowercase booleans).
  const cf =
    "source_url,target_url,status_code,preserve_query_string,include_subdomains,subpath_matching,preserve_path_suffix\n" +
    out
      .map((r) => [r.source, r.target, r.status, "false", "false", "false", "false"].join(","))
      .join("\n");
  fs.writeFileSync(path.join(OUT, "redirects-cloudflare.csv"), cf);
  fs.writeFileSync(path.join(ROOT, "docs", "redirects-cloudflare.csv"), cf);

  const byType = {};
  for (const r of out) byType[r.type] = (byType[r.type] || 0) + 1;
  const clicks = out.reduce((s, r) => s + r.clicks, 0);
  console.log(`products: ${products.length}  legacy URLs: ${rows.length}  redirects: ${out.length}`);
  console.log(`  auto (high-confidence): ${auto.length}`);
  console.log(`  review (needs eyeball): ${review.length}`);
  console.log(`  by type:`, byType);
  console.log(`  clicks covered: ${clicks}`);
  console.log(`written -> scripts/out/{redirects.csv, redirects-review.csv, redirects.html}`);
}

/* ------------------------------------------------------------- HTML viewer */

function html(rows) {
  const data = JSON.stringify(rows);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ryoko — legacy redirect map</title>
<style>
  :root{--bg:#0b1020;--panel:#141b30;--line:#26304d;--txt:#e7ecf5;--mut:#9aa6c2;--accent:#5b9dff}
  *{box-sizing:border-box}
  body{margin:0;font:14px/1.45 system-ui,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--txt)}
  header{padding:18px 22px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--bg);z-index:5}
  h1{margin:0 0 4px;font-size:18px}
  .sub{color:var(--mut);font-size:12px}
  .cards{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 12px;min-width:96px}
  .card b{display:block;font-size:20px}
  .card span{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  .controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
  input,select,button{background:var(--panel);color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:13px}
  input[type=search]{min-width:260px;flex:1}
  button{cursor:pointer}
  button:hover{border-color:var(--accent)}
  .wrap{padding:0 22px 40px}
  table{width:100%;border-collapse:collapse;margin-top:14px}
  th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}
  th{position:sticky;top:0;background:var(--panel);cursor:pointer;user-select:none;font-size:12px;white-space:nowrap}
  th[data-sort]:hover{color:var(--accent)}
  td a{color:var(--accent);text-decoration:none;word-break:break-all}
  td a:hover{text-decoration:underline}
  .tag{display:inline-block;padding:1px 7px;border-radius:999px;font-size:11px;border:1px solid var(--line)}
  .b-auto{color:#7ee3a7;border-color:#2c5b41}
  .b-review{color:#ffcf72;border-color:#6b521f}
  .c-exact{color:#7ee3a7}.c-fuzzy{color:#ffcf72}.c-fuzzy-ambiguous{color:#ff9d6b}.c-fallback{color:#ff8a8a}.c-rule{color:#9aa6c2}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .muted{color:var(--mut)}
  .empty{padding:30px;text-align:center;color:var(--mut)}
</style></head><body>
<header>
  <h1>Ryoko — legacy → new redirect map</h1>
  <div class="sub">301 plan for the ReadyPlanet cutover · ranked by GSC clicks · review the amber rows before import</div>
  <div class="cards" id="cards"></div>
  <div class="controls">
    <input id="q" type="search" placeholder="search source / target / slug…">
    <select id="bucket"><option value="">all buckets</option><option value="auto">auto only</option><option value="review">review only</option></select>
    <select id="type"></select>
    <select id="conf"></select>
    <button id="export">⬇ Export filtered (Cloudflare CSV)</button>
    <span class="muted" id="count"></span>
  </div>
</header>
<div class="wrap"><table><thead><tr>
  <th data-sort="source">Legacy URL (source)</th>
  <th data-sort="target">New URL (target)</th>
  <th data-sort="type">Type</th>
  <th data-sort="confidence">Confidence</th>
  <th data-sort="bucket">Bucket</th>
  <th data-sort="clicks" class="num">Clicks</th>
  <th data-sort="impressions" class="num">Impr.</th>
</tr></thead><tbody id="tb"></tbody></table><div id="empty" class="empty" hidden>No rows match.</div></div>
<script>
const DATA = ${data};
const $ = (s)=>document.querySelector(s);
let sortKey="clicks", sortDir=-1;

function uniq(k){return [...new Set(DATA.map(r=>r[k]))].sort();}
function opt(sel,label,vals){sel.innerHTML='<option value="">'+label+'</option>'+vals.map(v=>'<option>'+v+'</option>').join('');}
opt($("#type"),"all types",uniq("type"));
opt($("#conf"),"all confidence",uniq("confidence"));

function filtered(){
  const q=$("#q").value.trim().toLowerCase(), b=$("#bucket").value, t=$("#type").value, c=$("#conf").value;
  return DATA.filter(r=>
    (!b||r.bucket===b)&&(!t||r.type===t)&&(!c||r.confidence===c)&&
    (!q||(r.source+' '+r.target+' '+r.slug).toLowerCase().includes(q))
  ).sort((a,z)=>{
    const x=a[sortKey],y=z[sortKey];
    return (typeof x==="number"?x-y:(''+x).localeCompare(''+y))*sortDir;
  });
}
function cards(rows){
  const clicks=rows.reduce((s,r)=>s+r.clicks,0);
  const a=rows.filter(r=>r.bucket==='auto').length, rv=rows.length-a;
  $("#cards").innerHTML=[["Redirects",rows.length],["Auto",a],["Review",rv],["Clicks covered",clicks]]
    .map(([l,v])=>'<div class="card"><b>'+v.toLocaleString()+'</b><span>'+l+'</span></div>').join('');
}
function render(){
  const rows=filtered();
  cards(rows);
  $("#count").textContent=rows.length+" / "+DATA.length+" shown";
  $("#empty").hidden=rows.length>0;
  $("#tb").innerHTML=rows.map(r=>'<tr>'+
    '<td><a href="'+r.source+'" target="_blank" rel="noopener">'+r.source.replace(/^https?:\\/\\/[^/]+/,'')+'</a></td>'+
    '<td><a href="'+r.target+'" target="_blank" rel="noopener">'+r.target.replace(/^https?:\\/\\/[^/]+/,'')+'</a></td>'+
    '<td>'+r.type+'</td>'+
    '<td class="c-'+r.confidence+'">'+r.confidence+'</td>'+
    '<td><span class="tag b-'+r.bucket+'">'+r.bucket+'</span></td>'+
    '<td class="num">'+r.clicks+'</td><td class="num muted">'+r.impressions+'</td></tr>').join('');
}
for(const id of ["q","bucket","type","conf"]) $("#"+id).addEventListener("input",render);
document.querySelectorAll("th[data-sort]").forEach(th=>th.addEventListener("click",()=>{
  const k=th.dataset.sort; sortDir=(sortKey===k)?-sortDir:(k==="clicks"||k==="impressions"?-1:1); sortKey=k; render();
}));
$("#export").addEventListener("click",()=>{
  const rows=filtered();
  const head="source_url,target_url,status_code,preserve_query_string,include_subdomains,subpath_matching,preserve_path_suffix";
  const body=rows.map(r=>[r.source,r.target,r.status,"false","false","false","false"].join(",")).join("\\n");
  const blob=new Blob([head+"\\n"+body],{type:"text/csv"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="redirects-cloudflare.csv";a.click();
});
render();
</script></body></html>`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
