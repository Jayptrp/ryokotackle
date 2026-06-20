# Admin editor pattern — unified save + per-section dirty tracking

Every admin editor in this repo follows **one** interaction model. Match it when you
build or change an admin editor so the UX stays consistent and reviews stay cheap.

Reference implementations (copy from the closest one):
- `src/components/admin/product-editor.tsx` — the canonical multi-section editor.
- `src/components/admin/warranty-manager.tsx` — sections + drag-and-drop list.
- `src/components/admin/carousel-manager.tsx` — drag-and-drop + deferred uploads.

## The rules

1. **Deferred / unified save.** Nothing hits the DB on individual edits. The client
   stages all changes in local state and sends them in **one** Server Action on
   "บันทึก" (e.g. `saveProductAll`, `saveWarranties`, `saveCarousel` in the matching
   `actions.ts`). The action does: delete removed rows → insert new → update the rest →
   `revalidatePath(...)` the affected public routes → return the fresh data (or redirect).

2. **Original snapshot.** Capture the initial values once in a `useRef` (`orig`) and
   **never mutate it** until after a successful save, when you re-baseline from the
   server response. Dirty state is *computed* from `current vs orig` — no `isDirty`
   `useState`.

3. **Sections via `SectionBlock`.** Group fields into sections. Each `SectionBlock`:
   - takes an `isDirty` boolean and an `onRevert` callback,
   - shows a red border (`border-error/50`) when dirty,
   - renders a **"คืนค่า" (revert) button in its header** when dirty, scoped to that
     section only.
   Per-field highlight uses `inputCls(dirty)` (red border/ring when changed).

4. **Save bar.** A top bar with the **"มีการแก้ไข" badge directly to the left of the
   save button** (group them at the right: `justify-end gap-3`). Save is disabled when
   `!isDirty || isPending`; the icon swaps to a spinning `hourglass_top` while pending.

5. **Lists with ordering.** Use `@hello-pangea/dnd` (`DragDropContext` / `Droppable` /
   `Draggable`) with a `drag_indicator` (six-dot) drag handle. Rows carry a stable
   client `key` separate from the DB `id`; new rows have `id: null` and persist on save.
   `sort_order` follows array order, written server-side as `(i + 1) * 10`.

## When sections share state

`warranty-manager.tsx` is the example: one `rows` array feeds both the "types" section
(name + order + membership) and the "content" section (per-row detail). Keep the two
section reverts independent — `revertTypes` restores names/order/membership while
preserving detail edits; `revertContent` restores title/subtitle/details while leaving
names/order alone. Compute each section's `isDirty` from only the fields it owns.

## Schema + types checklist (when the editor needs a new table)

1. Add a numbered migration in `supabase/migrations/`, apply it to the remote project
   via the Supabase MCP `apply_migration`, and commit the file. RLS = world-read
   (`using (true)`) + admin-write (`using (public.is_admin())`); add a
   `set_updated_at` trigger.
2. Regenerate `src/lib/database.types.ts` (Supabase MCP `generate_typescript_types`).
3. Add the domain type to `src/lib/types.ts` and a read fn in `src/lib/queries.ts`
   (public/cookieless client). Keep public routes static (see CONTEXT.md).
