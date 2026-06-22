import Link from "next/link";
import {
  FeaturedManager,
  type FeaturedCategoryRow,
} from "@/components/admin/featured-manager";
import { Icon } from "@/components/icon";
import { getCategories } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
function primaryImage(media: any[]): string | null {
  if (!media?.length) return null;
  const images = media
    .filter((m) => m.type === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  return (images.find((m) => m.is_primary) ?? images[0])?.url ?? null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default async function FeaturedAdminPage() {
  const supabase = await createAdminClient();
  const [{ data }, all] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, name_th, is_featured, category_id, media:product_media(url, type, is_primary, sort_order)",
      )
      .eq("status", "published")
      .order("name"),
    getCategories(),
  ]);

  // Resolve any category id → its top-level category (taxonomy is at most 2 deep).
  const byId = new Map(all.map((c) => [c.id, c]));
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  const topOf = (categoryId: string | null) => {
    const c = categoryId ? byId.get(categoryId) : undefined;
    if (!c) return undefined;
    return c.parentSlug ? bySlug.get(c.parentSlug) : c;
  };

  const topLevel = all
    .filter((c) => !c.parentSlug)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const rows: FeaturedCategoryRow[] = topLevel
    .map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      label: cat.nameTh ?? cat.name,
      icon: cat.icon,
      bannerUrl: cat.featuredBannerUrl,
      products: (data ?? [])
        .filter((p) => topOf(p.category_id)?.id === cat.id)
        .map((p) => ({
          id: p.id,
          label: p.name_th ?? p.name,
          image: primaryImage((p as { media?: unknown[] }).media ?? []),
          isFeatured: p.is_featured,
        })),
    }))
    .filter((row) => row.products.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">แก้ไขสินค้าแนะนำ</h1>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1 font-label-caps text-label-caps text-secondary hover:underline"
        >
          <Icon name="open_in_new" className="text-base" />
          ดูหน้าแรก
        </Link>
      </div>
      <p className="mb-6 font-body-sm text-body-sm text-on-surface-variant">
        แต่ละหมวดหมู่ อัปโหลดแบนเนอร์ (อัตราส่วน 3:1) และเลือกสินค้าแนะนำได้ — กดที่สินค้าเพื่อตั้ง/ยกเลิกแนะนำ
        (สินค้าที่แนะนำจะมีขอบสีเขียว) หมวดหมู่จะแสดงบนหน้าแรกเฉพาะเมื่อมีสินค้าแนะนำอย่างน้อยหนึ่งรายการ
      </p>
      <FeaturedManager categories={rows} />
    </div>
  );
}
