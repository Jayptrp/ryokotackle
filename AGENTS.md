# Project context

See **[CONTEXT.md](./CONTEXT.md)** for the full picture: Ryoko Tackle is a Thai-language
**product catalog** (no cart/prices/checkout) on Next 16 + OpenNext/Cloudflare + Supabase +
shadcn (Base UI variant). Read it before non-trivial work. Key reminders: it's a catalog
(don't add commerce); data layer is `src/lib/queries.ts` (cookieless public Supabase
client); schema in `supabase/migrations/`; Supabase uses the new `sb_publishable_` key.

**Hard constraints (breaking these breaks the Cloudflare deploy — details in CONTEXT.md):**
- **No `middleware.ts` / `proxy.ts`** — incompatible with OpenNext; admin auth is in the
  admin layout server component.
- **Keep public routes static** — no per-request SSR for `/products` & `/category`
  (browsing filters run client-side); reintroducing it risks Worker Error 1102.
- **Deploy via GitHub Actions**, not local `npm run deploy` (fails on Windows).
- Display Thai category/product names with `nameTh ?? name`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
