# Ryoko Tackle

Storefront for **Ryoko Tackle Thailand** — premium Japanese fishing tackle (คันเบ็ด, รอก, เหยื่อปลอม, เครื่องแต่งกาย, อุปกรณ์เสริม). UI rebuilt faithfully from the Google Stitch "Modern Aquatic Minimalist" design system.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Tailwind CSS v4** with Material Design 3 design tokens (see `src/app/globals.css`)
- **shadcn/ui** (Base UI variant) for primitives
- **Supabase** (`@supabase/ssr`) for data
- **Cloudflare Workers** via **OpenNext** (`@opennextjs/cloudflare`)
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

```bash
npm run preview   # build with OpenNext + run locally on the Workers runtime
npm run deploy    # build + deploy to Cloudflare
```

Configuration lives in `wrangler.jsonc` and `open-next.config.ts`. Provide
secrets for production with:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```

For `npm run preview`, copy `.dev.vars.example` to `.dev.vars` instead.

## Design reference

Source mockups come from the Stitch project **"Ryoko Tackle Premium Storefront"**.
The MD3 palette, spacing scale and typography scale are encoded as Tailwind
theme tokens in `src/app/globals.css` (e.g. `bg-primary`, `text-headline-lg`,
`px-margin-desktop`, `font-label-caps`).
