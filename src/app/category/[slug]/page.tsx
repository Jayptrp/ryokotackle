import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { ProductsFilters } from "@/components/products-filters";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import { JsonLd } from "@/components/json-ld";
import {
  DEFAULT_PAGE_SIZE,
  getBrands,
  getCategories,
  getCategoryBySlug,
  getProducts,
} from "@/lib/queries";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return { title: "ไม่พบหมวดหมู่", robots: { index: false, follow: false } };
  }
  const label = category.nameTh ?? category.name;
  const description = `เลือกซื้อ${label} คุณภาพสูงจาก ${SITE_NAME} — รวมอุปกรณ์ตกปลาหลากหลายแบรนด์ พร้อมจัดส่งทั่วประเทศ`;
  const canonical = `/category/${category.slug}`;
  return {
    title: label,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${label} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(canonical),
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const page = Math.max(1, Number(sp.page) || 1);
  const [brands, categories, { items, total }] = await Promise.all([
    getBrands(),
    getCategories(),
    getProducts({
      category: slug,
      brand: sp.brand,
      q: sp.q,
      sort: sp.sort === "newest" ? "newest" : "name",
      page,
    }),
  ]);

  const parent = category.parentSlug
    ? categories.find((c) => c.slug === category.parentSlug)
    : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "สินค้าทั้งหมด", url: absoluteUrl("/products") },
      ...(parent
        ? [{ name: parent.nameTh ?? parent.name, url: absoluteUrl(`/category/${parent.slug}`) }]
        : []),
      { name: category.nameTh ?? category.name, url: absoluteUrl(`/category/${category.slug}`) },
    ].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Container className="py-stack-lg">
      <JsonLd data={breadcrumbLd} />
      <div className="mb-stack-lg flex items-center gap-base opacity-60">
        <Link href="/products" className="font-label-caps text-label-caps">
          สินค้าทั้งหมด
        </Link>
        {parent && (
          <>
            <Icon name="chevron_right" className="text-[14px]" />
            <Link
              href={`/category/${parent.slug}`}
              className="font-label-caps text-label-caps"
            >
              {parent.nameTh ?? parent.name}
            </Link>
          </>
        )}
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="font-label-caps text-label-caps">{category.nameTh ?? category.name}</span>
      </div>

      <header className="mb-stack-lg flex items-center gap-3">
        {category.icon && (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-highest">
            <Icon name={category.icon} className="text-2xl text-primary" />
          </span>
        )}
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">
            {category.nameTh ?? category.name}
          </h1>
          {category.nameTh && category.nameTh !== category.name && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {category.name}
            </p>
          )}
        </div>
      </header>

      <ProductsFilters
        categories={categories}
        brands={brands}
        basePath={`/category/${slug}`}
        lockCategory
      />

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
          ยังไม่มีสินค้าในหมวดนี้
        </div>
      )}

      <Pagination
        basePath={`/category/${slug}`}
        searchParams={sp}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
        total={total}
      />
    </Container>
  );
}
