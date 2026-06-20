import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  CarouselSlide,
  Category,
  CategoryCard,
  Product,
  ProductListItem,
  ProductQuery,
  Warranty,
} from "@/lib/types";

export const DEFAULT_PAGE_SIZE = 24;

/* ------------------------------------------------------------------ mappers */

/* eslint-disable @typescript-eslint/no-explicit-any */
function pickPrimaryImage(media: any[]): string | null {
  if (!media?.length) return null;
  const images = media
    .filter((m) => m.type === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  const primary = images.find((m) => m.is_primary);
  return (primary ?? images[0])?.url ?? null;
}

function mapListItem(row: any): ProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameTh: row.name_th,
    summary: row.summary,
    status: row.status,
    category: row.category
      ? { slug: row.category.slug, name: row.category.name, nameTh: row.category.name_th }
      : null,
    primaryImage: pickPrimaryImage(row.media ?? []),
    createdAt: row.created_at,
  };
}

function mapCategory(row: any): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameTh: row.name_th,
    parentSlug: row.parentSlug ?? null,
    icon: row.icon,
    sortOrder: row.sort_order,
    imageUrl: row.image_url ?? null,
    imageProductId: row.image_product_id ?? null,
    disclaimer: row.disclaimer ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const LIST_SELECT =
  "id, slug, name, name_th, summary, status, created_at, category:categories!products_category_id_fkey(slug, name, name_th), media:product_media(url, type, is_primary, sort_order)";

/* --------------------------------------------------------------- categories */

/**
 * All categories (flat), with `parentSlug` resolved. Memoized per-request with
 * React `cache()` — dedupes the repeated calls within a single render without
 * persisting stale data across requests (a process-global cache would hide admin
 * edits to category images until the server restarted).
 */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, name_th, icon, sort_order, parent_id, image_url, image_product_id, disclaimer")
    .order("sort_order");

  const rows = data ?? [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return rows.map((r) =>
    mapCategory({
      ...r,
      parentSlug: r.parent_id ? (byId.get(r.parent_id)?.slug ?? null) : null,
    }),
  );
});

