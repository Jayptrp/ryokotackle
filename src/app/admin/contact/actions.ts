"use server";

import { revalidatePath } from "next/cache";
import { getContactCards } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContactCard } from "@/lib/types";

export interface ContactCardInput {
  /** Existing DB id, or null for a newly added (not-yet-persisted) card. */
  id: string | null;
  icon: string;
  label: string;
  value: string;
}

/**
 * Unified save for the contact page — the analog of `saveWarranties`. Updates the
 * singleton page row, then deletes removed cards, inserts new ones, and updates
 * the rest (sort_order follows array order). Returns the fresh card list.
 */
export async function saveContact(input: {
  page: { intro: string; locationDesc: string; address: string; mapLat: string; mapLng: string };
  cards: ContactCardInput[];
  deletedIds: string[];
}): Promise<ContactCard[]> {
  const supabase = await createAdminClient();

  const str = (v: string) => (v.trim() ? v.trim() : null);
  const num = (v: string) => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  // 1. Singleton page content.
  const { error: pageError } = await supabase
    .from("contact_page")
    .update({
      intro: str(input.page.intro),
      location_desc: str(input.page.locationDesc),
      address: str(input.page.address),
      map_lat: num(input.page.mapLat),
      map_lng: num(input.page.mapLng),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (pageError) throw pageError;

  // 2. Deletions.
  if (input.deletedIds.length) {
    const { error } = await supabase
      .from("contact_cards")
      .delete()
      .in("id", input.deletedIds);
    if (error) throw error;
  }

  // 3. Inserts (new) + updates (existing); sort_order follows array order.
  const results = await Promise.all(
    input.cards.map((c, i) => {
      const sortOrder = (i + 1) * 10;
      const icon = c.icon.trim() || "info";
      const label = c.label.trim();
      const value = c.value.trim();
      if (c.id === null) {
        return supabase
          .from("contact_cards")
          .insert({ icon, label, value, sort_order: sortOrder });
      }
      return supabase
        .from("contact_cards")
        .update({ icon, label, value, sort_order: sortOrder })
        .eq("id", c.id);
    }),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  revalidatePath("/contact");
  revalidatePath("/admin/contact");

  return getContactCards();
}
