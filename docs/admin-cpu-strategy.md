# Admin pages & Cloudflare Worker CPU budget

**Context:** This site runs on OpenNext/Cloudflare Workers. On the **Workers Free**
plan each request gets **10 ms of CPU time** (CPU only — network waits don't count).
Public routes are already static and cheap. The admin pages are `force-dynamic` and
have started to exceed the 10 ms budget. This note records the diagnosis and the plan.

---

## TL;DR

- **Don't build the global "commit" button.** With 1–2 admins, the per-section save
  buttons (carousel / category images / featured) are last-write-wins with a tiny
  conflict surface and are fully fine with Supabase. The commit + conflict-detection
  machinery only earns its complexity with **concurrent editors**.
- **The CPU problem is not the auth.** It's **server-side rendering of large data
  tables** in the Worker on every request (e.g. the admin products list SSRs ~360
  rows each time).
- **The fix:** keep auth server-side (secure, cheap), but move the heavy **data
  fetch + render off the Worker** to the browser.

---

## What actually costs Worker CPU

CPU time ≠ wall-clock time. On a dynamic admin request:

| Work | Counts against 10 ms CPU? |
| --- | --- |
| `auth.getUser()` (validates JWT over network) | No — network I/O |
| `admin_users` lookup (Supabase query) | No — network I/O |
| Supabase data queries | No — network I/O |
| **React SSR of a big table (~360 rows)** | **Yes — this is the hog** |
| Serializing fetched rows into the RSC payload | Yes (smaller) |

Two facts that make **server-side auth cheap**:

1. The auth check is **I/O**, not CPU.
2. **Layouts persist across soft navigation.** `(protected)/layout.tsx` runs on the
   first entry to the admin, then `<Link>` navigation does *not* re-run it — so the
   auth cost is paid ~once per session, not per page.

So: you do **not** have to choose between secure server auth and low CPU. Keep the
auth; cut the SSR of heavy data.

---

## The plan: thin dynamic shell (auth) + client-rendered data

- `(protected)/layout.tsx` **stays dynamic and keeps doing the auth** — cheap and
  amortized across navigation. No security regression, no client-auth migration.
- Each heavy admin **page** becomes a thin shell that renders a client component.
- That client component fetches its data **in the browser**, directly from Supabase
  using an authenticated client. The read is protected by the existing `is_admin()`
  **RLS** and goes **browser → Supabase, never through the Worker** → zero Worker CPU
  for the read, and no SSR of the big table.
- **Writes stay as server actions** — they're I/O-bound and tiny in CPU, and keeping
  them server-side preserves `revalidatePath(...)` for the public site.

Net: auth is still server-enforced; the Worker renders almost nothing per admin request.

---

## Concrete levers (lowest effort first)

1. **`ssr: false` on the heavy managers.** Stop the Worker from server-rendering the
   big table — it emits a placeholder and the table builds in the browser.

   ```ts
   const AdminProductsBrowser = dynamic(
     () =>
       import("@/components/admin/admin-products-browser").then(
         (m) => m.AdminProductsBrowser,
       ),
     { ssr: false },
   );
   ```

   Biggest CPU saving for the least change.

2. **Move the data fetch into the client component** (browser Supabase client + RLS,
   e.g. on mount or via SWR). Removes the RSC serialization cost too and takes the
   read fully off the Worker. Do this on the worst offenders first.

3. **Keep save/commit as server actions** so the public pages still revalidate.

---

## Before building: measure

The Cloudflare dashboard reports CPU time per route. Identify which admin routes
actually exceed 10 ms (most likely the **products list** and the **product editor**)
and fix those first — lighter admin pages may already be within budget.

---

## Stopgap

**Workers Paid is $5/mo and raises the limit to 30 s CPU** per invocation, which makes
the problem disappear immediately. Not a substitute for the fix, but a cheap safety net
while migrating pages to the client-rendered pattern.

---

## Decisions on record

- **Commit button / cross-section atomic transaction:** deferred. Revisit only if the
  site gains concurrent admins. (Conflict detection would also need `updated_at` +
  triggers on `categories` and `carousel_slides`; today only `products` has them.)
- **Auth:** stays server-side in `(protected)/layout.tsx`.
- **Data layer for admin:** migrate heavy pages to client-side fetch + render; keep
  writes as server actions.
