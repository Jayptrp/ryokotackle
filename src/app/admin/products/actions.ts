"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(str: string) {
  const s = str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return s || "product";
}

async function ensureUniqueSlug(supabase: Awaited<ReturnType<typeof createAdminClient>>, base: string, excludeId?: string) {
  const slug = slugify(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    let q = supabase.from("products").select("id").eq("slug", candidate);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
    attempt++;
  }
}

/**
 * Whether a product with this name already exists (case-insensitive, EN or TH),
 * excluding the given product id. Used for the live check in the editor and as a
 * server-side guard in saveProduct.
 */
export async function isProductNameTaken(
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const clean = name.trim().toLowerCase();
  if (!clean) return false;
  const supabase = await createAdminClient();
  const { data } = await supabase.from("products").select("id, name, name_th");
  return (data ?? []).some(
    (p) =>
      p.id !== excludeId &&
      (p.name?.trim().toLowerCase() === clean ||
        p.name_th?.trim().toLowerCase() === clean),
  );
}

/** Create or update a product's core fields. */
export async function saveProduct(formData: FormData) {
  const supabase = await createAdminClient();

  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string).trim();
  const nameTh = (formData.get("name_th") as string)?.trim() || null;
  const summary = (formData.get("summary") as string)?.trim() || null;
  const description = (formData.get("description") as string) || null;
  const categoryId = (formData.get("category_id") as string) || null;
  const status = (formData.get("status") as string) || "draft";
  const isFeatured = formData.get("is_featured") === "true";

  if (!name) return;

  const isNew = !id;

  // Reject a duplicate product name (case-insensitive, excluding this product).
  if (await isProductNameTaken(name, id ?? undefined)) {
    redirect(
      isNew
        ? "/admin/products/new?error=duplicate-name"
        : `/admin/products/${id}?error=duplicate-name`,
    );
  }

  const slug = await ensureUniqueSlug(supabase, name, id ?? undefined);

  const payload = {
    name,
    name_th: nameTh,
    summary,
    description,
    category_id: categoryId || null,
    status: status as never,
    is_featured: isFeatured,
    slug,
  };

  let productId = id;
  if (isNew) {
    const { data, error } = await supabase
      .from("products")
      .insert(payload)
      .select("id, slug")
      .single();
    if (error) throw error;
    productId = data.id;
  } else {
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id!);
    if (error) throw error;
  }

  revalidatePath("/products");
  revalidatePath(`/products/${slug}`);
  revalidatePath("/");
  revalidatePath("/admin");

  if (isNew) redirect(`/admin/products/${productId}`);
}

/** Upsert marketplace channels from a JSON payload. */
export async function saveChannels(productId: string, channels: { channel: string; url: string }[]) {
  const supabase = await createAdminClient();

  // Delete all then re-insert (simplest strategy for 1-7 channels)
  await supabase.from("product_channels").delete().eq("product_id", productId);

  const rows = channels
    .filter((c) => c.channel && c.url)
    .map((c, i) => ({
      product_id: productId,
      channel: c.channel as never,
      url: c.url,
      sort_order: i,
    }));

  if (rows.length) {
    const { error } = await supabase.from("product_channels").insert(rows);
    if (error) throw error;
  }

  // Get slug for revalidation
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .single();
  if (data?.slug) revalidatePath(`/products/${data.slug}`);
}

/** Add a media row (uploaded URL). */
export async function addMedia(productId: string, url: string, type: "image" | "video", provider?: string) {
  const supabase = await createAdminClient();

  const { data: existing } = await supabase
    .from("product_media")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const maxOrder = existing?.[0]?.sort_order ?? -1;
  const isPrimary = maxOrder < 0; // first item is primary

  await supabase.from("product_media").insert({
    product_id: productId,
    url,
    type,
    provider: provider as never ?? null,
    sort_order: maxOrder + 1,
    is_primary: isPrimary,
    alt: null,
  });
}

/** Reorder media items. */
export async function reorderMedia(productId: string, orderedIds: string[]) {
  const supabase = await createAdminClient();
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("product_media")
        .update({ sort_order: i, is_primary: i === 0 })
        .eq("id", id)
        .eq("product_id", productId),
    ),
  );
}

/** Delete a media item and its Storage object. */
export async function deleteMedia(mediaId: string, productId: string, storageUrl: string) {
  const supabase = await createAdminClient();

  // Remove from storage if it's from our bucket
  const url = new URL(storageUrl);
  const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/product-media\/(.+)$/);
  if (pathMatch) {
    await supabase.storage.from("product-media").remove([pathMatch[1]]);
  }

  await supabase.from("product_media").delete().eq("id", mediaId);

  // Get slug for revalidation
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .single();
  if (data?.slug) revalidatePath(`/products/${data.slug}`);
}

/** Save only the description field (Tiptap HTML). */
export async function saveDescription(formData: FormData) {
  const supabase = await createAdminClient();
  const id = formData.get("id") as string;
  const description = formData.get("description") as string;

  const { data } = await supabase
    .from("products")
    .update({ description })
    .eq("id", id)
    .select("slug")
    .single();

  if (data?.slug) {
    revalidatePath(`/products/${data.slug}`);
    revalidatePath("/products");
  }
}

interface PendingMedia {
  id: string; url: string; type: string; provider: string | null;
  sortOrder: number; isPrimary: boolean; isNew?: boolean;
}

