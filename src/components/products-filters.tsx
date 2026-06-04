"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import type { Brand, Category } from "@/lib/types";

export function ProductsFilters({
  categories,
  brands,
  basePath = "/products",
  lockCategory = false,
}: {
  categories: Category[];
  brands: Brand[];
  /** Where filter changes navigate to (e.g. "/products" or "/category/reels"). */
  basePath?: string;
  /** On category landing pages the category chip row is hidden. */
  lockCategory?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const activeCategory = params.get("category") ?? "all";
  const activeBrand = params.get("brand") ?? "";

  function navigate(next: URLSearchParams) {
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    navigate(next);
  }

  return (
    <div className="mb-stack-lg flex flex-col gap-stack-md">
      {!lockCategory && (
        <div className="flex flex-wrap items-center gap-stack-sm overflow-x-auto pb-2 no-scrollbar md:gap-stack-md">
          <button
            type="button"
            onClick={() => setParam("category", null)}
            className={cn(
              "whitespace-nowrap rounded-full border px-6 py-2 font-label-caps text-label-caps transition-all",
              activeCategory === "all"
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface-container-lowest hover:border-primary",
            )}
          >
            ทั้งหมด
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setParam("category", c.slug)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-6 py-2 font-label-caps text-label-caps transition-all",
                activeCategory === c.slug
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container-lowest hover:border-primary",
              )}
            >
              {c.icon && <Icon name={c.icon} className="text-base" />}
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-stack-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <select
            value={activeBrand}
            onChange={(e) => setParam("brand", e.target.value || null)}
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", q.trim() || null);
          }}
          className="relative w-full sm:max-w-xs"
        >
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-10 pr-4 font-body-sm outline-none transition-all focus:border-secondary focus:ring-1 focus:ring-secondary"
          />
        </form>
      </div>
    </div>
  );
}
