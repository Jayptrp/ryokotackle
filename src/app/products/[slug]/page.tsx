import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { BrandIcon } from "@/components/brand-icon";
import { ProductGallery } from "@/components/product-gallery";
import { RichContent } from "@/components/rich-content";
import { ScrollToButton } from "@/components/scroll-to-button";
import { JsonLd } from "@/components/json-ld";
import { CHANNEL_META } from "@/lib/channels";
import { getProductBySlug, getPublishedSlugs } from "@/lib/queries";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

/** Strip HTML tags + clamp to a meta-description-friendly length. */
function toMetaDescription(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Pre-render published products; revalidate on demand when admins edit.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "ไม่พบสินค้า", robots: { index: false, follow: false } };
  }

  // Thai-first: prefer the Thai name for all human-readable + SEO text; the
  // English `name` is kept only as an alternate alias below.
  const displayName = product.nameTh ?? product.name;

  // Title: "{Name} | {Category}" — keyword-rich but concise.
  const titleParts = [
    displayName,
    product.category ? `| ${product.category.nameTh ?? product.category.name}` : "",
  ].filter(Boolean);
  const title = titleParts.join(" ").trim();

  // Description: prefer the brief summary, fall back to the rich detail, then
  // a generated line that still carries the core keywords.
  const description =
    product.summary?.trim() ||
    (product.description ? toMetaDescription(product.description) : "") ||
    `${displayName} — ${
      product.category?.nameTh ?? product.category?.name ?? "อุปกรณ์ตกปลา"
    } คุณภาพสูงจาก ${SITE_NAME}`;

  const primaryImage =
    product.media.find((m) => m.type === "image" && m.isPrimary)?.url ??
    product.media.find((m) => m.type === "image")?.url;
  const canonical = `/products/${product.slug}`;

  return {
    title,
    description,
    keywords: [product.name, product.category?.name, product.nameTh]
      .filter(Boolean)
      .join(", "),
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${title} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(canonical),
      images: primaryImage ? [{ url: primaryImage, alt: displayName }] : undefined,
    },
    twitter: {
      card: primaryImage ? "summary_large_image" : "summary",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "published") notFound();

  const { category } = product;
  // Thai-first display name; English `name` shown only as a secondary alias.
  const displayName = product.nameTh ?? product.name;

  const productImages = product.media
    .filter((m) => m.type === "image")
    .map((m) => m.url);
  const canonical = absoluteUrl(`/products/${product.slug}`);

  // Product structured data — helps rich results in search.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayName,
    ...(product.name && product.name !== displayName
      ? { alternateName: product.name }
      : {}),
    ...(productImages.length ? { image: productImages } : {}),
    ...(product.summary ? { description: product.summary } : {}),
    ...(category
      ? { category: category.nameTh ?? category.name }
      : {}),
    url: canonical,
  };

  // Breadcrumb trail (catalog → category → product).
  const breadcrumbItems = [
    { name: "สินค้าทั้งหมด", url: absoluteUrl("/products") },
    ...(category
      ? [{ name: category.nameTh ?? category.name, url: absoluteUrl(`/category/${category.slug}`) }]
      : []),
    { name: displayName, url: canonical },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Container className="pb-section-gap pt-stack-md">
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      {/* Breadcrumb */}
      <div className="mb-stack-md flex flex-wrap items-center gap-base opacity-60">
        <Link href="/products" className="font-label-caps text-label-caps">
          สินค้าทั้งหมด
        </Link>
        {category && (
          <>
            <Icon name="chevron_right" className="text-[14px]" />
            <Link
              href={`/category/${category.slug}`}
              className="font-label-caps text-label-caps"
            >
              {category.nameTh ?? category.name}
            </Link>
          </>
        )}
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="font-label-caps text-label-caps">{displayName}</span>
      </div>

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
        <div className="md:col-span-7">
          <ProductGallery media={product.media} alt={displayName} />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-stack-lg md:col-span-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {category && (
                <Link
                  href={`/category/${category.slug}`}
                  className="font-label-caps text-label-caps text-secondary"
                >
                  {category.nameTh ?? category.name}
                </Link>
              )}
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary">
              {displayName}
            </h1>
            {product.name && product.name !== displayName && (
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                {product.name}
              </p>
            )}

            {/* Warranty tags — fall back to a "contact us" chip when none assigned */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {product.warranties.length > 0 ? (
                product.warranties.map((w) => (
                  <Link
                    key={w.id}
                    href="/warranty"
                    className="inline-flex items-center gap-1 rounded-full border border-secondary/40 bg-secondary-container/40 px-3 py-1 font-label-caps text-label-caps text-on-secondary-container transition-colors hover:bg-secondary-container"
                  >
                    <Icon name="verified_user" className="text-[14px]" />
                    {w.name}
                  </Link>
                ))
              ) : (
                <Link
                  href="/warranty"
                  className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon name="help" className="text-[14px]" />
                  สอบถามข้อมูลการรับประกัน
                </Link>
              )}
            </div>
            {product.summary && (
              <p className="mt-4 font-body-lg text-body-lg text-on-surface-variant">
                {product.summary}
              </p>
            )}
          </div>

          {/* Purchase / contact channels */}
          {product.channels.length > 0 ? (
            <div className="flex flex-col gap-stack-md border-t border-outline-variant pt-stack-lg">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">
                ช่องทางการสั่งซื้อ
              </h3>
              <div className="flex flex-wrap gap-stack-sm">
                {product.channels.map((ch) => {
                  const meta = CHANNEL_META[ch.channel];
                  return (
                    <a
                      key={ch.id}
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ backgroundColor: meta.color }}
                      className="group flex items-center gap-2 rounded-lg px-5 py-3 font-label-caps text-label-caps text-white shadow-sm transition-all hover:opacity-90"
                    >
                      <BrandIcon
                        name={ch.channel}
                        fallback={meta.icon}
                        className="text-xl transition-transform group-hover:scale-110"
                      />
                      {meta.label}
                    </a>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-stack-sm border-t border-outline-variant pt-stack-lg">
              <p className="font-body-md text-body-md text-on-surface-variant">
                สนใจสินค้าชิ้นนี้? ติดต่อทีมงานเพื่อสอบถามราคาและช่องทางการสั่งซื้อ
              </p>
              <Link
                href="/contact"
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-6 py-3 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                <Icon name="mail" className="text-lg" />
                สอบถาม / สั่งซื้อ
              </Link>
            </div>
          )}

          {product.description && (
            <ScrollToButton targetId="product-detail" label="ดูรายละเอียด" />
          )}
        </div>
      </div>

      {/* Full detail */}
      {product.description && (
        <div
          id="product-detail"
          className="mt-section-gap scroll-mt-24 border-t border-outline-variant pt-section-gap"
        >
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-stack-md flex items-center gap-2 font-headline-md text-headline-md text-primary">
              <span className="h-1 w-8 rounded-full bg-secondary" />
              รายละเอียดสินค้า
            </h2>
            <RichContent html={product.description} />
          </div>
        </div>
      )}
    </Container>
  );
}
