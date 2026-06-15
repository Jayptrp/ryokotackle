// Generate a self-contained HTML report of orphaned product-media files —
// storage objects referenced by NO database row (url columns) and NOT embedded
// in any rich-text body (products.description/summary, pages.content).
//
// Read-only: it never deletes or modifies anything. Open the output in a
// browser to eyeball the images before deciding what to remove.
//
// Usage:
//   node scripts/list-orphans.mjs              # writes scripts/out/orphans.html
//
// Output is a single static HTML file (images load from the public bucket), so
// you can hand it to someone without giving them dashboard access.

import { mkdirSync, writeFileSync } from "node:fs";
import { createSb, BUCKET, listAllObjects, loadReferenceIndex } from "./lib/media-refs.mjs";

const OUT = "scripts/out/orphans.html";

const { sb, url } = createSb();
console.log(`Scanning bucket "${BUCKET}" for orphans...`);

const [allObjects, refIndex] = await Promise.all([listAllObjects(sb), loadReferenceIndex(sb)]);

const orphans = allObjects
  .filter((o) => !refIndex.isReferenced(o.path))
  .map((o) => ({
    path: o.path,
    folder: o.path.split("/")[1] ?? "(root)",
    size: o.size,
    createdAt: o.createdAt,
    publicUrl: `${url}/storage/v1/object/public/${BUCKET}/${encodeURI(o.path)}`,
  }))
  .sort((a, b) => b.size - a.size);

const totalBytes = orphans.reduce((s, o) => s + o.size, 0);
const totalAll = allObjects.reduce((s, o) => s + o.size, 0);
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

const byFolder = {};
for (const o of orphans) {
  byFolder[o.folder] ??= { files: 0, bytes: 0 };
  byFolder[o.folder].files++;
  byFolder[o.folder].bytes += o.size;
}
const folderSummary = Object.entries(byFolder)
  .sort((a, b) => b[1].bytes - a[1].bytes)
  .map(([f, v]) => `<span class="pill">${f}: <b>${v.files}</b> · ${mb(v.bytes)}</span>`)
  .join(" ");

const isImage = (p) => /\.(jpe?g|png|gif|webp)$/i.test(p);

const cards = orphans
  .map((o, i) => {
    const thumb = isImage(o.path)
      ? `<img loading="lazy" src="${o.publicUrl}" alt="">`
      : `<div class="noimg">${o.path.split(".").pop()?.toUpperCase() ?? "FILE"}</div>`;
    const date = o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "";
    return `<label class="card" data-i="${i}">
      <input type="checkbox" class="keep">
      <div class="thumb">${thumb}</div>
      <div class="meta">
        <span class="badge">${o.folder}</span>
        <span class="size">${mb(o.size)}</span>
        <span class="date">${date}</span>
        <a class="path" href="${o.publicUrl}" target="_blank" rel="noopener">${o.path}</a>
      </div>
    </label>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Orphaned media — Ryoko Tackle</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1a1a1a; background: #f6f6f4; }
  header { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid #e3e3df; padding: 16px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
  h1 { margin: 0 0 6px; font-size: 20px; }
  .sub { color: #666; font-size: 14px; }
  .stats { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .pill { background: #eef1ee; border-radius: 999px; padding: 3px 10px; font-size: 13px; }
  .big { font-size: 15px; font-weight: 600; }
  .actions { margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  button { font: inherit; border: 1px solid #cfcfca; background: #fff; border-radius: 8px; padding: 6px 14px; cursor: pointer; }
  button:hover { border-color: #999; }
  .hint { color: #888; font-size: 13px; }
  main { padding: 20px 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
  .card { background: #fff; border: 1px solid #e3e3df; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: box-shadow .15s, border-color .15s; position: relative; }
  .card:hover { box-shadow: 0 3px 12px rgba(0,0,0,.08); }
  .card:has(.keep:checked) { border-color: #2a7; box-shadow: 0 0 0 2px #2a7 inset; }
  .keep { position: absolute; top: 8px; left: 8px; z-index: 2; width: 20px; height: 20px; }
  .thumb { aspect-ratio: 1; background: #fafaf8 repeating-conic-gradient(#f0f0ec 0% 25%, #fff 0% 50%) 50% / 18px 18px; display: flex; align-items: center; justify-content: center; }
  .thumb img { width: 100%; height: 100%; object-fit: contain; }
  .noimg { color: #999; font-weight: 600; letter-spacing: .05em; }
  .meta { padding: 8px 10px; display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
  .badge { align-self: flex-start; background: #eef1ee; border-radius: 6px; padding: 1px 7px; font-size: 11px; color: #555; }
  .size { font-weight: 600; }
  .date { color: #999; }
  .path { color: #36c; text-decoration: none; word-break: break-all; font-size: 11px; }
  .path:hover { text-decoration: underline; }
</style>
</head>
<body>
<header>
  <h1>Orphaned media files</h1>
  <div class="sub">Files in the <code>${BUCKET}</code> bucket that no product, category, carousel slide, or page content links to. Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.</div>
  <div class="stats">
    <span class="pill big">${orphans.length} orphans · ${mb(totalBytes)}</span>
    <span class="pill">bucket total: ${mb(totalAll)}</span>
    ${folderSummary}
  </div>
  <div class="actions">
    <button id="copyDelete">Copy paths of UNCHECKED (to delete)</button>
    <span class="hint">Tip: tick the ones to <b>keep</b>. Everything left unchecked is a deletion candidate.</span>
  </div>
</header>
<main id="grid">
${cards || '<p style="color:#888">No orphans found. 🎉</p>'}
</main>
<script>
  const orphans = ${JSON.stringify(orphans.map((o) => o.path))};
  document.getElementById("copyDelete").addEventListener("click", () => {
    const keep = new Set(
      [...document.querySelectorAll(".card")]
        .filter((c) => c.querySelector(".keep").checked)
        .map((c) => orphans[+c.dataset.i]),
    );
    const toDelete = orphans.filter((p) => !keep.has(p));
    navigator.clipboard.writeText(toDelete.join("\\n"));
    alert(toDelete.length + " path(s) copied to clipboard (the unchecked ones).");
  });
</script>
</body>
</html>`;

mkdirSync("scripts/out", { recursive: true });
writeFileSync(OUT, html, "utf8");

console.log(`\n${orphans.length} orphans, ${mb(totalBytes)} (bucket total ${mb(totalAll)}).`);
console.log("By folder:");
for (const [f, v] of Object.entries(byFolder).sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${f}: ${v.files} files, ${mb(v.bytes)}`);
}
console.log(`\nWrote ${OUT} — open it in a browser.`);
