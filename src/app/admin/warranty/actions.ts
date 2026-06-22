"use server";

import { revalidatePath } from "next/cache";
import { getWarranties } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Warranty } from "@/lib/types";

export interface WarrantyInput {
  /** Existing DB id, or null for a newly added (not-yet-persisted) type. */
  id: string | null;
  name: string;
  detail: string;
  icon: string;
  color: string;
}

/**
 * Persist the whole warranty admin page in one call — the unified-save analog of
 * `saveCarousel`. Nothing touches the DB until this runs: it deletes removed
 * types (their product links cascade), inserts new ones, updates name/detail/
 * order for the rest, and upserts the singleton page heading. Returns the fresh
 * warranty list.
 */
export async function saveWarranties(input: {
  page: { title: string; subtitle: string };
  warranties: WarrantyInput[];
  deletedIds: string[];
}): Promise<Warranty[]> {
  const supabase = await createAdminClient();

  // 1. Deletions — product_warranties rows cascade via FK.
  if (input.deletedIds.length) {
    const { error } = await supabase
      .from("warranties")
      .delete()
      .in("id", input.deletedIds);
    if (error) throw error;
  }

  // 2. Inserts (new) + updates (existing); sort_order follows array order.
  const results = await Promise.all(
    input.warranties.map((w, i) => {
      const sortOrder = (i + 1) * 10;
      const name = w.name.trim();
      const detail = w.detail.trim() || null;
      const icon = w.icon.trim() || "verified_user";
      const color = w.color.trim() || "blue";
      if (w.id === null) {
        return supabase
          .from("warranties")
          .insert({ name, detail, icon, color, sort_order: sortOrder });
      }
      return supabase
        .from("warranties")
        .update({ name, detail, icon, color, sort_order: sortOrder })
        .eq("id", w.id);
    }),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  // 3. Singleton page heading.
  const { error: pageError } = await supabase
    .from("warranty_page")
    .update({
      title: input.page.title.trim() || null,
      subtitle: input.page.subtitle.trim() || null,
    })
    .eq("id", 1);
  if (pageError) throw pageError;

  revalidatePath("/warranty");
  // Warranty names/tags surface on every product page.
  revalidatePath("/products", "layout");
  revalidatePath("/admin/warranty");

  return getWarranties();
}
