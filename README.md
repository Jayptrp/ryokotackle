# Ryoko Tackle

Storefront for **Ryoko Tackle Thailand** — premium Japanese fishing tackle (คันเบ็ด, รอก, เหยื่อปลอม, เครื่องแต่งกาย, อุปกรณ์เสริม). UI rebuilt faithfully from the Google Stitch "Modern Aquatic Minimalist" design system.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS v4** with Material Design 3 design tokens (see `src/app/globals.css`)
- **shadcn/ui** (Base UI variant) for primitives
- **Supabase** (`@supabase/ssr`) for data
- **Cloudflare Workers** via **OpenNext** (`@opennextjs/cloudflare`), with
  **Workers KV** as the incremental (page) cache and **D1** as the tag cache
- Type face: **IBM Plex Sans Thai**; icons: **Material Symbols Outlined**

## Getting started

```bash
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev                  # http://localhost:3000
```

Without Supabase configured the app renders from the seed catalog in
`src/lib/products.ts`, so it works out of the box.

## Project structure

```
src/
  app/
    page.tsx                 # Home (hero carousel, categories, featured, newsletter)
    products/page.tsx        # Catalog with category filter (?category=…)
    products/[slug]/page.tsx # Product detail (SSG via generateStaticParams)
    contact/page.tsx         # Contact form + info + map
    layout.tsx               # Root layout, fonts, header/footer
  components/                # site-header, site-footer, product-card, hero-carousel, …
    ui/                      # shadcn primitives
  lib/
    products.ts              # CATEGORIES, SEED_PRODUCTS, formatTHB (client-safe)
    queries.ts               # getProducts / getProductBySlug (server-only)
    types.ts                 # Product / Category models
    supabase/                # browser + server clients
```

## Supabase

Create a `products` table whose columns match the `Product` type in
`src/lib/types.ts`. `getProducts()` in `src/lib/queries.ts` automatically
prefers live data when `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set, and falls back to the seed
catalog otherwise.

### API keys

This project uses Supabase's **new publishable key** (`sb_publishable_…`), which
replaces the legacy `anon` key (being deprecated). It's a public, RLS-enforced
key — safe to expose in the browser. The code falls back to
`NEXT_PUBLIC_SUPABASE_ANON_KEY` if only the legacy key is present. For elevated
server-side access use a `sb_secret_…` key (never prefixed with `NEXT_PUBLIC_`).

## Deploying to Cloudflare

**Deploy via GitHub Actions, not locally.** `.github/workflows/deploy.yml` runs
`npm run deploy` on every push to `main` (and via manual `workflow_dispatch`).
Local `npm run deploy` fails on Windows — OpenNext creates symlinks during
bundling that Windows blocks — so use the Action (or WSL).

```bash
npm run preview   # build with OpenNext + run locally on the Workers runtime
npm run deploy    # build + deploy (CI / Linux / WSL only — see above)
```

Configuration lives in `wrangler.jsonc` and `open-next.config.ts`. For
`npm run preview`, copy `.dev.vars.example` to `.dev.vars`. Production secrets
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) are set as
GitHub Action secrets — they're needed at **build** time because Next.js embeds
`NEXT_PUBLIC_*` vars into the bundle.

### Caching (important for CPU limits)

Public routes are static/SSG, but on OpenNext + Cloudflare a "static" page is
still served by the Worker — and **without an incremental cache it gets
re-rendered on every request** (including Next.js RSC prefetches), which spikes
CPU and trips Cloudflare's per-request limit (`Error 1102`). To fix this,
`open-next.config.ts` wires up:

- **`incrementalCache: kvIncrementalCache`** — prerendered pages are read from
  Workers KV instead of re-rendered. Binding: **`NEXT_INC_CACHE_KV`**.
- **`tagCache: d1NextTagCache`** — lets the admin panel's on-demand
  `revalidatePath(...)` invalidate cached pages. Binding: **`NEXT_TAG_CACHE_D1`**.
- No `queue` is configured — it's only needed for time-based ISR, and this app
  uses on-demand revalidation only (keeps us off Durable Objects / the paid plan).

Both bindings are declared in `wrangler.jsonc`. The `opennextjs-cloudflare deploy`
step **auto-creates the D1 `revalidations` table and populates KV** — no manual
migration. The deploy's Cloudflare API token therefore needs **Workers + KV +
D1 (Edit)** permissions.

> **Free-tier note:** Workers KV allows **1,000 writes/day** (resets 00:00 UTC =
> 07:00 ICT). A full deploy re-populates the cache (~750 writes under a fresh
> build ID), so on the free plan you can effectively deploy ~once/day. Admin
> *content* edits are cheap (only the changed pages are re-written) and are not
> affected. Workers Paid removes these limits.

## Design reference

Source mockups come from the Stitch project **"Ryoko Tackle Premium Storefront"**.
The MD3 palette, spacing scale and typography scale are encoded as Tailwind
theme tokens in `src/app/globals.css` (e.g. `bg-primary`, `text-headline-lg`,
`px-margin-desktop`, `font-label-caps`).
