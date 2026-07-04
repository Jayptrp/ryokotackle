"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Unified save for an editable static page (About, etc.) — the deferred-save
 * analog of `saveContact`/`saveWarranties`. The client stages title / title_th /
 * content / status locally and sends them in one call; the fresh values are
 * returned so the editor can re-baseline its dirty state.
 */
export async function savePageAll(input: {
  id: string;
  slug: string;
  title: string;
  titleTh: string | null;
  content: string | null;
  status: string;
}): Promise<{
  title: string;
  titleTh: string | null;
  content: string | null;
  status: string;
}> {
  const supabase = await createAdminClient();

  const title = input.title.trim();
  if (!input.id || !title) throw new Error("ต้องระบุหัวข้อ (อังกฤษ)");
  const titleTh = input.titleTh?.trim() || null;
  const content = input.content || null;
  const status = input.status || "draft";

  const { error } = await supabase
    .from("pages")
    .update({ title, title_th: titleTh, content, status: status as never })
    .eq("id", input.id);
  if (error) throw error;

  // Refresh the public route this page powers (slug === route segment).
  revalidatePath(`/${input.slug}`);
  revalidatePath(`/admin/pages/${input.slug}`);

  return { title, titleTh, content, status };
}
