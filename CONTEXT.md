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

Scale is small (~500 visitors/week). The rendering model is **static-first** (see the
Rendering section): nearly every public route is prerendered, so the live site does almost
no per-request server work.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + React 19
- **Tailwind v4** with Material Design 3 tokens in `src/app/globals.css`
  (e.g. `bg-primary` = deep ocean blue `#001e40`, `text-secondary` = teal, plus spacing
  like `px-margin-desktop` and type like `text-headline-lg` / `font-label-caps`)
- **shadcn/ui** — note this install uses the **Base UI** variant (components take a
  `render` prop, NOT Radix `asChild`)
- **Supabase** (Postgres + Auth + Storage). Project: "Ryoko Website" (`nqzcxrfnfykzgxtvjjdy`)
- **Cloudflare Workers** via **OpenNext** (`@opennextjs/cloudflare`)
- **Tiptap** for the admin rich-text editor
- Fonts: **IBM Plex Sans Thai**; icons: **Material Symbols Outlined** (`<Icon name="…" />`)

## Rendering model — keep public routes static ⚠️

Cloudflare Workers enforce CPU/memory limits per request. Dynamic SSR pages that hit the
DB on every request can blow the CPU budget under even light repeated use — this produced
**Error 1102 "Worker exceeded resource limits"** when users clicked the category filter
rapidly. So:

- **`/products` and `/category/[slug]` are STATIC** (`○` / `●`). They load the full
  published catalog **once** and filter **client-side** (`src/components/products-browser.tsx`)
  — category/brand/search/sort/pagination all run in the browser with **no server
  round-trip**. Filters mirror into the URL via `history.replaceState` (shareable, no
  navigation); deep-link params are read on mount.
- **`/products/[slug]` is SSG** (`generateStaticParams` over published slugs), revalidated
  on demand when an admin edits.
- **Only `/admin/*` and `/api/*` are dynamic** (`ƒ`) — they need auth/SSR and aren't public.

**Do NOT convert public browsing routes back to per-request SSR** (e.g. by reading
`searchParams` in the server component). That reintroduces the 1102 risk. If a page needs
request-time data, prefer static + client logic, or add an OpenNext incremental cache.

## Deployment ⚠️

- **Deploy via GitHub Actions, not locally.** `.github/workflows/deploy.yml` builds + deploys
  via OpenNext on a Linux runner on every push to `main` (and manual `workflow_dispatch`).
- **Local `npm run deploy` fails on Windows** — OpenNext creates symlinks during bundling
  and Windows blocks them (`EPERM`/symlink). Don't chase this; use the Action (or WSL).
