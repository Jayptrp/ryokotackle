"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES } from "@/lib/products";
import type { CategorySlug, Product } from "@/lib/types";

const PAGE_SIZE = 8;

const FILTERS: { slug: CategorySlug | "all"; label: string }[] = [
  { slug: "all", label: "ทั้งหมด" },
  ...CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
];

export function ProductsBrowser({
  products,
  initialCategory = "all",
}: {
  products: Product[];
  initialCategory?: CategorySlug | "all";
}) {
  const [active, setActive] = useState<CategorySlug | "all">(initialCategory);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () =>
      active === "all"
        ? products
        : products.filter((p) => p.category === active),
    [products, active],
  );

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  function selectFilter(slug: CategorySlug | "all") {
    setActive(slug);
    setVisible(PAGE_SIZE);
  }

  return (
    <>
      {/* Filter chips */}
      <section className="mb-stack-lg">
        <div className="flex flex-wrap items-center gap-stack-sm overflow-x-auto pb-4 no-scrollbar md:gap-stack-md">
          {FILTERS.map((filter) => (
            <button
              key={filter.slug}
              type="button"
              onClick={() => selectFilter(filter.slug)}
              className={cn(
                "whitespace-nowrap rounded-full border border-outline-variant px-6 py-2 font-label-caps text-label-caps transition-all hover:border-primary",
                active === filter.slug
                  ? "border-primary bg-primary text-on-primary"
                  : "bg-surface-container-lowest",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="mb-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>

      {/* Load more */}
      <section className="mt-stack-lg flex flex-col items-center justify-center border-t border-outline-variant py-stack-lg">
        {hasMore ? (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-lg border border-primary px-section-gap py-stack-md font-label-caps text-label-caps text-primary transition-all duration-300 hover:bg-primary hover:text-white"
          >
            ดูเพิ่มเติม (LOAD MORE)
          </button>
        ) : (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            คุณได้ดูสินค้าทั้งหมดแล้ว
          </p>
        )}
      </section>
    </>
  );
}
