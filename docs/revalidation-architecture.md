# How this catalog stays fresh: KV + D1 on-demand revalidation

**Context:** Public pages (`/products`, `/products/[slug]`, `/category/[slug]`, `/`)
are prerendered and served static. But an admin can edit a product at any time, and
the change must show up on the public site. This note tells the story of how that
happens — from the deep core outward — and where we deviate from the "normal" Next.js
way, and why.

---

## Layer 0 — The core: pages live in a cache, not in a render

**The normal way:** In a classic Next.js server, a page is either static (built once)
or dynamic (re-rendered on every request). Dynamic gives you freshness but pays a
render cost per request.

**What we do:** Public pages are prerendered once and stored. A request just **reads
the stored copy** — no re-render. On Cloudflare that store is **Workers KV**
(`incrementalCache: kvIncrementalCache` in [open-next.config.ts](../open-next.config.ts),
binding `NEXT_INC_CACHE_KV`).

**Why:** OpenNext runs the app as a stateless Cloudflare Worker with a tiny CPU budget
per request. Re-rendering static pages per request (e.g. from RSC prefetches) blows
that budget — this is the constraint behind "keep public routes static" in AGENTS.md.
Reading from KV is cheap and stays inside budget.

---

## Layer 1 — The problem this creates: how do you un-cache one page?

If pages are cached, an admin edit would otherwise show stale data forever. You need a
way to say "this specific page is out of date now."

**The normal way (Next.js docs):** Two options —
- **Time-based ISR** (`export const revalidate = 60`): the page auto-regenerates in the
  background every N seconds. On a server this is a background job; on Cloudflare it
  requires a **queue**, which is a **Durable Object**.
- **On-demand** (`revalidatePath` / `revalidateTag`): you explicitly invalidate a page
  when its data changes.

**What we do:** **On-demand only. No time-based ISR, no queue, no Durable Object.**
See the comment in [open-next.config.ts](../open-next.config.ts): `queue` is
deliberately left unconfigured.

