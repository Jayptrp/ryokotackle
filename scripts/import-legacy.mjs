// Legacy catalog importer (pure transformer — emits SQL + a review CSV; no DB creds).
//
//   node scripts/import-legacy.mjs
//
// Reads the legacy export, classifies each row (product / category-header /
// excluded-resource), derives brand + category, translates Thai names to English,
// de-duplicates, slugifies, and writes:
//   - supabase/seed/seed-catalog.sql   (brands + products inserts; apply via MCP)
//   - excluded-resources.csv           (rows kept out of the site, for user review)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INPUT = resolve(ROOT, "..", "Ryoko_legacy_database-alike.txt");

// ----------------------------------------------------------------------------
// Brands
// ----------------------------------------------------------------------------
const BRANDS = {
  ryoko: "RYOKO", ballista: "Ballista", "g-luck": "G-Luck", sakura: "Sakura",
  kaido: "KAIDO", relix: "Relix", akari: "AKARI", blueblue: "BlueBlue",
  try: "TRY", fuji: "FUJI", decoy: "DECOY", moncross: "Moncross",
  "jim-c": "Jim-C", atisen: "Atisen", inno: "Inno", sportube: "Sportube",
};

function detectBrand(name, legacyCat) {
  const n = name.toLowerCase();
  const has = (s) => n.includes(s);
  if (has("ballista")) return "ballista";
  if (has("sakura")) return "sakura";
  if (has("kaido") || has("stealth")) return "kaido";
  if (has("relix") || has("viking")) return "relix";
  if (has("akari")) return "akari";
  if (has("blueblue")) return "blueblue";
  if (has("moncross")) return "moncross";
  if (has("jim-c")) return "jim-c";
  if (has("decoy")) return "decoy";
  if (has("sportube")) return "sportube";
  if (has("inno ") || has("caemate")) return "inno";
  if (has("fuji")) return "fuji";
  if (has("g-luck") || has("g luck") || has("gluck")) return "g-luck";
  if (/\btry\b/.test(n)) return "try";
  if (has("ryoko") || /\bryok\b/.test(n)) return "ryoko";
  if (has("atisen")) return "atisen";
  // fall back to the brand implied by the legacy category
  const c = legacyCat.toLowerCase();
  if (c.includes("ryoko")) return "ryoko";
  if (c.includes("ballista")) return "ballista";
  if (c.includes("g-luck") || c.includes("g luck")) return "g-luck";
  if (c.includes("sakura")) return "sakura";
  if (c.includes("kaido")) return "kaido";
  if (c.includes("relix")) return "relix";
  return null;
}

// ----------------------------------------------------------------------------
// Categories
// ----------------------------------------------------------------------------
const ROD_HEADERS = {
  "คันตีเหยื่อปลอม H": "rods-lure-casting",
  "คันไลน์จิ๊ก ป๊อป ทะเล": "rods-jigging-popping",
  "คันปลาบึก": "rods-big-game",
  "คันตกปลาอื่นๆ": "rods-other",
};

const APPAREL_KW = ["glove", "ถุงมือ", "หมวก", " cap", "straw", "jacket", "ชูชีพ", "เสื้อ", "uv", "akinari"];
const PARTS_KW = ["eva", "knob", "knop", "reelseat", "reel seat", "gimbal", "ดูด", "ring", "snap", "แขนแต่ง", "handle", "t-bar", "guide set", "grease", "grip protection", "เบ้า"];
const BOXBAG_KW = ["box", "กล่อง", "bag", "กระเป๋า", "barrel", "ซอง", "tackle box", "pouch"];
const REEL_KW = ["reel", "รอก", "spinning", "spincast", "กระปุก"];
// Note: avoid bare "เบ็ด" — it is a substring of "คันเบ็ด" (rod) and "ตัวเบ็ด".
const HOOK_KW = ["hook", "ตาเบ็ด", "ดาเบ็ด", "iseama", "sabiki", "ซาบิกิ", "treble", "assist"];

const has = (s, arr) => arr.some((k) => s.includes(k));

