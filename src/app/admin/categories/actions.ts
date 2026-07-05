"use server";

import { revalidatePath } from "next/cache";
import { isValidSlug } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CategoryAdminNode,
  CategoryDeletion,
  CategorySaveNode,
} from "@/lib/types";

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

/** Fetch every category with its direct product count (any status). */
async function fetchNodes(supabase: AdminClient): Promise<CategoryAdminNode[]> {
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, name_th, parent_id, icon, sort_order")
      .order("sort_order"),
    supabase.from("products").select("category_id"),
  ]);

  const countByCat = new Map<string, number>();
  for (const p of prods ?? []) {
    if (p.category_id)
      countByCat.set(p.category_id, (countByCat.get(p.category_id) ?? 0) + 1);
  }

  return (cats ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    nameTh: c.name_th,
    parentId: c.parent_id,
    icon: c.icon,
    sortOrder: c.sort_order,
    productCount: countByCat.get(c.id) ?? 0,
  }));
}

/** Read the current admin category tree (used to hydrate the page). */
export async function getCategoryAdminNodes(): Promise<CategoryAdminNode[]> {
  const supabase = await createAdminClient();
  return fetchNodes(supabase);
}

/**
 * Persist the whole category taxonomy in one call — the unified-save analog of
 * `saveCarousel`/`saveContact`. Nothing hits the DB until this runs:
 *   1. Reassign each deleted category's products to the chosen target, then
 *      delete the rows (children before parents; `parent_id` is ON DELETE SET
 *      NULL, so a surviving child would otherwise silently become top-level).
 *   2. Insert new categories (parents before children, resolving `parentKey`
 *      → new id), then update the rest — name / name_th / slug / icon / parent /
 *      sort_order (per-sibling array order × 10).
 * Returns the fresh tree so the client can re-baseline (new rows get real ids).
 */