**Why:** A product catalog only changes when an admin edits it — never on a timer. So
regenerating pages "every N seconds just in case" buys nothing. Skipping the queue also
keeps us off Durable Objects (extra cost + operational surface we don't need).

---

## Layer 2 — The bookkeeping: D1 is the "what's stale" index

On-demand invalidation needs somewhere to record *which* cached entries are now stale.

**The normal way:** A self-hosted Node server keeps this alongside the filesystem cache.
That doesn't exist on a stateless Worker.

**What we do:** We use a **D1 database as the tag cache**
(`tagCache: d1NextTagCache`, binding `NEXT_TAG_CACHE_D1` in
[wrangler.jsonc](../wrangler.jsonc)). Every cached page carries **tags**; D1 stores a
per-tag "last revalidated at" timestamp. On a request, OpenNext reads the page from KV
and asks D1: *has any of this page's tags been revalidated more recently than this KV
copy?* If yes, the stale copy is dropped, the page re-renders **once** (fresh Supabase
data), and the new copy is written back to KV.

**Why:** KV holds the content; D1 holds the "is it stale?" index. Together they
reproduce what a Node server's filesystem cache does natively — but with
Cloudflare-native primitives.

---

## Layer 3 — The surface: admin saves call `revalidatePath`

**What we do:** Every admin Server Action that changes catalog data calls
`revalidatePath(...)` for the pages it affects. Example from
[src/app/admin/products/actions.ts](../src/app/admin/products/actions.ts):

```ts
revalidatePath("/products");
revalidatePath(`/products/${slug}`);
revalidatePath("/");
revalidatePath("/admin");
await revalidateCategoryPaths(supabase, [oldCategoryId, categoryId]);
```

`revalidatePath` here doesn't re-render anything — it just writes fresh timestamps into
D1 (Layer 2), which makes the next visitor's request re-render that page.

One subtlety: a category page lists its own products **and** its children's, so moving a
product invalidates both the category's page and its parent's. That's the manual tag
bookkeeping in `revalidateCategoryPaths` — you have to know which pages' data changed.

**Why here:** The only way catalog data changes is an admin edit, and that already runs
server-side. So invalidating right there is the natural, precise trigger: instant,
targeted, no polling, no timer-based staleness.

---

## What this pattern is called

There's no single buzzword, but each layer maps to an established name:

- **The whole thing:** **On-demand ISR** (Incremental Static Regeneration) — Next.js's
  own name for "serve prerendered pages, regenerate individual ones when invalidated."
- **The cache read path:** **Cache-Aside** (a.k.a. Lazy Loading), in its blocking
  **read-through** form — a stale hit re-renders inline on the request. It is
  **not** stale-while-revalidate (SWR): SWR serves the old copy instantly and
  regenerates in the background, which needs the Durable Object queue we deliberately
  skipped.
- **The invalidation:** **tag-based cache invalidation** with **lazy invalidation** via
  a **generation stamp** — we don't delete KV entries, we write a "revalidated-at"
  timestamp and let the next reader notice it's newer than their cached copy.
- **The write trigger:** write-time invalidation pushed from the admin (command) side —
  a light **CQRS** flavor (separate read and write paths), though there's only one
  database.

Tightest single phrase: **on-demand ISR on a cache-aside store with tag-based lazy
invalidation.**

---

## One-line summary

It **is** the standard Next.js on-demand model (same `revalidatePath` API) — but the
cache store is **Workers KV**, the stale-index is **Cloudflare D1**, and time-based ISR
is intentionally dropped because a rarely-changing, admin-edited catalog doesn't need
the Durable Object queue it would require.

---

## Appendix — the precise D1 schema & tag format

This is the **nextMode** D1 tag cache (`d1-next-mode-tag-cache`, binding
`NEXT_TAG_CACHE_D1`). Source:
`node_modules/@opennextjs/cloudflare/dist/api/overrides/tag-cache/d1-next-tag-cache.js`.

### The single table

The whole tag cache is **one table**, created by `opennextjs-cloudflare deploy` during
our GitHub Actions deploy:

```sql
CREATE TABLE IF NOT EXISTS revalidations (
  tag           TEXT    NOT NULL,
  revalidatedAt INTEGER NOT NULL,   -- ms epoch: when the tag was last revalidated
  stale         INTEGER,            -- ms epoch: when the entry becomes stale (SWR, v1.19+)
  expire        INTEGER DEFAULT NULL,-- ms epoch: when it expires; NULL = never
  UNIQUE(tag) ON CONFLICT REPLACE
);
```

> Note: **nextMode uses only this `revalidations` table.** There is *no* `tag → path`
> table — Next.js keeps the tag↔cache-key mapping inside the incremental cache itself.
> (The separate `tags` table you may see in OpenNext is the *classic* mode, which we
> don't use.)

### The `tag` value format

The stored `tag` is **not** the raw Next.js tag — it's namespaced by build id:

```
cacheKey = `${buildId}/${tag}`   // then any "//" is collapsed to "/"
// buildId = process.env.OPEN_NEXT_BUILD_ID (falls back to a constant)
```

So every deploy writes under a fresh prefix — old build's rows can't accidentally match
the new build's reads. The raw `tag` is whatever Next.js attaches to a page (internal
path tags for our `revalidatePath` calls, e.g. the tag for `/products/<slug>`).

### Read / write behaviour (as we use it)

Because this app is **on-demand only** (string tags, no queue), the writes are simple:

- **Write** (`revalidatePath` → `writeTags`):
  `INSERT INTO revalidations (tag, revalidatedAt, stale, expire) VALUES (?, ?, ?, ?)`
  with `revalidatedAt = stale = Date.now()` and `expire = null`. The
  `UNIQUE(tag) ON CONFLICT REPLACE` means a repeat tag just overwrites the timestamp.
- **Read** (on each request → `hasBeenRevalidated`):
  `SELECT tag, revalidatedAt, stale, expire FROM revalidations WHERE tag IN (...)`, then
  a tag counts as revalidated when `revalidatedAt > page.lastModified`. If yes, the KV
  copy is stale and gets re-rendered once.

The `stale` and `expire` columns exist for the SWR path (background revalidation,
OpenNext v1.19+). We never populate `expire` (it stays `NULL`) because we have no queue
— consistent with the "no time-based ISR" decision above. A per-request in-memory map
also dedupes repeated D1 lookups within a single request.