function detectCategory(name, legacyCat, rodSub) {
  const n = name.toLowerCase();
  switch (legacyCat) {
    case "RYOKO Reel":
      return n.includes("rod") ? "rods" : "reels";
    case "RYOKO Product": {
      if (n.includes("รอกไฟฟ้า") || n.includes("electric")) return "rods-electric-reel";
      if (/surf|suft/.test(n)) return "rods-surf";
      if (rodSub) return rodSub;
      if (/pop|jig|spinpop|popping/.test(n)) return "rods-jigging-popping";
      return "rods";
    }
    case "Ryoko Product (Accessories/Gear Category)":
      if (has(n, HOOK_KW)) return "hooks-rigging";
      if (has(n, APPAREL_KW)) return "apparel";
      if (has(n, PARTS_KW)) return "parts";
      if (has(n, BOXBAG_KW)) return "tackle-boxes";
      if (n.includes("superman") || n.includes("rod")) return "rods";
      return "accessories";
    case "Sakura Products":
      return n.includes("reel") ? "reels" : "rods";
    case "Ballista Products":
      if (n.includes("reel")) return "reels";
      if (n.includes("jacket") || n.includes("grip protection")) return "accessories";
      return "rods";
    case "G-Luck Product (including Gears & Reels)":
      if (has(n, HOOK_KW)) return "hooks-rigging";
      if (has(n, REEL_KW)) return "reels";
      if (has(n, BOXBAG_KW)) return "tackle-boxes";
      return "accessories";
    case "KAIDO STEALTH Reel":
      return n.includes("rod") ? "rods" : "reels";
    case "Relix ViKing Reel":
      return "reels";
    case "Fluorocarbon-Nylon":
      return "lines-fluoro-nylon";
    case "PE BRAID":
      return "lines-pe-braid";
    case "G LUCK TACKLE BOX":
      return "tackle-boxes";
    case "Lures _ Jig lures":
      return "lures-jigs";
    case "ดาเบ็ดสำาหรับตกปลา (Hooks & Rigging)":
      return "hooks-rigging";
    case "Accessories Etc":
      if (has(n, HOOK_KW)) return "hooks-rigging";
      if (has(n, PARTS_KW)) return "parts";
      return "accessories";
    default:
      return "accessories";
  }
}

