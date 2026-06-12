"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------- carousel */

/** Append a new slide from an uploaded image URL. Returns the new row id. */
export async function addSlide(imageUrl: string): Promise<string> {
  const supabase = await createAdminClient();

  const { data: last } = await supabase
    .from("carousel_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("carousel_slides")
    .insert({ image_url: imageUrl, sort_order: (last?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/");
  return data.id;
}

/** Append a slide backed by a product. Image + title come from the product. */
export async function addSlideFromProduct(productId: string): Promise<string> {
  const supabase = await createAdminClient();

  const { data: last } = await supabase
    .from("carousel_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("carousel_slides")
    .insert({ product_id: productId, sort_order: (last?.sort_order ?? 0) + 10 })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/");
  return data.id;
}

/**
 * Save the overlay text of every slide in one call. `title` is cleared for
 * product-backed slides (their title is the product name, resolved at read time).
 */
export async function saveSlideTexts(
  slides: { id: string; title: string | null; subtitle: string | null; productId: string | null }[],
) {
  const supabase = await createAdminClient();
  await Promise.all(
    slides.map((s) =>
      supabase
        .from("carousel_slides")
        .update({
          title: s.productId ? null : s.title || null,
          subtitle: s.subtitle || null,
        })
        .eq("id", s.id),
    ),
  );
  revalidatePath("/");
}

/**
 * Delete a slide. Only removes the Storage object for *uploaded* slides — never
 * for product-backed slides, whose image belongs to the product.
 */
export async function deleteSlide(id: string) {
  const supabase = await createAdminClient();

  const { data: slide } = await supabase
    .from("carousel_slides")
    .select("image_url, product_id")
    .eq("id", id)
    .maybeSingle();

  if (slide && !slide.product_id && slide.image_url) {
    const match = new URL(slide.image_url).pathname.match(
      /\/storage\/v1\/object\/public\/product-media\/(.+)$/,
    );
    if (match) {
      await supabase.storage.from("product-media").remove([match[1]]);
    }
  }

  const { error } = await supabase.from("carousel_slides").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
}

/** Persist a new slide order. */
export async function reorderSlides(orderedIds: string[]) {
  const supabase = await createAdminClient();
  await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("carousel_slides")
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", id),
    ),
  );
  revalidatePath("/");
}

/* ----------------------------------------------------------- categories */

/** Use an uploaded image as the category card background. */
export async function setCategoryImageUrl(categoryId: string, imageUrl: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ image_url: imageUrl, image_product_id: null })
    .eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/");
}

/** Use a product's primary image as the category card background. */
export async function setCategoryImageProduct(
  categoryId: string,
  productId: string | null,
) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ image_product_id: productId || null, image_url: null })
    .eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/");
}

/** Reset the card back to the auto-picked product image. */
export async function clearCategoryImage(categoryId: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ image_url: null, image_product_id: null })
    .eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/");
}

/* ------------------------------------------------------------- featured */

/** Toggle a product's featured flag (shown in the homepage featured area). */
export async function setFeatured(productId: string, value: boolean) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ is_featured: value })
    .eq("id", productId);
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/admin/home/featured");
}
