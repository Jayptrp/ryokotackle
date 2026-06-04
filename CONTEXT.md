# Ryoko Tackle — Project Context

Reference background for anyone (human or agent) working on this repo. `AGENTS.md`
holds the short always-on rules; this file is the fuller picture, read on demand.

## What this is

A **product catalog** website for **Ryoko Tackle Thailand**, a distributor of fishing
tackle. It showcases ~400 products across several house/partner brands (RYOKO, Ballista,
G-Luck, Sakura, KAIDO, Relix, AKARI, …). Thai-language UI.

**It is a catalog, not a shop.** There is no cart, price, stock, or checkout. Each product
page links out to marketplaces (Shopee / Lazada / TikTok / Facebook / LINE) or to a
contact CTA. Content (images, videos, descriptions) is authored by 1–2 **admins**.

Scale is small (~500 visitors/week), so the app favours simplicity: product pages are
pre-rendered (SSG) and meant to be revalidated when an admin edits.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + React 19
- **Tailwind v4** with Material Design 3 tokens in `src/app/globals.css`
  (e.g. `bg-primary` = deep ocean blue `#001e40`, `text-secondary` = teal, plus spacing
  like `px-margin-desktop` and type like `text-headline-lg` / `font-label-caps`)
- **shadcn/ui** — note this install uses the **Base UI** variant (components take a
  `render` prop, NOT Radix `asChild`)
- **Supabase** (Postgres + Auth + Storage). Project: "Ryoko Website" (`nqzcxrfnfykzgxtvjjdy`)
- **Cloudflare Workers** via **OpenNext** (`@opennextjs/cloudflare`) — `npm run preview` / `npm run deploy`
- Fonts: **IBM Plex Sans Thai**; icons: **Material Symbols Outlined** (`<Icon name="…" />`)

## Supabase API keys

Uses the **new publishable key** (`sb_publishable_…`, env
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) — the legacy `anon` JWT is being deprecated. Code
falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if only the legacy key is set. The secret
counterpart is `sb_secret_…` (server-only, replaces `service_role`).

Two client helpers:
- `src/lib/supabase/public.ts` → `createPublicClient()` — **cookieless**, used by the
  data layer for public catalog reads. Required so pages can be statically generated
  (`generateStaticParams` cannot use cookies).
- `src/lib/supabase/server.ts` / `client.ts` — cookie-based, for future authed/admin use.

## Database schema (`supabase/migrations/0001_catalog_schema.sql`)

- `brands` — id, slug, name
- `categories` — id, slug, name, name_th, **parent_id** (self-FK, hierarchical), icon
  (Material Symbol), sort_order. Top level: reels, rods, lines, lures-jigs, hooks-rigging,
  tackle-boxes, accessories, apparel, parts (rods/lines have sub-categories).
- `products` — id, slug (unique), name, name_th, **summary** (short line), **description**
  (Tiptap rich HTML; the spec table + inline images live INSIDE this — there is no separate
  specs table), brand_id, category_id, **status** (`published|hidden|draft`), is_featured,
  legacy_category, `search` (tsvector). `n_viewer` from the legacy data was intentionally dropped.
- `product_media` — unified ordered **image/video carousel** (type, provider, url,
  sort_order, is_primary → card thumbnail)
- `product_channels` — marketplace links (channel enum, url); the page renders only the
  channels that exist
- `admin_users` + `is_admin()` — admin allowlist; **RLS**: anon reads only `published`
  rows + their children; writes require `is_admin()`. Storage bucket `product-media`
  (public read, admin write).

Regenerate types into `src/lib/database.types.ts` after schema changes
(Supabase `generate_typescript_types`).

## Data layer

`src/lib/queries.ts` (server-only) is the single read API: `getCategoryTree`,
`getCategories`, `getBrands`, `getProducts({category,brand,q,sort,page})`,
`getFeatured`, `getNewArrivals`, `getProductBySlug`, `getPublishedSlugs`. Domain types in
`src/lib/types.ts`; channel display metadata in `src/lib/channels.ts`.

## URL structure

- `/` — home (category grid, featured, new arrivals)
- `/products` — all products; filters via query params `?category=&brand=&q=&sort=&page=`
- `/category/[slug]` — category / sub-category landing (inclusive of descendants)
- `/products/[slug]` — flat product detail (carousel, summary, sanitized rich description,
  marketplace channels, contact CTA). Slugs are globally unique.
- `/contact`
- Brand is a **filter facet only** — there are no `/brands/[slug]` pages.

## Legacy import

`scripts/import-legacy.mjs` transforms the legacy export
(`../Ryoko_legacy_database-alike.txt`) → `supabase/seed/seed-catalog.sql` (+ batched files
in `scripts/out/`) and `excluded-resources.csv`. It classifies rows (product / Thai
section-header → subcategory / excluded resource), derives brand + category, translates
Thai names to English (keeping the original in `name_th`), de-duplicates, and slugifies.
Excluded rows (diagrams, blank/test, duplicates, vague catch-alls) are in
`excluded-resources.csv` for review — not on the site. The import seeds only the
**skeleton**; media/summary/description/channels are authored by admins later.

## Admin authoring flow (future `/admin`, not built yet)

name → optional summary → import images/videos (carousel) → marketplace link per channel →
full detail in a **Tiptap** rich editor (free prose + spec table + inline images). Auth via
Supabase Auth; membership in `admin_users` gates writes. Inline editor images upload to the
`product-media` Storage bucket; descriptions are sanitized on render
(`src/components/rich-content.tsx`).

## Conventions / gotchas

- Remote images render with `unoptimized` (no Workers image optimizer).
- Don't reintroduce price/cart — this is a catalog.
- Keep `AGENTS.md` short; put background here.