- Required repo **secrets**: `CLOUDFLARE_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `NEXT_PUBLIC_*` ones are needed at **build**
  time because Next bakes them into the bundle).
- **No middleware / `proxy.ts`.** OpenNext/Cloudflare only support **Edge** middleware, but
  Next 16's `proxy.ts` always runs on **Node.js** — incompatible, and it breaks the
  OpenNext build. Admin route protection lives in the **admin layout server component**
  instead (see Admin panel). Do not add `middleware.ts` / `proxy.ts`.
- Production domain is **`www.ryokotackle.com`** (`NEXT_PUBLIC_SITE_URL`, default in
  `src/lib/seo.ts`). It may also be reachable on a `*.workers.dev` subdomain; canonical
  URLs intentionally point at the real domain. Binding the real domain clears several SEO
  flags (canonical-mismatch, subdomain, HTTPS-redirect) automatically.

## Supabase API keys

Uses the **new publishable key** (`sb_publishable_…`, env
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) — the legacy `anon` JWT is being deprecated. Code
falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if only the legacy key is set. The secret
counterpart is `sb_secret_…` (server-only, replaces `service_role`).

Client helpers:
- `src/lib/supabase/public.ts` → `createPublicClient()` — **cookieless**, used by the data
  layer for public catalog reads. Required so pages can be statically generated
  (`generateStaticParams` cannot use cookies).
- `src/lib/supabase/admin.ts` → `createAdminClient()` — cookie-based, for the admin pages /
  server actions / upload route (writes gated by RLS + `is_admin()`).
- `src/lib/supabase/server.ts` / `client.ts` — cookie-based base helpers.

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

`src/lib/queries.ts` (server-only, cookieless public client) is the read API:
`getCategoryTree`, `getCategories`, `getBrands`, `getAllPublishedListItems` (full set for
client-side filtering), `getFeatured`, `getNewArrivals`, `getProductBySlug`,
`getPublishedSlugs`. (`getProducts(...)` paginated server-filtering still exists but is no
longer used by public pages — see the Rendering section.) Domain types in
`src/lib/types.ts`; channel display metadata in `src/lib/channels.ts`.

## URL structure

- `/` — home (category grid, featured, new arrivals)
- `/products` — all products; **static**, client-side filtering. URL mirrors filters as
  `?category=&brand=&q=&sort=&page=` (shareable; applied on load, updated without navigation)
- `/category/[slug]` — category / sub-category landing (inclusive of descendants); **SSG**,
  same client-side filtering locked to that category
- `/products/[slug]` — flat product detail (carousel, summary, sanitized rich description,
  marketplace channels, contact CTA). **SSG**. Slugs are globally unique.
- `/contact`
- `/admin/*` — admin panel (dynamic, auth-gated)
- Brand is a **filter facet only** — there are no `/brands/[slug]` pages.

## SEO

Centralised in `src/lib/seo.ts` (site URL, default title/description, Thai keyword list,
company NAP/socials migrated from the legacy site). Conventions:
- **One `<h1>` per page** (the home hero uses an `sr-only` keyword H1; carousel titles are H2).
- Per-page `generateMetadata` with canonical + Open Graph; product pages emit **JSON-LD**
  (`src/components/json-ld.tsx`): Product, Brand, BreadcrumbList; layout emits Store + WebSite.
- Dynamic `src/app/sitemap.ts` (static routes + categories + published products) and
  `src/app/robots.ts` (blocks `/admin`, `/api`).
- **Title/description pixel limits:** title < 580px, meta description < 1000px. **Thai
  characters are pixel-wide**, so keep them short — the current home title/description
  slightly exceed the limits and should be trimmed (known follow-up).
- Display Thai names with English fallback everywhere: **`nameTh ?? name`** for categories
  (cards, chips, breadcrumbs, nav). `<html lang="th">`; content is bilingual.

## Admin panel (built — `/admin`)

Supabase-Auth-gated UI for the 1–2 admins.
- **Auth guard:** the **admin layout server component** (`src/app/admin/layout.tsx`) checks
  the session + `admin_users` membership and `redirect()`s to `/admin/login` otherwise.
  (There is intentionally no middleware — see Deployment.) The upload API
  (`/api/admin/upload`) repeats the check.
- **Pages:** `/admin` (product list: search/filter/status), `/admin/products/[id]` and
  `/admin/products/new` (editor).
- **Authoring flow:** name → optional summary → import images/videos (drag-reorder carousel,
  uploaded to the `product-media` Storage bucket) → marketplace link per channel → full
  detail in a **Tiptap** rich editor (free prose + spec table + inline images). Server
  Actions auto-slug + `revalidatePath` the public pages. Descriptions are sanitized on
  render (`src/components/rich-content.tsx`).
- **To become an admin:** insert your `auth.users` id into the `admin_users` table.
- **Editor UX pattern:** all admin editors use one model — deferred/unified save,
  computed dirty state vs a `useRef` snapshot, per-section revert, drag-and-drop lists.
  See **[docs/admin-editor-pattern.md](./docs/admin-editor-pattern.md)** before building
  or changing an admin editor.

## Legacy import

`scripts/import-legacy.mjs` transforms the legacy export
(`../Ryoko_legacy_database-alike.txt`) → `supabase/seed/seed-catalog.sql` (+ batched files
in `scripts/out/`) and `excluded-resources.csv`. It classifies rows (product / Thai
section-header → subcategory / excluded resource), derives brand + category, translates
Thai names to English (keeping the original in `name_th`), de-duplicates, and slugifies.
Excluded rows (diagrams, blank/test, duplicates, vague catch-alls) are in
`excluded-resources.csv` for review — not on the site. The import seeds only the
**skeleton**; media/summary/description/channels are authored by admins later.

## Conventions / gotchas

- **Don't reintroduce price/cart** — this is a catalog.
- **Don't add `middleware.ts` / `proxy.ts`** — incompatible with OpenNext (see Deployment).
- **Keep public routes static** — no per-request SSR for browsing (see Rendering).
- **Deploy via GitHub Actions**, not local `npm run deploy` on Windows (see Deployment).
- Remote images render with `unoptimized` (no Workers image optimizer); allowed hosts
  (incl. `*.supabase.co` for uploaded media) are in `next.config.ts`.
- Categories/products display `nameTh ?? name`.
- Windows dev: `LF will be replaced by CRLF` git warnings are harmless; LibreOffice is not
  installed (can't render PPTX locally).
- Keep `AGENTS.md` short; put background here.