/**
 * Single-round-trip save for ALL product data: core fields, media, channels,
 * and description. Called from the ProductEditor client component.
 */
export async function saveProductAll(formData: FormData) {
  const supabase = await createAdminClient();

  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string).trim();
  const nameTh = (formData.get("name_th") as string)?.trim() || null;
  const summary = (formData.get("summary") as string)?.trim() || null;
  const description = (formData.get("description") as string) || null;
  const categoryId = (formData.get("category_id") as string) || null;
  const status = (formData.get("status") as string) || "draft";
  const isFeatured = formData.getAll("is_featured").includes("true");

  const mediaCurrent: PendingMedia[] = JSON.parse((formData.get("media_current") as string) || "[]");
  const mediaDeleted: { id: string; url: string }[] = JSON.parse((formData.get("media_deleted") as string) || "[]");
  const channels: { channel: string; url: string }[] = JSON.parse((formData.get("channels_json") as string) || "[]");

  if (!name) return;

  const isNew = !id;

  if (await isProductNameTaken(name, id ?? undefined)) {
    redirect(
      isNew ? "/admin/products/new?error=duplicate-name" : `/admin/products/${id}?error=duplicate-name`,
    );
  }

  const slug = await ensureUniqueSlug(supabase, name, id ?? undefined);

  const payload = {
    name, name_th: nameTh, summary, description,
    category_id: categoryId || null,
    status: status as never,
    is_featured: isFeatured,
    slug,
  };

  let productId = id;
  if (isNew) {
    const { data, error } = await supabase.from("products").insert(payload).select("id, slug").single();
    if (error) throw error;
    productId = data.id;
  } else {
    const { error } = await supabase.from("products").update(payload).eq("id", id!);
    if (error) throw error;
  }

  // Delete removed media (storage + DB row)
  for (const item of mediaDeleted) {
    try {
      const url = new URL(item.url);
      const m = url.pathname.match(/\/storage\/v1\/object\/public\/product-media\/(.+)$/);
      if (m) await supabase.storage.from("product-media").remove([m[1]]);
    } catch { /* non-storage URL, skip */ }
    await supabase.from("product_media").delete().eq("id", item.id);
  }

  // Insert newly uploaded media
  for (const item of mediaCurrent.filter((m) => m.isNew)) {
    await supabase.from("product_media").insert({
      product_id: productId!,
      url: item.url,
      type: item.type as never,
      provider: (item.provider as never) ?? null,
      sort_order: item.sortOrder,
      is_primary: item.isPrimary,
      alt: null,
    });
  }

  // Update sort_order + is_primary for existing media
  for (const item of mediaCurrent.filter((m) => !m.isNew)) {
    await supabase.from("product_media")
      .update({ sort_order: item.sortOrder, is_primary: item.isPrimary })
      .eq("id", item.id);
  }

  // Save channels (delete-all + re-insert)
  if (!isNew) {
    await supabase.from("product_channels").delete().eq("product_id", productId!);
    const channelRows = channels
      .filter((c) => c.channel && c.url)
      .map((c, i) => ({ product_id: productId!, channel: c.channel as never, url: c.url, sort_order: i }));
    if (channelRows.length) await supabase.from("product_channels").insert(channelRows);
  }

  revalidatePath("/products");
  revalidatePath(`/products/${slug}`);
  revalidatePath("/");
  revalidatePath("/admin");

  redirect(isNew ? `/admin/products/${productId}` : `/admin/products/${id}`);
}

/** Delete a product entirely, including its Storage files. */
export async function deleteProduct(id: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("slug, description, media:product_media(url)")
    .eq("id", id)
    .single();

  // The FK cascade removes product_media/channels/carousel ROWS, but not the
  // Storage objects — so gather every product-media path (gallery images plus
  // inline images embedded in the description) and remove the files first,
  // otherwise deleting a product silently orphans its images.
  const paths = new Set<string>();
  const collect = (s?: string | null) => {
    if (!s) return;
    for (const m of s.matchAll(/\/storage\/v1\/object\/public\/product-media\/([^"'\s)?]+)/g))
      paths.add(m[1]);
  };
  for (const item of (data?.media ?? []) as { url: string | null }[]) collect(item.url);
  collect(data?.description);
  if (paths.size) await supabase.storage.from("product-media").remove([...paths]);

  await supabase.from("products").delete().eq("id", id);

  revalidatePath("/products");
  revalidatePath("/admin");
  if (data?.slug) revalidatePath(`/products/${data.slug}`);
  redirect("/admin");
}

/**
 * Create a category (parentId = null) or subcategory (parentId set) on the fly
 * from the product editor. Name is used for both EN and TH; slug is derived and
 * de-duplicated. Returns the new row so the editor can select it immediately.
 */
export async function createCategory(
  name: string,
  parentId: string | null,
): Promise<{ id: string; slug: string; name: string }> {
  const supabase = await createAdminClient();
  const clean = name.trim();
  if (!clean) throw new Error("Category name is required");

  // Unique slug among categories.
  const base = slugify(clean) || "category";
  let slug = base;
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const { data } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) {
      slug = candidate;
      break;
    }
    attempt++;
  }

  const { data: last } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: clean,
      name_th: clean,
      slug,
      parent_id: parentId,
      sort_order: (last?.sort_order ?? 0) + 10,
    })
    .select("id, slug, name")
    .single();
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin");

  return { id: data.id, slug: data.slug, name: data.name };
}
