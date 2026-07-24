# SEO panel — DB-backed, deploy-independent SEO settings

Phase 1 moves the site's SEO/business configuration **out of code and into the
database**, and adds an admin page to edit it. Goal: a non-technical admin can
maintain SEO without a developer or a deploy — the thing that makes the site
survivable if the original developer leaves.

This note is for the **next developer**. The admin-facing help lives in the panel
itself (`/admin/seo/settings`, in Thai).

---

## What is where

| Concern | Source of truth | Editable by admin? |
|---|---|---|
| Site title / description / keywords / OG image | `site_settings` row | ✅ `/admin/seo/settings/website` |
| Company NAP, socials, footer links | `site_settings` row | ✅ `/admin/seo/settings/company` |
| GA4 / GTM / GSC verification | `site_settings` row | ✅ `/admin/seo/settings/tools` ("safe id" fields) |
| Custom `<head>`/`<body>` code | `site_settings` row | ✅ `/admin/seo/settings/tools` ("advanced" box) |
| AI-crawler policy (robots.txt) | `site_settings` row | ✅ `/admin/seo/settings/tools` (toggles) |
| Per-product Meta Title/Description | `products.meta_title` / `.meta_description` | ✅ product editor → "SEO" section |
| Fixed-page (home/products/about/contact/warranty) meta | `page_seo` table | ✅ `/admin/seo/settings/website` → "Meta รายหน้า" |
| Per-category Meta Title/Description | `categories.meta_title` / `.meta_description` | ⚠️ columns + override logic exist; **UI deferred** (see below) |
| Canonical, sitemap, structured data (JSON-LD) | code (auto-generated, correct by default) | n/a — automatic |
| `SITE_URL`, robots `/admin`+`/api` blocks, sitemap priorities | code / env | ❌ structural, dev-only |

### The load-bearing loader

`getSiteSettings()` in [src/lib/queries.ts](../src/lib/queries.ts) reads the
`site_settings` row through the **cookieless public client** and falls back to the
constants in [src/lib/seo.ts](../src/lib/seo.ts) for any unset field. It is
`cache()`-wrapped (per-request, never process-global). Consumers:

- `src/app/layout.tsx` — `generateMetadata` + Store/WebSite JSON-LD + GA4/GTM/GSC
  + custom code injection.
- `generateMetadata` in product / category / about / warranty / products / contact
  pages — each applies its per-page override, else the auto-derived value.
- `src/components/site-footer.tsx` — NAP, socials, footer links.
- `src/app/robots.ts` — AI-crawler toggles.
- `src/app/llms.txt/route.ts` — the AI site map.

---

## ⚠️ Rules for developers (do not break these)

1. **Editing the constants in `src/lib/seo.ts` does NOT change the live site.**
   They are only *fallback defaults*. Once the `site_settings` row has a value,
   the DB wins. To change what's live, edit it in the admin (or the row directly).

2. **Never write a migration or seed that `UPDATE`s the `site_settings` row.** The
   original seed is `INSERT ... ON CONFLICT DO NOTHING` precisely so it can never
   overwrite an admin's edits. A rebuild/redeploy never re-runs an applied
   migration, so admin settings are safe across deploys — keep it that way.

3. **A settings change must revalidate broadly.** Each save action in
   [src/app/admin/seo/actions.ts](../src/app/admin/seo/actions.ts) —
   `saveSeoWebsite` / `saveSeoCompany` / `saveSeoTools` (one per sub-page, each
   updating only its own columns) — calls `revalidateEverything()`
   (`revalidatePath("/", "layout")` + the metadata routes), because global
   metadata / footer / JSON-LD / analytics touch every page. Static pages are
   rebuilt on the CI runner reading the **live** DB, so a deploy also picks up
   current values.

4. **Adding a new setting:** add the column (migration, seed-if-absent), regen
   `database.types.ts`, extend `SiteSettings` + `getSiteSettings()` (with a
   fallback), then the relevant sub-page editor + its `save*` action in
   `src/app/admin/seo/actions.ts`.

---

## How the admin custom code / analytics inject

- **GA4 / GTM** — server-rendered in `<head>` (and GTM `<noscript>` after
  `<body>`) via [src/components/analytics.tsx](../src/components/analytics.tsx).
  IDs are sanitized to Google's charset so a bad paste can't break the inline
  script.
- **GSC verification** — Next metadata `verification.google` (a real `<meta>` in
  the initial HTML).
- **Advanced custom code** — [src/components/custom-code.tsx](../src/components/custom-code.tsx)
  injects the raw snippet client-side after hydration, **re-creating `<script>`
  nodes so they execute** (setting innerHTML alone would not run them). Fine for
  pixels / CTA / extra tracking; anything that must be in the initial HTML has a
  dedicated field above.

---

## Maps to the AI SEO agency's 16-item checklist

The settings page + product editor make items 1–3, 6–16 self-service; canonical
(4), content structure (5), sitemap (10), robots (11), schema (16) were already
automatic. See the conversation / `docs/` for the full mapping.

## Known follow-ups (Phase 2)

- **Per-category Meta UI** — the `categories.meta_title/meta_description` columns
  and the override in the category page's `generateMetadata` already work; only
  the editing UI is missing (the category manager is a dense tree CRUD — add an
  expandable per-row "SEO" area or a dedicated per-category editor).
- **SEO audit dashboard** — scan the catalog for weak/missing titles, thin
  descriptions, missing alt text, duplicates, etc., each deep-linked to its fix.
- **Google Search Console metrics** — pull impressions/clicks/CTR into the panel.
