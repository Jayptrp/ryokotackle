import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type {
  Brand,
  Category,
  Product,
  ProductListItem,
  ProductQuery,
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
    brand: row.brand ? { slug: row.brand.slug, name: row.brand.name } : null,
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
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const LIST_SELECT =
  "id, slug, name, name_th, summary, status, created_at, brand:brands(slug, name), category:categories(slug, name, name_th), media:product_media(url, type, is_primary, sort_order)";

/* --------------------------------------------------------------- categories */

let categoriesCache: Category[] | null = null;

/** All categories (flat), with `parentSlug` resolved. Cached per request module. */
export async function getCategories(): Promise<Category[]> {
  if (categoriesCache) return categoriesCache;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, name_th, icon, sort_order, parent_id")
    .order("sort_order");

  const rows = data ?? [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  categoriesCache = rows.map((r) =>
    mapCategory({
      ...r,
      parentSlug: r.parent_id ? (byId.get(r.parent_id)?.slug ?? null) : null,
    }),
  );
  return categoriesCache;
}

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

/* ------------------------------------------------------------------- brands */

export async function getBrands(): Promise<Brand[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("brands")
    .select("id, slug, name")
    .order("name");
  return data ?? [];
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

  if (query.brand) {
    const all = await getBrands();
    const brand = all.find((b) => b.slug === query.brand);
    builder = builder.eq("brand_id", brand?.id ?? "00000000-0000-0000-0000-000000000000");
  }

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

export async function getFeatured(limit = 8): Promise<ProductListItem[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("products")
    .select(LIST_SELECT)
    .eq("status", "published")
    .eq("is_featured", true)
    .order("name")
    .limit(limit);
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
      "id, slug, name, name_th, summary, description, status, is_featured, brand:brands(id, slug, name), category:categories(id, slug, name, name_th, icon, sort_order, parent_id), media:product_media(id, type, provider, url, alt, sort_order, is_primary), channels:product_channels(id, channel, url, sort_order)",
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
    brand: row.brand ?? null,
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
