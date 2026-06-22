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

export interface CategorySaveInput {
  id: string;
  /** Uploaded background URL, or null. Mutually exclusive with imageProductId. */
  imageUrl: string | null;
  /** Product whose primary image backs the card, or null (auto-pick). */
  imageProductId: string | null;
  /** Disclaimer shown on the category page ("" clears it). */
  disclaimer: string;
}

/**
 * Persist every category card in one call — the unified-save analog of
 * `saveCarousel`. Nothing touches the DB until this runs: it first deletes the
 * categories the admin removed (guarded — a category that still has products or
 * sub-categories is refused, never silently orphaned, since the FKs are
 * `on delete set null`), then updates the background image source
 * (uploaded / product / auto) and disclaimer for the rest.
 */
export async function saveCategoriesAll(input: {
  categories: CategorySaveInput[];
  deletedIds: string[];
}) {
  const supabase = await createAdminClient();

  // 1. Deletions — only categories with no products and no sub-categories.
  if (input.deletedIds.length) {
    const [{ count: productCount }, { count: childCount }] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .in("category_id", input.deletedIds),
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .in("parent_id", input.deletedIds),
    ]);
    if ((productCount ?? 0) > 0 || (childCount ?? 0) > 0) {
      throw new Error("ลบไม่ได้: หมวดหมู่ยังมีสินค้าหรือหมวดย่อยอยู่");
    }
    const { error } = await supabase
      .from("categories")
      .delete()
      .in("id", input.deletedIds);
    if (error) throw error;
  }

  // 2. Updates — image source (uploaded / product / auto) + disclaimer.
  const results = await Promise.all(
    input.categories.map((c) =>
      supabase
        .from("categories")
        .update({
          image_url: c.imageUrl,
          image_product_id: c.imageProductId,
          disclaimer: c.disclaimer.trim() || null,
        })
        .eq("id", c.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  revalidatePath("/");
  revalidatePath("/category", "layout");
}

/* ------------------------------------------------------------- featured */

/**
 * Persist the whole "แก้ไขสินค้าแนะนำ" page in one call — the unified-save
 * analog of `saveCarousel`. The client stages everything locally and sends:
 *   - `featured` / `unfeatured`: product ids whose is_featured flag flipped.
 *   - `banners`: the per-category 3:1 banner URL (null clears it). Only the
 *     categories whose banner actually changed are sent.
 * Banners follow the same convention as category card images: replacing an
 * uploaded banner just overwrites the URL (old Storage object is left in place,
 * matching `saveCategoriesAll`).
 */
export async function saveFeatured(input: {
  featured: string[];
  unfeatured: string[];
  banners: { categoryId: string; bannerUrl: string | null }[];
}) {
  const supabase = await createAdminClient();

  if (input.featured.length) {
    const { error } = await supabase
      .from("products")
      .update({ is_featured: true })
      .in("id", input.featured);
    if (error) throw error;
  }
  if (input.unfeatured.length) {
    const { error } = await supabase
      .from("products")
      .update({ is_featured: false })
      .in("id", input.unfeatured);
    if (error) throw error;
  }

  if (input.banners.length) {
    const results = await Promise.all(
      input.banners.map((b) =>
        supabase
          .from("categories")
          .update({ featured_banner_url: b.bannerUrl })
          .eq("id", b.categoryId),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }

  revalidatePath("/");
  revalidatePath("/admin/home/featured");
}
