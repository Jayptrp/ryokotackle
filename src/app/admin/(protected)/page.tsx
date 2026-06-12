import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icon";
import { getCategories } from "@/lib/queries";
import {
  AdminProductsBrowser,
  type AdminProduct,
  type AdminCategory,
} from "@/components/admin/admin-products-browser";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createAdminClient();
  const categories = await getCategories();

  const { data: rows } = await supabase
    .from("products")
    .select(
      "id, slug, name, name_th, status, is_featured, category:categories!products_category_id_fkey(id, name, name_th, parent_id), product_media(url, type, is_primary, sort_order)",
    )
    .order("name");

  const products: AdminProduct[] = (rows ?? []).map((p) => {
    const cat = p.category as
      | { id: string; name: string; name_th: string | null; parent_id: string | null }
      | null;

    let categoryLabel = "—";
    let categorySlug: string | null = null;
    let parentSlug: string | null = null;

    if (cat) {
      const self = cat.name_th ?? cat.name;
      const parentCat = cat.parent_id
        ? categories.find((c) => c.id === cat.parent_id)
        : null;
      categoryLabel = parentCat
        ? `${parentCat.nameTh ?? parentCat.name} › ${self}`
        : self;
      const catEntry = categories.find((c) => c.id === cat.id);
      categorySlug = catEntry?.slug ?? null;
      parentSlug = catEntry?.parentSlug ?? null;
    }

    const media = (p.product_media ?? []) as {
      url: string; type: string; is_primary: boolean; sort_order: number;
    }[];
    const images = media.filter((m) => m.type === "image").sort((a, b) => a.sort_order - b.sort_order);
    const primaryImage = (images.find((m) => m.is_primary) ?? images[0])?.url ?? null;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameTh: p.name_th,
      status: p.status,
      isFeatured: p.is_featured ?? false,
      categoryLabel,
      categorySlug,
      parentSlug,
      imageUrl: primaryImage,
    };
  });

  const adminCategories: AdminCategory[] = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameTh: c.nameTh ?? null,
    parentSlug: c.parentSlug ?? null,
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md text-primary">สินค้าทั้งหมด</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          <Icon name="add" />
          เพิ่มสินค้าใหม่
        </Link>
      </div>

      <AdminProductsBrowser products={products} categories={adminCategories} />
    </div>
  );
}
