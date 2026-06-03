import "server-only";
import { SEED_PRODUCTS } from "@/lib/products";
import type { Product } from "@/lib/types";

/**
 * Live product data is intentionally OFF until the real `products` table is in
 * place. The current Supabase table is only a mock whose columns don't match
 * the `Product` model (no slug/specs/gallery, `image_url` vs `image`, …), so
 * reading it would break images and detail links.
 *
 * Once the real schema is created (matching `src/lib/types.ts`), flip this to
 * `true` (or gate it on an env var) to switch the storefront onto live data.
 * The Supabase clients and publishable-key wiring are already configured.
 */
const USE_SUPABASE_PRODUCTS = false;

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
);

/** Fetch all products. Uses the seed catalog until live data is enabled. */
export async function getProducts(): Promise<Product[]> {
  if (!USE_SUPABASE_PRODUCTS || !isSupabaseConfigured) return SEED_PRODUCTS;

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id");

  if (error || !data || data.length === 0) return SEED_PRODUCTS;
  return data as Product[];
}

/** Fetch a single product by slug. */
export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.slug === slug);
}