/** Top-level categories with their `children` nested. */
export async function getCategoryTree(): Promise<Category[]> {
  const all = await getCategories();
  const top = all.filter((c) => !c.parentSlug);
  return top.map((c) => ({
    ...c,
    children: all
      .filter((child) => child.parentSlug === c.slug)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

/**
 * Top-level categories for the homepage grid, each with a resolved card
 * background image. Resolution order: admin-uploaded image → the primary image
 * of the admin-selected product → the first available primary image of any
 * published product in the category (or its sub-categories).
 */
export async function getCategoryCards(): Promise<CategoryCard[]> {
  const [all, products] = await Promise.all([
    getCategories(),
    getAllPublishedListItems(),
  ]);

  const topLevel = all
    .filter((c) => !c.parentSlug)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Map any category slug → its top-level slug (taxonomy is at most 2 deep).
  const topOf = (slug: string): string => {
    const c = all.find((x) => x.slug === slug);
    return c?.parentSlug ?? slug;
  };

  // Bucket published products (with an image) under their top-level category.
  const imagesByTop = new Map<string, string[]>();
  const imageById = new Map<string, string>();
  for (const p of products) {
    if (p.primaryImage) imageById.set(p.id, p.primaryImage);
    if (!p.category || !p.primaryImage) continue;
    const top = topOf(p.category.slug);
    const list = imagesByTop.get(top) ?? [];
    list.push(p.primaryImage);
    imagesByTop.set(top, list);
  }

  return topLevel.map((c) => {
    const background =
      c.imageUrl ??
      (c.imageProductId ? imageById.get(c.imageProductId) : undefined) ??
      imagesByTop.get(c.slug)?.[0] ??
      null;
    return {
      slug: c.slug,
      name: c.name,
      nameTh: c.nameTh,
      icon: c.icon,
      backgroundImage: background,
    };
  });
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  const all = await getCategories();
  return all.find((c) => c.slug === slug);
}

/** A category slug plus all of its descendant slugs (for inclusive listings). */
async function categorySlugWithDescendants(slug: string): Promise<string[]> {
  const all = await getCategories();
  const children = all.filter((c) => c.parentSlug === slug).map((c) => c.slug);
  return [slug, ...children];
}

/* ----------------------------------------------------------------- products */

/** Paginated, filterable product listing (published only via RLS). */
export async function getProducts(
  query: ProductQuery = {},
): Promise<{ items: ProductListItem[]; total: number }> {
  const supabase = createPublicClient();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from("products")
    .select(LIST_SELECT, { count: "exact" })
    .eq("status", "published");

  if (query.category) {
    const slugs = await categorySlugWithDescendants(query.category);
    const cats = (await getCategories()).filter((c) => slugs.includes(c.slug));
    builder = builder.in(
      "category_id",
      cats.map((c) => c.id),
    );
  }

  if (query.q) {
    const term = query.q.replace(/[%,]/g, " ").trim();
    if (term) builder = builder.or(`name.ilike.%${term}%,name_th.ilike.%${term}%`);
  }

  builder =
    query.sort === "newest"
      ? builder.order("created_at", { ascending: false })
      : builder.order("name", { ascending: true });

  const { data, count } = await builder.range(from, from + pageSize - 1);
  return { items: (data ?? []).map(mapListItem), total: count ?? 0 };
}

/**
 * All published products in one query (no pagination). Intended for pages that
 * filter client-side — the catalog is small (~360 items), so loading once and
 * filtering in the browser is cheaper than re-rendering on every filter click.
 */
export async function getAllPublishedListItems(): Promise<ProductListItem[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("status", "published")
    .order("name", { ascending: true })
    .limit(1000);
  return (data ?? []).map(mapListItem);
}

/**
 * Published featured products. Pass a `limit` to cap the count; omit it to
 * return every featured product (the homepage shows them all, unbounded).
 */
export async function getFeatured(limit?: number): Promise<ProductListItem[]> {
  const supabase = createPublicClient();
  let builder = supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("name");
  if (limit !== undefined) builder = builder.limit(limit);
  const { data } = await builder;
  return (data ?? []).map(mapListItem);
}

export async function getNewArrivals(limit = 8): Promise<ProductListItem[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapListItem);
}

/** Full product detail by slug (or undefined when not published / missing). */
export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, name_th, summary, description, status, is_featured, category:categories!products_category_id_fkey(id, slug, name, name_th, icon, sort_order, parent_id, disclaimer), media:product_media(id, type, provider, url, alt, sort_order, is_primary), channels:product_channels(id, channel, url, sort_order), warranties:product_warranties(warranty:warranties(id, name, sort_order))",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return undefined;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const row = data as any;
  let category: Category | null = null;
  if (row.category) {
    const all = await getCategories();
    category = {
      id: row.category.id,
      slug: row.category.slug,
      name: row.category.name,
      nameTh: row.category.name_th,
      icon: row.category.icon,
      sortOrder: row.category.sort_order,
      imageUrl: null,
      imageProductId: null,
      disclaimer: row.category.disclaimer ?? null,
      parentSlug: row.category.parent_id
        ? (all.find((c) => c.id === row.category.parent_id)?.slug ?? null)
        : null,
    };
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameTh: row.name_th,
    summary: row.summary,
    description: row.description,
    status: row.status,
    isFeatured: row.is_featured,
    category,
    media: (row.media ?? [])
      .map((m: any) => ({
        id: m.id,
        type: m.type,
        provider: m.provider,
        url: m.url,
        alt: m.alt,
        sortOrder: m.sort_order,
        isPrimary: m.is_primary,
      }))
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    channels: (row.channels ?? [])
      .map((c: any) => ({
        id: c.id,
        channel: c.channel,
        url: c.url,
        sortOrder: c.sort_order,
      }))
      .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    warranties: (row.warranties ?? [])
      .map((w: any) => w.warranty)
      .filter(Boolean)
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((w: any) => ({ id: w.id, name: w.name })),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** Published slugs for static generation. */
export async function getPublishedSlugs(): Promise<string[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "published");
  return (data ?? []).map((r) => r.slug);
}

/* -------------------------------------------------------- carousel slides */

/**
 * Hero carousel slides in display order (admin-editable). Product-backed slides
 * resolve their image and title from the product; uploaded slides use the stored
 * image_url/title. Slides with no resolvable image are dropped.
 */
export async function getCarouselSlides(): Promise<CarouselSlide[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("carousel_slides")
    .select(
      "id, image_url, title, subtitle, sort_order, product_id, link_product_id, " +
        "product:products!carousel_slides_product_id_fkey(name, name_th, media:product_media(url, type, is_primary, sort_order)), " +
        "link_product:products!carousel_slides_link_product_id_fkey(slug)",
    )
    .order("sort_order");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? [])
    .map((row: any) => {
      const product = row.product;
      const imageUrl = product
        ? pickPrimaryImage(product.media ?? [])
        : row.image_url;
      if (!imageUrl) return null;
      return {
        id: row.id,
        imageUrl,
        title: product ? (product.name_th ?? product.name) : row.title,
        subtitle: row.subtitle,
        sortOrder: row.sort_order,
        productId: row.product_id ?? null,
        linkProductId: row.link_product_id ?? null,
        linkProductSlug: row.link_product?.slug ?? null,
      } satisfies CarouselSlide;
    })
    .filter((s): s is CarouselSlide => s !== null);
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/* ----------------------------------------------------------------- pages */

export interface PageContent {
  title: string;
  titleTh: string | null;
  content: string | null;
}

/** A published static page (About, etc.) by slug, or null if missing/unpublished. */
export async function getPageBySlug(slug: string): Promise<PageContent | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("pages")
    .select("title, title_th, content")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  return { title: data.title, titleTh: data.title_th, content: data.content };
}

/* -------------------------------------------------------------- warranties */

/** All warranty types in display order (admin-editable). */
export async function getWarranties(): Promise<Warranty[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("warranties")
    .select("id, name, detail, sort_order")
    .order("sort_order");
  return (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    detail: w.detail,
    sortOrder: w.sort_order,
  }));
}

/** Title + subtitle for the public warranty page (singleton, with fallbacks). */
export async function getWarrantyPage(): Promise<{
  title: string;
  subtitle: string;
}> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("warranty_page")
    .select("title, subtitle")
    .eq("id", 1)
    .maybeSingle();
  return {
    title: data?.title?.trim() || "การรับประกันและการเคลมสินค้า",
    subtitle: data?.subtitle?.trim() || "",
  };
}
