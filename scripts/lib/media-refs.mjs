// Shared helpers for the product-media maintenance scripts
// (compress-storage.mjs, list-orphans.mjs).
//
// Loads Supabase credentials from .env.local (same pattern as
// import-legacy-media.mjs), walks the whole product-media bucket, and builds an
// index of which storage paths are still referenced by the database.
//
// IMPORTANT: a file is "referenced" if its path appears EITHER in a url column
// (product_media.url, categories.image_url, carousel_slides.image_url) OR as a
// substring inside a rich-text body (products.description, products.summary,
// pages.content). Tiptap inline images live only inside those bodies — checking
// url columns alone produces false orphans and would delete live images.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const BUCKET = "product-media";

export function loadEnv() {
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const publishable =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, secret, publishable };
}

/** Create a Supabase client. Pass needWrite=true to require the secret key. */
export function createSb({ needWrite } = {}) {
  const { url, secret, publishable } = loadEnv();
  if (needWrite && !secret) {
    console.error(
      "This needs SUPABASE_SECRET_KEY in .env.local (Dashboard → Settings → API → secret key).",
    );
    process.exit(1);
  }
  const key = needWrite ? secret : secret || publishable;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in .env.local.");
    process.exit(1);
  }
  return { sb: createClient(url, key, { auth: { persistSession: false } }), url };
}

/** Strip a public URL down to its in-bucket path. Idempotent for bare paths. */
export function urlToPath(value) {
  if (!value) return null;
  return value.replace(/^.*\/product-media\//, "");
}

/** Recursively list every object in the bucket. Returns [{ path, size, mimetype, createdAt }]. */
export async function listAllObjects(sb, prefix = "") {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back with no id/metadata — recurse into them.
      if (entry.id === null || entry.metadata == null) {
        out.push(...(await listAllObjects(sb, full)));
      } else {
        out.push({
          path: full,
          size: Number(entry.metadata?.size ?? 0),
          mimetype: entry.metadata?.mimetype ?? null,
          createdAt: entry.created_at ?? null,
        });
      }
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return out;
}

/**
 * Fetch ALL rows from a table, paginating past PostgREST's 1000-row cap.
 * (product_media alone has ~3000 rows — without this we'd miss references and
 * report live files as orphans.)
 */
export async function selectAll(sb, table, cols) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

/**
 * Build the reference index. Returns:
 *   urlPaths: Set<string> — paths referenced by a url column
 *   bodies:   string[]     — rich-text bodies to substring-match against
 *   isReferenced(path): boolean
 */
export async function loadReferenceIndex(sb) {
  const urlPaths = new Set();
  const addUrl = (v) => {
    const p = urlToPath(v);
    if (p) urlPaths.add(p);
  };

  const [media, cats, slides, prods, pages] = await Promise.all([
    selectAll(sb, "product_media", "url"),
    selectAll(sb, "categories", "image_url"),
    selectAll(sb, "carousel_slides", "image_url"),
    selectAll(sb, "products", "description, summary"),
    selectAll(sb, "pages", "content"),
  ]);
  for (const r of media) addUrl(r.url);
  for (const r of cats) addUrl(r.image_url);
  for (const r of slides) addUrl(r.image_url);

  const bodies = [];
  for (const r of prods) {
    if (r.description) bodies.push(r.description);
    if (r.summary) bodies.push(r.summary);
  }
  for (const r of pages) if (r.content) bodies.push(r.content);

  const bodyBlob = bodies.join("\n"); // single haystack for fast substring checks

  return {
    urlPaths,
    bodies,
    isReferenced(path) {
      return urlPaths.has(path) || bodyBlob.includes(path);
    },
  };
}
