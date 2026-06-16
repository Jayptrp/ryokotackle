// Reconcile a list of product names (e.g. pasted from the boss) against the
// products table — WITHOUT deleting anything. Reports which names map to a real
// product, which are ambiguous, and which don't match (with a closest-match
// suggestion, since pasted lists often have OCR/typo artifacts).
//
// Input:  scripts/out/delete-list.txt   (one product name per line)
// Usage:
//   node scripts/match-delete-list.mjs              # report only
//   node scripts/match-delete-list.mjs --write-ids  # also write scripts/out/delete-ids.txt
//
// The optional ids file is what a follow-up delete step would consume — so you
// review this report first, fix any mismatches, then delete by id (never by a
// fuzzy name match).

import { readFileSync, writeFileSync } from "node:fs";
import { createSb, selectAll } from "./lib/media-refs.mjs";

const WRITE_IDS = process.argv.includes("--write-ids");
const LIST = "scripts/out/delete-list.txt";
const IDS_OUT = "scripts/out/delete-ids.txt";

// Fold common homoglyphs (Greek/Turkish lookalikes from OCR) to ASCII, then
// lowercase and strip everything but letters/digits so spacing/punctuation
// differences don't cause false misses.
const HOMOGLYPHS = { "α": "a", "ε": "e", "ι": "i", "ν": "n", "μ": "m", "ο": "o", "ρ": "p", "İ": "i", "ı": "i", "І": "i" };
function norm(s) {
  return [...s.trim()]
    .map((ch) => HOMOGLYPHS[ch] ?? HOMOGLYPHS[ch.toLowerCase()] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const names = readFileSync(LIST, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);

const { sb } = createSb();
const products = await selectAll(sb, "products", "id, name, name_th, slug, status");

// Build normalized lookup (name preferred, name_th as fallback).
const byNorm = new Map();
for (const p of products) {
  for (const key of [p.name, p.name_th]) {
    if (!key) continue;
    const k = norm(key);
    if (!byNorm.has(k)) byNorm.set(k, []);
    if (!byNorm.get(k).some((x) => x.id === p.id)) byNorm.get(k).push(p);
  }
}

const matched = [], ambiguous = [], unmatched = [];
const seenIds = new Set();
for (const raw of names) {
  const hits = byNorm.get(norm(raw)) ?? [];
  if (hits.length === 1) {
    const p = hits[0];
    if (!seenIds.has(p.id)) { seenIds.add(p.id); matched.push({ raw, p }); }
  } else if (hits.length > 1) {
    ambiguous.push({ raw, hits });
  } else {
    // closest suggestion by edit distance on normalized strings
    const nr = norm(raw);
    let best = null;
    for (const p of products) {
      const d = levenshtein(nr, norm(p.name));
      if (!best || d < best.d) best = { d, p };
    }
    unmatched.push({ raw, best });
  }
}

const line = "─".repeat(60);
console.log(`\nList: ${names.length} names (${dupes.length} duplicate line(s))`);
console.log(`Products in DB: ${products.length}`);
console.log(`${line}\nMATCHED → ${matched.length} products will be targeted for deletion:`);
for (const { raw, p } of matched) {
  const note = norm(raw) === norm(p.name) ? "" : `  (list: "${raw}")`;
  console.log(`  ✓ ${p.name}  [${p.status}]${note}`);
}

if (ambiguous.length) {
  console.log(`${line}\nAMBIGUOUS → ${ambiguous.length} name(s) match MORE THAN ONE product (resolve manually):`);
  for (const { raw, hits } of ambiguous) console.log(`  ? "${raw}" → ${hits.map((h) => h.name).join(" | ")}`);
}

console.log(`${line}\nNO MATCH → ${unmatched.length} name(s) not found (closest guess shown):`);
for (const { raw, best } of unmatched) {
  console.log(`  ✗ "${raw}"   ~ closest: "${best?.p.name}" (distance ${best?.d})`);
}

if (dupes.length) console.log(`${line}\nDuplicate lines in list: ${[...new Set(dupes)].map((d) => `"${d}"`).join(", ")}`);

console.log(`${line}`);
console.log(`Summary: ${matched.length} to delete, ${ambiguous.length} ambiguous, ${unmatched.length} unmatched. ${products.length - matched.length} products would remain.`);

if (WRITE_IDS) {
  writeFileSync(IDS_OUT, matched.map((m) => m.p.id).join("\n") + "\n", "utf8");
  console.log(`\nWrote ${matched.length} ids → ${IDS_OUT}`);
} else {
  console.log(`\nReview above. Re-run with --write-ids to save the matched ids for the delete step.`);
}
