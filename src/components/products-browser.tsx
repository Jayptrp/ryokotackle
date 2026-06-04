"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { ProductCard } from "@/components/product-card";
import type { Brand, Category, ProductListItem } from "@/lib/types";

const PAGE_SIZE = 24;

/**
 * Loads-once, filters-in-browser catalog browser.
 *
 * The full published product set is passed in as a prop; category / brand /
 * search / sort / pagination all run client-side with no server round-trip,
 * so rapid filter clicks never hit the Worker. The active filters are mirrored
 * into the URL via history.replaceState (shallow) so links stay shareable
 * without triggering a navigation.
 */
export function ProductsBrowser({
  products,
  categories,
  brands,
  lockCategory,
  basePath = "/products",
}: {
  products: ProductListItem[];
  categories: Category[]; // flat, with parentSlug
  brands: Brand[];
  /** When set, the category chip row is hidden and results stay within it. */
  lockCategory?: string;
  basePath?: string;
}) {
  // Defaults render on the server (static HTML keeps the full grid for SEO).
  // Any deep-link filters in the URL are applied on the client after mount.
  const [category, setCategory] = useState(lockCategory ?? "all");
  const [brand, setBrand] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "newest">("name");
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!lockCategory && p.get("category")) setCategory(p.get("category")!);
    if (p.get("brand")) setBrand(p.get("brand")!);
    if (p.get("q")) setQ(p.get("q")!);
    if (p.get("sort") === "newest") setSort("newest");
    const pg = Number(p.get("page"));
    if (pg > 1) setPage(pg);
    setReady(true);
  }, [lockCategory]);

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parentSlug),
    [categories],
  );

  const descendantSlugs = useCallback(
    (slug: string) =>
      new Set([
        slug,
        ...categories.filter((c) => c.parentSlug === slug).map((c) => c.slug),
      ]),
    [categories],
  );

  const filtered = useMemo(() => {
    let list = products;
    if (!lockCategory && category && category !== "all") {
      const set = descendantSlugs(category);
      list = list.filter((p) => p.category && set.has(p.category.slug));
    }
    if (brand) list = list.filter((p) => p.brand?.slug === brand);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.nameTh ?? "").toLowerCase().includes(term),
      );
    }
    const sorted = [...list].sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.name.localeCompare(b.name),
    );
    return sorted;
  }, [products, category, brand, q, sort, lockCategory, descendantSlugs]);

  // Mirror state into the URL without navigating (keeps links shareable).
  // Gated on `ready` so it doesn't strip deep-link params before they're read.
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (!lockCategory && category && category !== "all")
      params.set("category", category);
    if (brand) params.set("brand", brand);
    if (q.trim()) params.set("q", q.trim());
    if (sort === "newest") params.set("sort", "newest");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${basePath}?${qs}` : basePath);
  }, [ready, category, brand, q, sort, page, lockCategory, basePath]);

  // Filter changes reset to page 1 (page changes themselves must not).
  const pickCategory = (v: string) => {
    setCategory(v);
    setPage(1);
  };
  const pickBrand = (v: string) => {
    setBrand(v);
    setPage(1);
  };
  const pickQuery = (v: string) => {
    setQ(v);
    setPage(1);
  };

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const pageList = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - current) <= 1,
  );
  const pagerCls =
    "flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 font-label-caps text-label-caps transition-all";

  return (
    <div>
      {/* Filters */}
      <div className="mb-stack-lg flex flex-col gap-stack-md">
        {!lockCategory && (
          <div className="flex flex-wrap items-center gap-stack-sm overflow-x-auto pb-2 no-scrollbar md:gap-stack-md">
            <button
              type="button"
              onClick={() => pickCategory("all")}
              className={cn(
                "whitespace-nowrap rounded-full border px-6 py-2 font-label-caps text-label-caps transition-all",
                category === "all"
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary",
              )}
            >
              ทั้งหมด
            </button>
            {topCategories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => pickCategory(c.slug)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-6 py-2 font-label-caps text-label-caps transition-all",
                  category === c.slug
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary",
                )}
              >
                {c.icon && <Icon name={c.icon} className="text-base" />}
                {c.nameTh ?? c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-stack-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <select
              value={brand}
              onChange={(e) => pickBrand(e.target.value)}
              className="w-full appearance-none rounded-lg border border-outline-variant bg-white py-2 pl-4 pr-10 font-body-sm text-on-surface outline-none transition-all focus:border-secondary focus:ring-1 focus:ring-secondary"
            >
              <option value="">ทุกแบรนด์ (All brands)</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
            <Icon
              name="expand_more"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => pickQuery(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-10 pr-4 font-body-sm outline-none transition-all focus:border-secondary focus:ring-1 focus:ring-secondary"
            />
          </div>
        </div>
      </div>

      <p className="mb-stack-md font-body-sm text-body-sm text-on-surface-variant">
        พบ {total.toLocaleString("th-TH")} รายการ
      </p>

      {pageItems.length > 0 ? (
        <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {pageItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low py-section-gap text-center font-body-md text-on-surface-variant">
          ไม่พบสินค้าที่ตรงกับเงื่อนไข
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-stack-lg flex items-center justify-center gap-stack-sm">
          {current > 1 && (
            <button
              type="button"
              onClick={() => setPage(current - 1)}
              aria-label="ก่อนหน้า"
              className={cn(pagerCls, "border-outline-variant hover:border-primary")}
            >
              <Icon name="chevron_left" className="text-lg" />
            </button>
          )}
          {pageList.map((p, i) => {
            const prev = pageList[i - 1];
            return (
              <span key={p} className="flex items-center gap-stack-sm">
                {prev && p - prev > 1 && (
                  <span className="px-1 text-on-surface-variant">…</span>
                )}
                <button
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    pagerCls,
                    p === current
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant hover:border-primary",
                  )}
                >
                  {p}
                </button>
              </span>
            );
          })}
          {current < totalPages && (
            <button
              type="button"
              onClick={() => setPage(current + 1)}
              aria-label="ถัดไป"
              className={cn(pagerCls, "border-outline-variant hover:border-primary")}
            >
              <Icon name="chevron_right" className="text-lg" />
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