// ----------------------------------------------------------------------------
// Thai → English name map (exact legacy item_name → English). Originals are kept
// in products.name_th for admin verification.
// ----------------------------------------------------------------------------
const TH_MAP = {
  "RYOKO คันใส่รอกไฟฟ้า Horizon": "RYOKO Horizon Electric Reel Rod",
  "RYOKO คันใส่รอกไฟฟ้า Baygame": "RYOKO Baygame Electric Reel Rod",
  "RYOKO Feather Steel 2.4M คันใส่รอกไฟฟ้า": "RYOKO Feather Steel 2.4M Electric Reel Rod",
  "คันชิงหลิว 2Packs": "Whip Rod (2 Packs)",
  "คันชิงหลิว V2": "Whip Rod V2",
  "Akinari Glove ถุงมือ": "Akinari Gloves",
  "RYOKO ลูกหมุน / Rolling Swivel": "RYOKO Rolling Swivel",
  "ชูชีพ Life Jacket Inflation": "Inflatable Life Jacket",
  "RYOKO Rod Barrel ซูม": "RYOKO Rod Barrel",
  "RYOKO กล่อง R3000 R7000": "RYOKO Box R3000 / R7000",
  "RYOKO ลูกหมุน2ชั้น ตีเหยื่อปลอม": "RYOKO Double Swivel (Lure Casting)",
  "RYOKO ชูชีพ/Inflator Jacket": "RYOKO Inflatable Life Jacket",
  "RYOKO Glove ถุงมือ": "RYOKO Gloves",
  "RYOKO หมวกฟาง straw": "RYOKO Straw Hat",
  "RYOKO เสื้อตกปลากันUV": "RYOKO UV Protection Fishing Shirt",
  "RYOKO หมวกแก๊ป cap": "RYOKO Cap",
  "RYOKO หมวกแก๊ป Gap": "RYOKO Cap (Gap)",
  "RYOKO กระเป๋าใส่เหยื่อ Bag": "RYOKO Lure Bag",
  "กล่องเหยื่อ Moncross Switzerland Premium Tackle Box": "Moncross Switzerland Premium Tackle Box",
  "RYOKO Outdoor Gear ชุดเข็มขัด": "RYOKO Outdoor Gear Belt Set",
  "ซองสำหรับใส่รอก": "Reel Pouch",
  "กระเป๋าใส่รอกหยดน้ำ": "Baitcasting Reel Bag",
  "GimBelt V3 เข็มขัดสู่ปลา": "GimBelt V3 Fighting Belt",
  "Line Winder Spooler เครื่องกรอสาย": "Line Winder Spooler",
  "RYOKO Gripper ที่คืบปากปลา": "RYOKO Fish Gripper",
  "RYOKO กระเป๋าสะพาย Bag": "RYOKO Shoulder Bag",
  "RYOKO Pliers คีมอลู": "RYOKO Aluminium Pliers",
  "RYOKO Pliers ม ตัด ถ่าง ดึง": "RYOKO Pliers (Cut / Spread / Pull)",
  "RYOKO Saltwater Pliers คีมอลู": "RYOKO Saltwater Aluminium Pliers",
  "RYOKO แขนแต่ง Jigging V1": "RYOKO Jigging Power Handle V1",
  "RYOKO แขนแต่ง Jigging V2": "RYOKO Jigging Power Handle V2",
  "แขนแต่งรอกสปินนิ่ง": "Spinning Reel Power Handle",
  "RYOKO แขนแต่ง Jigging V3": "RYOKO Jigging Power Handle V3",
  "RYOKO แขนแต่งรอก Carbon Handle": "RYOKO Carbon Reel Handle",
  "BALLISTA Okina IKA ดกหมึก": "BALLISTA Okina IKA (Squid)",
  "BALLISTA Metro คันสะป๋ว": "BALLISTA Metro Rod",
  "BALLISTA Kashmir คันสะป๋ว": "BALLISTA Kashmir Rod",
  "สายพันโคนคันเบ็ด Rod Grip Protection": "Rod Grip Protection Wrap",
  "ซองแขวนคันเบ็ด I RODS JACKET": "Rod Sleeve / Rods Jacket",
  "Gripper YS10 ที่คืบปากปลา": "G-Luck Gripper YS10",
  "Gripper GS10 ที่คืบปากปลา": "G-Luck Gripper GS10",
  "G-Luck แท่นวางคัน Rod Rack": "G-Luck Rod Rack",
  "เข็มขัดคาดเอวสู่ปลา Belt": "G-Luck Fighting Belt",
  "สายรัดคันเบ็ด Rod Strape": "G-Luck Rod Strap",
  "Gripper Aluminum ที่คีบปากปลา": "G-Luck Aluminium Gripper",
  "Gripper Stainless ที่คีบปากปลา": "G-Luck Stainless Gripper",
  "ตาเบ็ดกล่อง ISEAMA": "ISEAMA Hook Box",
  "G-Luck คีม Pliers": "G-Luck Pliers",
  "G-Luck Rod Bag กระเป๋าใส่คัน": "G-Luck Rod Bag",
  "กระเป๋าใส่คัน 7-10ft ROD BARREL": "Rod Barrel Bag 7-10ft",
  "G-Luck Cosmos รอกกระปุก": "G-Luck Cosmos Spincast Reel",
  "SANGHRA รอก Spinning": "G-Luck Sanghra Spinning Reel",
  "SANGPOO รอก Spinning": "G-Luck Sangpoo Spinning Reel",
  "Mini 500/1000 รอก Spinning": "G-Luck Mini 500/1000 Spinning Reel",
  "ช็อกลีด RYOKO Fluorocarbon": "RYOKO Fluorocarbon Shock Leader",
  "สายเอ็น RYOKO Coral 4": "RYOKO Coral 4 Mono Line",
  "สายเอ็น RYOKO 3GEN Max Power": "RYOKO 3Gen Max Power Line",
  "ช็อกลีด RYOKO GT Nylon Leader": "RYOKO GT Nylon Shock Leader",
  "สายเอ็น RYOKO 8Gen Max Power": "RYOKO 8Gen Max Power Line",
  "ช็อกลีด RYOKO Shock Leader": "RYOKO Shock Leader",
  "สายเอ็น RYOKO Prime": "RYOKO Prime Line",
  "สาย PE SAKURA 8X 100M": "Sakura PE Braid 8X 100M",
  "สาย PE BALLISTA 8X 100M": "Ballista PE Braid 8X 100M",
  "สาย PE สำหรับผูกเบ็ด Jigging": "PE Braid for Jigging Assist",
  "สาย Braided สําหรับผูกดาเบ็ด": "Braided Line for Assist Hooks",
  "สายสลิงตกปลา": "Fishing Wire Leader",
  "สายสลิงตกปลา Stainless Wire": "Stainless Steel Wire Leader",
  "Ryoko Tackle Box กล่องเหยื่อ": "Ryoko Tackle Box",
  "กล่องอุปกรณ์และกล่องเหยื่อปลอม tackle box": "Tackle & Lure Box",
  "กระเป๋าสะพายข้าง": "Side Shoulder Bag",
  "กล่องคาดเอวใส่เหยื่อปลอม รุ่น 5010": "Waist Lure Box (Model 5010)",
  "Fishing Rod Barrel ชุม": "Fishing Rod Barrel",
  "Sportube Series 1 ซูม": "Sportube Series 1",
  "Inno Caemate IF40HJ DRAGON ซูม": "Inno Caemate IF40HJ Dragon",
  "เหยื่อจิ๊ก AKARI Jig Lure": "AKARI Jig Lure",
  "เหยื่อจิ๊ก BlueBlue Jig)": "BlueBlue Jig",
  "เหยื่อจิ๊ก AKARI Jig Lures": "AKARI Jig Lures",
  "เหยื่อปลอม AKARI Lures": "AKARI Lures",
  "AKARI เบ็ดโชกปลา ซาบิกิ": "AKARI Sabiki Rig",
  "หมึกยางเรืองแสง squid skirts": "Glow Squid Skirts",
  "หัวเชื้อตกปลา Bo Rider": "Bo Rider Fishing Attractant",
  "Treble Hooks เบ็ด3ทาง": "Treble Hooks",
  "ตาเบ็ด ชิงหลิว": "Whip Rod Hooks",
  "Egler craw Vietnam hook เบ็ด": "Egler Craw Vietnam Hook",
  "Depth Gauge ที่วัดสาย": "Depth Gauge",
  "ที่คล้องปากปลา": "Fish Lip Holder",
  "ดูดยาง Rubber Butt End": "Rubber Butt End",
  "ดูดแฉกอลู ROD GIMBALS": "Aluminium Rod Gimbal",
  "ปากกาจับตัวเบ็ด Fly Tying Tool": "Fly Tying Vise",
  "DECOY / Hook / Decoy Fishing Hooks": "DECOY Fishing Hooks",
};

