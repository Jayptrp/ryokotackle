"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Icon } from "@/components/icon";
import { DeleteProductButton } from "@/components/admin/delete-product-button";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  published: { label: "เผยแพร่", color: "bg-secondary-container text-on-secondary-container" },
  hidden: { label: "ซ่อน", color: "bg-surface-container text-on-surface-variant" },
  draft: { label: "ร่าง", color: "bg-error-container text-on-error-container" },
};

const PAGE_SIZE = 30;

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  nameTh: string | null;
  status: string;
  isFeatured: boolean;
  categoryLabel: string;
  categorySlug: string | null;
  parentSlug: string | null;
  imageUrl: string | null;
  hasSummary: boolean;
  hasDescription: boolean;
}

export interface AdminCategory {
  slug: string;
  nameTh: string | null;
  name: string;
  parentSlug: string | null;
}

/** Small colored dot indicators for each SEO field. */
function SeoGaps({ p }: { p: AdminProduct }) {
  const gaps: string[] = [];
  if (!p.imageUrl) gaps.push("รูป");
  if (!p.nameTh) gaps.push("ชื่อไทย");
  if (!p.hasSummary) gaps.push("สรุป");
  if (!p.hasDescription) gaps.push("รายละเอียด");
  if (gaps.length === 0) return null;
  return (
    <p className="mt-0.5 text-[10px] leading-tight text-error/60">
      ขาด: {gaps.join(", ")}
    </p>
  );
}

export function AdminProductsBrowser({
  products,
  categories,
}: {
  products: AdminProduct[];
  categories: AdminCategory[];
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [seoFilter, setSeoFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(lower) && !(p.nameTh?.toLowerCase().includes(lower))) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (categoryFilter) {
        const isDirectMatch = p.categorySlug === categoryFilter;
        const isChildMatch = p.parentSlug === categoryFilter;
        if (!isDirectMatch && !isChildMatch) return false;
      }
      if (seoFilter) {
        const hasImage = !!p.imageUrl;
        const hasNameTh = !!p.nameTh;
        const allOk = hasImage && hasNameTh && p.hasSummary && p.hasDescription;
        if (seoFilter === "any" && allOk) return false;
        if (seoFilter === "no-image" && hasImage) return false;
        if (seoFilter === "no-name-th" && hasNameTh) return false;
        if (seoFilter === "no-summary" && p.hasSummary) return false;
        if (seoFilter === "no-description" && p.hasDescription) return false;
      }
      return true;
    });
  }, [products, q, statusFilter, categoryFilter, seoFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetPage() { setPage(1); }

  const parentCategories = categories.filter((c) => !c.parentSlug);
  const hasAnyFilter = !!(q || statusFilter || categoryFilter || seoFilter);

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant"
          />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); resetPage(); }}
            placeholder="ค้นหาชื่อสินค้า..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-10 pr-4 font-body-sm text-body-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="">สถานะทั้งหมด</option>
          <option value="published">เผยแพร่</option>
          <option value="hidden">ซ่อน</option>
          <option value="draft">ร่าง</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); resetPage(); }}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="">หมวดหมู่ทั้งหมด</option>
          {parentCategories.map((c) => (
            <optgroup key={c.slug} label={c.nameTh ?? c.name}>
              <option value={c.slug}>{c.nameTh ?? c.name}</option>
              {categories
                .filter((ch) => ch.parentSlug === c.slug)
                .map((ch) => (
                  <option key={ch.slug} value={ch.slug}>
                    — {ch.nameTh ?? ch.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <select
          value={seoFilter}
          onChange={(e) => { setSeoFilter(e.target.value); resetPage(); }}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="">SEO ทั้งหมด</option>
          <option value="any">มีข้อมูลไม่ครบ</option>
          <option value="no-image">ไม่มีรูปภาพ</option>
          <option value="no-name-th">ไม่มีชื่อไทย</option>
          <option value="no-summary">ไม่มีคำอธิบายสั้น</option>
          <option value="no-description">ไม่มีรายละเอียดสินค้า</option>
        </select>
        <button
          type="button"
          disabled={!hasAnyFilter}
          onClick={() => { setQ(""); setStatusFilter(""); setCategoryFilter(""); setSeoFilter(""); resetPage(); }}
          className="rounded-lg px-4 py-2 font-label-caps text-label-caps transition-colors disabled:cursor-not-allowed disabled:opacity-30 enabled:text-on-surface-variant enabled:hover:text-primary"
        >
          ล้าง
        </button>
      </div>

      <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
        {filtered.length} รายการ
        {filtered.length !== products.length && ` (จากทั้งหมด ${products.length})`}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container">
              <th className="w-14 px-4 py-3" />
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">ชื่อสินค้า</th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">หมวดหมู่</th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">สถานะ</th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">แนะนำ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center font-body-sm text-body-sm text-on-surface-variant">
                  ไม่พบสินค้า
                </td>
              </tr>
            )}
            {slice.map((p, i) => {
              const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft;
              return (
                <tr
                  key={p.id}
                  className={`border-b border-outline-variant transition-colors hover:bg-surface-container-low ${i % 2 === 0 ? "" : "bg-surface-container-lowest"}`}
                >
                  <td className="w-14 px-4 py-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${p.imageUrl}?width=80&quality=60`}
                        alt=""
                        className="h-10 w-10 min-w-[40px] rounded-md border border-outline-variant object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-md border border-outline-variant bg-surface-container">
                        <Icon name="image" className="text-base text-on-surface-variant opacity-40" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-body-sm text-body-sm font-medium text-on-surface">{p.nameTh ?? p.name}</p>
                    {p.nameTh && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{p.name}</p>
                    )}
                    <SeoGaps p={p} />
                  </td>
                  <td className="px-4 py-3 font-body-sm text-body-sm text-on-surface-variant">
                    {p.categoryLabel}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 font-label-caps text-label-caps ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.isFeatured && (
                      <Icon name="star" filled className="text-secondary" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                      >
                        <Icon name="edit" className="text-base" />
                        แก้ไข
                      </Link>
                      <DeleteProductButton id={p.id} name={p.nameTh ?? p.name} compact />
                    </div>
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
            หน้า {safePage} / {totalPages}
          </p>
          <div className="flex gap-2">
            {safePage > 1 && (
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                className="rounded-lg border border-outline-variant px-4 py-2 font-label-caps text-label-caps transition-colors hover:border-primary"
              >
                ก่อนหน้า
              </button>
            )}
            {safePage < totalPages && (
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                className="rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                ถัดไป
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
