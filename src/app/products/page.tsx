import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ProductsFilters } from "@/components/products-filters";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import {
  DEFAULT_PAGE_SIZE,
  getBrands,
  getCategoryTree,
  getProducts,
} from "@/lib/queries";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "สินค้าทั้งหมด",
  description: `เลือกซื้ออุปกรณ์ตกปลาครบวงจรจาก ${SITE_NAME} — คันเบ็ด รอก เหยื่อปลอม เหยื่อจิ๊ก สายเอ็น PE กล่องอุปกรณ์ และอะไหล่ ครบทุกแบรนด์ในที่เดียว`,
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort === "newest" ? "newest" : "name";

  const [categories, brands, { items, total }] = await Promise.all([
    getCategoryTree(),
    getBrands(),
    getProducts({
      category: sp.category,
      brand: sp.brand,
      q: sp.q,
      sort,
      page,
    }),
  ]);

  return (
    <Container className="py-stack-lg">
      <header className="mb-stack-lg text-center md:text-left">
        <h1 className="mb-stack-sm font-headline-lg text-headline-lg text-primary">
          สินค้าทั้งหมด
        </h1>
        <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">
          แคตตาล็อกอุปกรณ์ตกปลา Ryoko และแบรนด์ในเครือ — คันเบ็ด รอก เหยื่อปลอม
          สายเอ็น และอุปกรณ์เสริมคุณภาพสูง
        </p>
      </header>

      <ProductsFilters categories={categories} brands={brands} />

      <p className="mb-stack-md font-body-sm text-body-sm text-on-surface-variant">
        พบ {total.toLocaleString("th-TH")} รายการ
      </p>

      {items.length > 0 ? (
        <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low py-section-gap text-center font-body-md text-on-surface-variant">
          ไม่พบสินค้าที่ตรงกับเงื่อนไข
        </div>
      )}

      <Pagination
        basePath="/products"
        searchParams={sp}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
        total={total}
      />
    </Container>
  );
}
