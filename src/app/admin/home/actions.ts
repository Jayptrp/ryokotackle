"use server";

import { revalidatePath } from "next/cache";
import { getCarouselSlides } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CarouselSlide } from "@/lib/types";

/* ------------------------------------------------------------- carousel */

export interface CarouselSlideInput {
  /** Existing DB id, or null for a newly added (not-yet-persisted) slide. */
  id: string | null;
  /** Storage URL for uploaded slides (ignored for product-backed slides). */
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  productId: string | null;
  linkProductId: string | null;
}

/**
 * Persist the whole carousel in one call — the unified-save analog of
 * `saveProductAll`. Nothing touches the DB until this runs: it deletes removed
 * slides (and their Storage objects when uploaded), inserts new ones, and
 * updates text/link/order for the rest. Returns the fresh, resolved slide list.
 */
export async function saveCarousel(input: {
  slides: CarouselSlideInput[];
  deletedIds: string[];
}): Promise<CarouselSlide[]> {
  const supabase = await createAdminClient();

  // 1. Deletions — strip Storage objects for uploaded (non-product) slides only.
  if (input.deletedIds.length) {
    const { data: doomed } = await supabase
      .from("carousel_slides")
      .select("id, image_url, product_id")
      .in("id", input.deletedIds);

    const paths: string[] = [];
    for (const s of doomed ?? []) {
      if (!s.product_id && s.image_url) {
        const match = new URL(s.image_url).pathname.match(
          /\/storage\/v1\/object\/public\/product-media\/(.+)$/,
        );
        if (match) paths.push(match[1]);
      }
    }
    if (paths.length) await supabase.storage.from("product-media").remove(paths);
    await supabase.from("carousel_slides").delete().in("id", input.deletedIds);
  }

  // 2. Inserts (new) + updates (existing); sort_order follows array order.
  //    Product-backed slides clear title/image_url — those resolve from the product.
  await Promise.all(
    input.slides.map((s, i) => {
      const sortOrder = (i + 1) * 10;
      if (s.id === null) {
        return supabase.from("carousel_slides").insert({
          image_url: s.productId ? null : s.imageUrl,
          product_id: s.productId,
          title: s.productId ? null : s.title || null,
          subtitle: s.subtitle || null,
          link_product_id: s.linkProductId || null,
          sort_order: sortOrder,
        });
      }
      return supabase
        .from("carousel_slides")
        .update({
          title: s.productId ? null : s.title || null,
          subtitle: s.subtitle || null,
          link_product_id: s.linkProductId || null,
          sort_order: sortOrder,
        })
        .eq("id", s.id);
    }),
  );

  revalidatePath("/");
  return getCarouselSlides();
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

/** Save (or clear) the disclaimer text for a category page. */
export async function saveCategoryDisclaimer(categoryId: string, disclaimer: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("categories")
    .update({ disclaimer: disclaimer.trim() || null })
    .eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/category", "layout");
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
