"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { ProductCard } from "@/components/product-card";
import type { Category, ProductListItem } from "@/lib/types";

const PAGE_SIZE = 24;

/**
 * Loads-once, filters-in-browser catalog browser.
 *
 * The full published product set is passed in as a prop; category / subcategory /
 * search / sort / pagination all run client-side with no server round-trip,
 * so rapid filter clicks never hit the Worker. The active filters are mirrored
 * into the URL via history.replaceState (shallow) so links stay shareable
 * without triggering a navigation.
 */
export function ProductsBrowser({
  products,
  categories,
  lockCategory,
  basePath = "/products",
}: {
  products: ProductListItem[];
  categories: Category[]; // flat, with parentSlug
  /** When set, the category chip row is hidden and results stay within it. */
  lockCategory?: string;
  basePath?: string;
}) {
  // Defaults render on the server (static HTML keeps the full grid for SEO).
  // Any deep-link filters in the URL are applied on the client after mount.
  const [category, setCategory] = useState(lockCategory ?? "all");
  const [subcategory, setSubcategory] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "newest">("name");
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!lockCategory && p.get("category")) setCategory(p.get("category")!);
    if (p.get("subcategory")) setSubcategory(p.get("subcategory")!);
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

  // Products in the active category only (ignoring subcategory/search) — used to
  // derive which subcategories are actually available to filter by.
  const categoryProducts = useMemo(() => {
    if (lockCategory) {
      const set = descendantSlugs(lockCategory);
      return products.filter((p) => p.category && set.has(p.category.slug));
    }
    if (!category || category === "all") return products;
    const set = descendantSlugs(category);
    return products.filter((p) => p.category && set.has(p.category.slug));
  }, [products, category, lockCategory, descendantSlugs]);

  // Subcategories (categories with a parent) that actually have products in the
  // current category scope. When a top category is active, restrict to its children.
  const availableSubcategories = useMemo(() => {
    const slugsWithProducts = new Set(
      categoryProducts.map((p) => p.category?.slug).filter(Boolean),
    );
    const activeTop = lockCategory ?? (category !== "all" ? category : null);
    return categories.filter(
      (c) =>
        c.parentSlug &&
        slugsWithProducts.has(c.slug) &&
        (!activeTop || c.parentSlug === activeTop),
    );
  }, [categoryProducts, categories, category, lockCategory]);

  // Drop the subcategory filter if it isn't available in the chosen category.
  useEffect(() => {
    if (subcategory && !availableSubcategories.some((c) => c.slug === subcategory))
      setSubcategory("");
  }, [availableSubcategories, subcategory]);

  const filtered = useMemo(() => {
    let list = products;
    if (!lockCategory && category && category !== "all") {
      const set = descendantSlugs(category);
      list = list.filter((p) => p.category && set.has(p.category.slug));
    }
    if (subcategory) list = list.filter((p) => p.category?.slug === subcategory);
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
  }, [products, category, subcategory, q, sort, lockCategory, descendantSlugs]);

  // Mirror state into the URL without navigating (keeps links shareable).
  // Gated on `ready` so it doesn't strip deep-link params before they're read.
  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (!lockCategory && category && category !== "all")
      params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (q.trim()) params.set("q", q.trim());
    if (sort === "newest") params.set("sort", "newest");
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${basePath}?${qs}` : basePath);
  }, [ready, category, subcategory, q, sort, page, lockCategory, basePath]);

  // Filter changes reset to page 1 (page changes themselves must not).
  // Clicking the active category again clears it back to "all".
  const pickCategory = (v: string) => {
    setCategory((cur) => (cur === v ? "all" : v));
    setPage(1);
  };
  const pickSubcategory = (v: string) => {
    setSubcategory(v);
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
            {/* Uniform chips: identical font/size, only the colour changes. */}
            {[{ slug: "all", label: "ทั้งหมด" },
              ...topCategories.map((c) => ({ slug: c.slug, label: c.nameTh ?? c.name }))].map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => pickCategory(c.slug)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-5 py-2 font-label-caps text-label-caps transition-colors",
                  category === c.slug
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-primary",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-stack-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <select
              value={subcategory}
              onChange={(e) => pickSubcategory(e.target.value)}
              disabled={availableSubcategories.length === 0}
              className="w-full appearance-none rounded-lg border border-outline-variant bg-white py-2 pl-4 pr-10 font-body-sm text-on-surface outline-none transition-all focus:border-secondary focus:ring-1 focus:ring-secondary disabled:opacity-50"
            >
              <option value="">ทุกหมวดหมู่ย่อย</option>
              {availableSubcategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nameTh ?? c.name}
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
