import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icon";
import { getBrands, getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  published: { label: "เผยแพร่", color: "bg-secondary-container text-on-secondary-container" },
  hidden: { label: "ซ่อน", color: "bg-surface-container text-on-surface-variant" },
  draft: { label: "ร่าง", color: "bg-error-container text-on-error-container" },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; brand?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const statusFilter = params.status ?? "";
  const categoryFilter = params.category ?? "";
  const brandFilter = params.brand ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 30;
  const from = (page - 1) * pageSize;

  const supabase = await createAdminClient();
  const [brands, categories] = await Promise.all([getBrands(), getCategories()]);

  let query = supabase
    .from("products")
    .select(
      "id, slug, name, name_th, status, is_featured, brand:brands(name), category:categories!products_category_id_fkey(name)",
      { count: "exact" },
    )
    .order("name");

  if (q) query = query.or(`name.ilike.%${q}%,name_th.ilike.%${q}%`);
  if (statusFilter) query = query.eq("status", statusFilter as never);
  if (categoryFilter) {
    const cat = categories.find((c) => c.slug === categoryFilter);
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (brandFilter) {
    const brand = brands.find((b) => b.slug === brandFilter);
    if (brand) query = query.eq("brand_id", brand.id);
  }

  const { data: products, count } = await query.range(from, from + pageSize - 1);
  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (statusFilter) p.set("status", statusFilter);
    if (categoryFilter) p.set("category", categoryFilter);
    if (brandFilter) p.set("brand", brandFilter);
    if (page > 1) p.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    const s = p.toString();
    return `/admin${s ? `?${s}` : ""}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">สินค้าทั้งหมด</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{total} รายการ</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          <Icon name="add" />
          เพิ่มสินค้าใหม่
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl" />
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหาชื่อสินค้า..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-10 pr-4 font-body-sm text-body-sm outline-none focus:border-primary"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="published">เผยแพร่</option>
          <option value="hidden">ซ่อน</option>
          <option value="draft">ร่าง</option>
        </select>
        <select
          name="category"
          defaultValue={categoryFilter}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="">หมวดหมู่ทั้งหมด</option>
          {categories.filter(c => !c.parentSlug).map((c) => (
            <optgroup key={c.slug} label={c.nameTh ?? c.name}>
              <option value={c.slug}>{c.nameTh ?? c.name}</option>
              {categories.filter(ch => ch.parentSlug === c.slug).map(ch => (
                <option key={ch.slug} value={ch.slug}>— {ch.nameTh ?? ch.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          name="brand"
          defaultValue={brandFilter}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="">แบรนด์ทั้งหมด</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>{b.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-surface-container px-4 py-2 font-label-caps text-label-caps text-on-surface transition-colors hover:bg-surface-container-high"
        >
          กรอง
        </button>
        {(q || statusFilter || categoryFilter || brandFilter) && (
          <Link
            href="/admin"
            className="rounded-lg px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-primary"
          >
            ล้าง
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container">
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">ชื่อสินค้า</th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">แบรนด์</th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">หมวดหมู่</th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">สถานะ</th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">แนะนำ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!products?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center font-body-sm text-body-sm text-on-surface-variant">
                  ไม่พบสินค้า
                </td>
              </tr>
            )}
            {products?.map((p, i) => {
              const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft;
              const brand = p.brand as { name: string } | null;
              const category = p.category as { name: string } | null;
              return (
                <tr
                  key={p.id}
                  className={`border-b border-outline-variant transition-colors hover:bg-surface-container-low ${i % 2 === 0 ? "" : "bg-surface-container-lowest"}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-body-sm text-body-sm font-medium text-on-surface">{p.name}</p>
                    {p.name_th && <p className="font-body-sm text-body-sm text-on-surface-variant">{p.name_th}</p>}
                  </td>
                  <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                    {brand?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                    {category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 font-label-caps text-label-caps ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.is_featured && (
                      <Icon name="star" filled className="text-secondary" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                    >
                      <Icon name="edit" className="text-base" />
                      แก้ไข
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            หน้า {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-lg border border-outline-variant px-4 py-2 font-label-caps text-label-caps transition-colors hover:border-primary"
              >
                ก่อนหน้า
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                ถัดไป
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
