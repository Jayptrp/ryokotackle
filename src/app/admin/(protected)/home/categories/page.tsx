import Link from "next/link";
import {
  CategoryImageManager,
  type CategoryRow,
} from "@/components/admin/category-image-manager";
import { Icon } from "@/components/icon";
import {
  getAllPublishedListItems,
  getCategories,
  getCategoryCards,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CategoryImagesAdminPage() {
  const [all, products, cards] = await Promise.all([
    getCategories(),
    getAllPublishedListItems(),
    getCategoryCards(),
  ]);

  const topLevel = all
    .filter((c) => !c.parentSlug)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // top-level slug for any category slug (taxonomy is at most 2 deep)
  const topOf = (slug: string) =>
    all.find((c) => c.slug === slug)?.parentSlug ?? slug;

  const resolvedBySlug = new Map(cards.map((c) => [c.slug, c.backgroundImage]));

  const rows: CategoryRow[] = topLevel.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    label: cat.nameTh ?? cat.name,
    icon: cat.icon,
    imageUrl: cat.imageUrl,
    imageProductId: cat.imageProductId,
    resolved: resolvedBySlug.get(cat.slug) ?? null,
    products: products
      .filter(
        (p) => p.primaryImage && p.category && topOf(p.category.slug) === cat.slug,
      )
      .map((p) => ({
        id: p.id,
        label: p.nameTh ?? p.name,
        image: p.primaryImage as string,
      })),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">แก้ไขรูปหมวดหมู่</h1>
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
        เลือกรูปพื้นหลังของการ์ดหมวดหมู่ในหน้าแรก — อัปโหลดรูปเอง หรือเลือกสินค้าในหมวดเพื่อใช้รูปหลักของสินค้านั้น
        หากไม่เลือก ระบบจะใช้รูปสินค้าในหมวดโดยอัตโนมัติ
      </p>
      <CategoryImageManager categories={rows} />
    </div>
  );
}