// Vague catch-all / section rows (kept off the site, sent to review CSV).
const CATCHALL = new Set([
  "รวมสายเอ็นคุณภาพ++",
  "เหยื่อปลอมรุ่นอื่นๆ Lures",
  "BlueBlue",
  "Atisen",
]);

const THAI_RE = /[฀-๿]/;

function classify(name) {
  if (/diagram/i.test(name)) return "diagram";
  if (/\bblank\b/i.test(name) && /\btest\b/i.test(name)) return "blank-test";
  if (/service\s*\/\s*diagram/i.test(name)) return "service";
  if (CATCHALL.has(name)) return "catch-all";
  if (name in ROD_HEADERS) return "rod-header";
  return "product";
}

function slugify(s) {
  const base = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return base || "item";
}

const sql = (s) => (s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`);

// ----------------------------------------------------------------------------
// Parse
// ----------------------------------------------------------------------------
const lines = readFileSync(INPUT, "utf8").split(/\r?\n/).filter((l) => l.trim());
lines.shift(); // header row

const products = [];
const excluded = [];
const slugs = new Set();
const seenName = new Map(); // normalized english name -> slug
let rodSub = null;
let prevCat = null;

for (const line of lines) {
  const parts = line.split(",");
  if (parts.length < 4) continue;
  const status = parts[parts.length - 1].trim();
  parts.pop(); parts.pop(); // drop status + n_viewer
  const legacyCat = parts.shift().trim();
  const itemName = parts.join(",").trim();
  if (!itemName) continue;

  if (legacyCat !== prevCat) { rodSub = null; prevCat = legacyCat; }

  const kind = classify(itemName);
  if (kind === "rod-header") { rodSub = ROD_HEADERS[itemName]; continue; }
  if (kind !== "product") {
    excluded.push({ legacyCat, itemName, reason: kind });
    continue;
  }

  const english = TH_MAP[itemName] ?? itemName;
  const nameTh = THAI_RE.test(itemName) ? itemName : null;
  const key = english.toLowerCase();
  if (seenName.has(key)) {
    excluded.push({ legacyCat, itemName, reason: "duplicate" });
    continue;
  }

  let slug = slugify(english);
  let i = 2;
  while (slugs.has(slug)) slug = `${slugify(english)}-${i++}`;
  slugs.add(slug);
  seenName.set(key, slug);

  products.push({
    slug,
    name: english,
    nameTh,
    brand: detectBrand(english, legacyCat),
    category: detectCategory(itemName, legacyCat, rodSub),
    status: status.toLowerCase() === "unactive" ? "hidden" : "published",
    legacyCat,
  });
}

// ----------------------------------------------------------------------------
// Emit SQL
// ----------------------------------------------------------------------------
const usedBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

function brandsSql() {
  return (
    "insert into public.brands (slug, name) values\n" +
    usedBrands.map((b) => `  (${sql(b)}, ${sql(BRANDS[b])})`).join(",\n") +
    "\non conflict (slug) do nothing;\n"
  );
}

function productsSql(rows) {
  return (
    "insert into public.products (slug, name, name_th, status, legacy_category, brand_id, category_id)\n" +
    "select v.slug, v.name, v.name_th, v.status::public.product_status, v.legacy_category, b.id, c.id\n" +
    "from (values\n" +
    rows
      .map((p) =>
        `  (${sql(p.slug)}, ${sql(p.name)}, ${sql(p.nameTh)}, ${sql(p.status)}, ${sql(p.legacyCat)}, ${sql(p.brand)}, ${sql(p.category)})`,
      )
      .join(",\n") +
    "\n) as v(slug, name, name_th, status, legacy_category, brand_slug, cat_slug)\n" +
    "left join public.brands b on b.slug = v.brand_slug\n" +
    "left join public.categories c on c.slug = v.cat_slug\n" +
    "on conflict (slug) do nothing;\n"
  );
}

const HEADER = "-- Generated by scripts/import-legacy.mjs — do not edit by hand.\n\n";

// Full single-file seed (committed for reference / local psql).
mkdirSync(resolve(ROOT, "supabase", "seed"), { recursive: true });
writeFileSync(
  resolve(ROOT, "supabase", "seed", "seed-catalog.sql"),
  HEADER + brandsSql() + "\n" + productsSql(products),
  "utf8",
);

// Batched files (each a complete statement) for applying via the Supabase MCP.
const BATCH = 130;
const outDir = resolve(ROOT, "scripts", "out");
mkdirSync(outDir, { recursive: true });
let batchIdx = 0;
writeFileSync(resolve(outDir, "seed-00-brands.sql"), HEADER + brandsSql(), "utf8");
for (let i = 0; i < products.length; i += BATCH) {
  batchIdx += 1;
  const chunk = products.slice(i, i + BATCH);
  const file = `seed-${String(batchIdx).padStart(2, "0")}-products.sql`;
  writeFileSync(resolve(outDir, file), HEADER + productsSql(chunk), "utf8");
}

// excluded-resources.csv
const csv =
  "legacy_category,item_name,reason\n" +
  excluded
    .map((e) => [e.legacyCat, e.itemName, e.reason].map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
    .join("\n") +
  "\n";
writeFileSync(resolve(ROOT, "excluded-resources.csv"), csv, "utf8");

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
const byCat = {};
const byBrand = {};
for (const p of products) {
  byCat[p.category] = (byCat[p.category] || 0) + 1;
  byBrand[p.brand ?? "(none)"] = (byBrand[p.brand ?? "(none)"] || 0) + 1;
}
console.log(`products:  ${products.length}`);
console.log(`  published: ${products.filter((p) => p.status === "published").length}, hidden: ${products.filter((p) => p.status === "hidden").length}`);
console.log(`brands:    ${usedBrands.length} -> ${usedBrands.join(", ")}`);
console.log(`excluded:  ${excluded.length}`);
console.log("by category:", JSON.stringify(byCat));
console.log("by brand:", JSON.stringify(byBrand));
console.log("\nwrote supabase/seed/seed-catalog.sql and excluded-resources.csv");