export async function saveCategories(input: {
  categories: CategorySaveNode[];
  deletions: CategoryDeletion[];
}): Promise<CategoryAdminNode[]> {
  const supabase = await createAdminClient();
  const cats = input.categories;

  // ── validation ──────────────────────────────────────────────────────────
  // `categories.name` is NOT NULL but the public site shows `nameTh ?? name`, so
  // a Thai-only category is fine — require at least one name, plus a valid slug.
  const resolvedName = (c: CategorySaveNode) => c.name.trim() || c.nameTh?.trim() || "";
  for (const c of cats) {
    if (!resolvedName(c)) throw new Error("ต้องระบุชื่อหมวดหมู่อย่างน้อยหนึ่งภาษา");
    if (!isValidSlug(c.slug)) {
      throw new Error(
        `slug ไม่ถูกต้อง: "${c.slug || "(ว่าง)"}" — ใช้ได้เฉพาะ a-z, 0-9 และ - เท่านั้น`,
      );
    }
  }
  const seenSlug = new Set<string>();
  for (const c of cats) {
    if (seenSlug.has(c.slug)) throw new Error(`slug ซ้ำกัน: "${c.slug}"`);
    seenSlug.add(c.slug);
  }

  // Snapshot current slugs/names so we can rebuild the SSG product detail pages
  // of any category whose slug or name changes — each product page bakes in its
  // category's slug (breadcrumb link) + name, which would otherwise point at the
  // old, now-404 `/category/<old-slug>` URL until that product is revalidated.
  const { data: before } = await supabase
    .from("categories")
    .select("id, slug, name, name_th");
  const beforeById = new Map((before ?? []).map((c) => [c.id, c]));
  const productSlugsToRevalidate = new Set<string>();

  // ── deletions ───────────────────────────────────────────────────────────
  if (input.deletions.length) {
    const delIds = input.deletions.map((d) => d.id);

    // Reassign products off each doomed category first (never orphan them).
    for (const d of input.deletions) {
      // Products leaving this category get a new (or no) category → rebuild them.
      const { data: moving } = await supabase
        .from("products")
        .select("slug")
        .eq("category_id", d.id);
      for (const p of moving ?? []) productSlugsToRevalidate.add(p.slug);

      const { error } = await supabase
        .from("products")
        .update({ category_id: d.reassignTo })
        .eq("category_id", d.id);
      if (error) throw error;
    }

    // Delete sub-categories before their parents.
    const { data: delRows } = await supabase
      .from("categories")
      .select("id, parent_id")
      .in("id", delIds);
    const delSet = new Set(delIds);
    const isParentOfDeleted = new Set(
      (delRows ?? [])
        .filter((r) => r.parent_id && delSet.has(r.parent_id))
        .map((r) => r.parent_id as string),
    );
    const children = delIds.filter((id) => !isParentOfDeleted.has(id));
    const parents = delIds.filter((id) => isParentOfDeleted.has(id));
    for (const batch of [children, parents]) {
      if (batch.length) {
        const { error } = await supabase.from("categories").delete().in("id", batch);
        if (error) throw error;
      }
    }
  }

  // ── sort_order per sibling group (array order × 10) ──────────────────────
  const sortByKey = new Map<string, number>();
  const groups = new Map<string | null, CategorySaveNode[]>();
  for (const c of cats) {
    const g = groups.get(c.parentKey) ?? [];
    g.push(c);
    groups.set(c.parentKey, g);
  }
  for (const g of groups.values())
    g.forEach((c, i) => sortByKey.set(c.key, (i + 1) * 10));

  // ── inserts (new) then updates (existing) ────────────────────────────────
  const keyToId = new Map<string, string>();
  for (const c of cats) if (c.id) keyToId.set(c.key, c.id);

  // Insert new rows once their parent id is known (≤2 passes for a 2-deep tree).
  let remaining = cats.filter((c) => !c.id);
  while (remaining.length) {
    const ready = remaining.filter(
      (c) => c.parentKey === null || keyToId.has(c.parentKey),
    );
    if (!ready.length)
      throw new Error("โครงสร้างหมวดหมู่ไม่ถูกต้อง (parent วนซ้ำหรือหาย)");
    for (const c of ready) {
      const parentId = c.parentKey ? keyToId.get(c.parentKey)! : null;
      const { data, error } = await supabase
        .from("categories")
        .insert({
          slug: c.slug,
          name: resolvedName(c),
          name_th: c.nameTh?.trim() || null,
          parent_id: parentId,
          icon: c.icon?.trim() || null,
          sort_order: sortByKey.get(c.key) ?? 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      keyToId.set(c.key, data.id);
    }
    remaining = remaining.filter((c) => !keyToId.has(c.key));
  }

  // Update existing rows.
  for (const c of cats) {
    if (!c.id) continue;
    const parentId = c.parentKey ? keyToId.get(c.parentKey) ?? null : null;
    const { error } = await supabase
      .from("categories")
      .update({
        slug: c.slug,
        name: resolvedName(c),
        name_th: c.nameTh?.trim() || null,
        parent_id: parentId,
        icon: c.icon?.trim() || null,
        sort_order: sortByKey.get(c.key) ?? 0,
      })
      .eq("id", c.id);
    if (error) throw error;
  }

  // Products whose (direct) category changed slug or name need their baked-in
  // breadcrumb/link/title rebuilt too.
  const changedCatIds = cats
    .filter((c) => c.id)
    .filter((c) => {
      const b = beforeById.get(c.id!);
      if (!b) return false;
      return (
        b.slug !== c.slug ||
        b.name !== resolvedName(c) ||
        (b.name_th ?? "") !== (c.nameTh?.trim() || "")
      );
    })
    .map((c) => c.id!);
  if (changedCatIds.length) {
    const { data: affected } = await supabase
      .from("products")
      .select("slug")
      .in("category_id", changedCatIds);
    for (const p of affected ?? []) productSlugsToRevalidate.add(p.slug);
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/category", "layout");
  revalidatePath("/admin/categories");
  for (const slug of productSlugsToRevalidate) revalidatePath(`/products/${slug}`);

  return fetchNodes(supabase);
}
