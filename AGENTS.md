# Project context

See **[CONTEXT.md](./CONTEXT.md)** for the full picture: Ryoko Tackle is a Thai-language
**product catalog** (no cart/prices/checkout) on Next 16 + OpenNext/Cloudflare + Supabase +
shadcn (Base UI variant). Read it before non-trivial work. Key reminders: it's a catalog
(don't add commerce); data layer is `src/lib/queries.ts` (cookieless public Supabase
client); schema in `supabase/migrations/`; Supabase uses the new `sb_publishable_` key.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
