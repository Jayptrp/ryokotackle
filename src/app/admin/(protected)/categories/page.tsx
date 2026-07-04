import Link from "next/link";
import { CategoryManager } from "@/components/admin/category-manager";
import { Icon } from "@/components/icon";
import { getCategoryAdminNodes } from "@/app/admin/categories/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CategoryProductRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CategoriesAdminPage() {
  const supabase = await createAdminClient();
  const [nodes, { data: products }] = await Promise.all([
    getCategoryAdminNodes(),
    supabase
      .from("products")
      .select("id, name, name_th, status, category_id")
      .order("name"),
  ]);

  const productRows: CategoryProductRow[] = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    nameTh: p.name_th,
    status: p.status,
    categoryId: p.category_id,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">
          จัดการหมวดหมู่
        </h1>
        <Link
          href="/products"
          target="_blank"
          className="flex items-center gap-1 font-label-caps text-label-caps text-secondary hover:underline"
        >
          <Icon name="open_in_new" className="text-base" />
          ดูหน้าสินค้า
        </Link>
      </div>
      <p className="mb-6 font-body-sm text-body-sm text-on-surface-variant">
        เพิ่ม แก้ไขชื่อ/URL (slug) ไอคอน หมวดแม่ และลำดับของหมวดหมู่ทั้งหมด — หน้านี้ใช้จัดการ
        โครงสร้างหมวดหมู่เท่านั้น (รูปการ์ดและข้อความแจ้งเตือนอยู่ที่หน้า &quot;แก้ไขรูปหมวดหมู่&quot;)
      </p>

      <CategoryManager initialNodes={nodes} products={productRows} />
    </div>
  );
}
