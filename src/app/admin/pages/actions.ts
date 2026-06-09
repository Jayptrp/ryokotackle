"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/** Update an editable static page (title + Tiptap HTML content). */
export async function savePage(formData: FormData) {
  const supabase = await createAdminClient();

  const id = formData.get("id") as string;
  const slug = formData.get("slug") as string;
  const title = (formData.get("title") as string).trim();
  const titleTh = (formData.get("title_th") as string)?.trim() || null;
  const content = (formData.get("content") as string) || null;
  const status = (formData.get("status") as string) || "draft";

  if (!id || !title) return;

  const { error } = await supabase
    .from("pages")
    .update({
      title,
      title_th: titleTh,
      content,
      status: status as never,
    })
    .eq("id", id);

  if (error) throw error;

  // Refresh the public route this page powers (slug === route segment).
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/pages/${slug}`);
}
