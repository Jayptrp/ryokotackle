import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { ProductsBrowser } from "@/components/products-browser";
import { JsonLd } from "@/components/json-ld";
import {
  getAllPublishedListItems,
  getCategories,
  getCategoryBySlug,
} from "@/lib/queries";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

// Prerender every category page; filtering happens client-side.
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [categories, allProducts] = await Promise.all([
    getCategories(),
    getAllPublishedListItems(),
  ]);

  // This category plus its direct children (so a parent shows everything under it).
  const slugs = new Set([
    slug,
    ...categories.filter((c) => c.parentSlug === slug).map((c) => c.slug),
  ]);
  const products = allProducts.filter(
    (p) => p.category && slugs.has(p.category.slug),
  );

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

      {category.disclaimer && (
        <div className="mb-stack-lg flex gap-3 rounded-xl border border-secondary/30 bg-secondary-container/20 px-5 py-4">
          <span className="mt-0.5 flex-none text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 96 960 960" className="h-5 w-5 fill-current">
              <path d="M480 776q17 0 28.5-11.5T520 736v-200q0-17-11.5-28.5T480 496q-17 0-28.5 11.5T440 536v200q0 17 11.5 28.5T480 776Zm0-360q17 0 28.5-11.5T520 376q0-17-11.5-28.5T480 336q-17 0-28.5 11.5T440 376q0 17 11.5 28.5T480 416Zm0 560q-83 0-156-31.5T197 859q-54-54-85.5-127T80 576q0-83 31.5-156T197 293q54-54 127-85.5T480 176q83 0 156 31.5T763 293q54 54 85.5 127T880 576q0 83-31.5 156T763 859q-54 54-127 85.5T480 976Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
            </svg>
          </span>
          <p className="font-body-sm text-body-sm leading-relaxed text-on-surface">
            {category.disclaimer}
          </p>
        </div>
      )}

      <ProductsBrowser
        products={products}
        categories={categories}
        lockCategory={slug}
        basePath={`/category/${slug}`}
      />
    </Container>
  );
}
