import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { BrandIcon } from "@/components/brand-icon";
import { ProductGallery } from "@/components/product-gallery";
import { ScrollToButton } from "@/components/scroll-to-button";
import { JsonLd } from "@/components/json-ld";
import {
  T,
  LocalizedName,
  LocalizedRichContent,
  ThaiOnly,
} from "@/components/i18n/localized";
import { getProductRichVariants, hasAnyVariant } from "@/lib/i18n/product-content";
import { CHANNEL_META } from "@/lib/channels";
import { getProductBySlug, getPublishedSlugs } from "@/lib/queries";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";
import { warrantyBadgeCls } from "@/lib/warranty-style";

/** Strip HTML tags + clamp to a meta-description-friendly length. */
function toMetaDescription(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Whether a rich-text field has real content. Tiptap stores an empty editor as
 * "<p></p>", so a plain truthy check isn't enough — treat empty/whitespace-only
 * markup as "no detail", but keep media-only content (images, tables) as real.
 */
function hasRichContent(html?: string | null): boolean {
  if (!html) return false;
  if (/<(img|table|ul|ol|h[1-6]|blockquote|pre|iframe|video)\b/i.test(html)) return true;
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().length > 0;
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
    (product.summary ? toMetaDescription(product.summary) : "") ||
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

  // Per-locale, pre-sanitized summary/description (Thai from DB, others from
  // JSON overrides). The client renderer picks the active locale, Thai fallback.
  const { summary: summaryVariants, description: descriptionVariants } =
    getProductRichVariants(product);

  const canonical = absoluteUrl(`/products/${product.slug}`);

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
      <JsonLd data={breadcrumbLd} />
      {/* Breadcrumb */}
      <div className="mb-stack-md flex flex-wrap items-center gap-base opacity-60">
        <Link href="/products" className="font-label-caps text-label-caps">
          <T k="nav.products" />
        </Link>
        {category && (
          <>
            <Icon name="chevron_right" className="text-[14px]" />
            <Link
              href={`/category/${category.slug}`}
              className="font-label-caps text-label-caps"
            >
              <LocalizedName th={category.nameTh} other={category.name} />
            </Link>
          </>
        )}
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="font-label-caps text-label-caps">
          <LocalizedName th={product.nameTh} other={product.name} />
        </span>
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
                  <LocalizedName th={category.nameTh} other={category.name} />
                </Link>
              )}
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary">
              <LocalizedName th={product.nameTh} other={product.name} />
            </h1>
            {product.name && product.name !== displayName && (
              <ThaiOnly>
                <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                  {product.name}
                </p>
              </ThaiOnly>
            )}

            {/* Warranty tags — fall back to a "contact us" chip when none assigned */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {product.warranties.length > 0 ? (
                product.warranties.map((w) => (
                  <Link
                    key={w.id}
                    href="/warranty"
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-label-caps text-label-caps transition-opacity hover:opacity-80 ${warrantyBadgeCls(w.color)}`}
                  >
                    <Icon name={w.icon} className="text-[14px]" />
                    {w.name}
                  </Link>
                ))
              ) : (
                <Link
                  href="/warranty"
                  className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-3 py-1 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                >
                  <Icon name="help" className="text-[14px]" />
                  <T k="detail.warrantyAsk" />
                </Link>
              )}
            </div>
            {hasAnyVariant(summaryVariants) && (
              <LocalizedRichContent
                variants={summaryVariants}
                className="mt-4 [&_p]:font-body-lg [&_p]:text-body-lg [&_p]:text-on-surface-variant"
              />
            )}

            {/* รายละเอียดสินค้า affordance — jump to the detail, or a contact
                note when the product has no rich description. */}
            <div className="mt-4">
              {hasRichContent(product.description) ? (
                <ScrollToButton
                  targetId="product-detail"
                  label={<T k="detail.viewDetails" />}
                />
              ) : (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  <T k="detail.contactForMore" />
                </p>
              )}
            </div>
          </div>

          {/* Purchase / contact channels */}
          {product.channels.length > 0 ? (
            <div className="flex flex-col gap-stack-md border-t border-outline-variant pt-stack-lg">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant">
                <T k="detail.orderChannels" />
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
                <T k="detail.interested" />
              </p>
              <Link
                href="/contact"
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-6 py-3 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                <Icon name="mail" className="text-lg" />
                <T k="detail.inquireOrder" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Full detail */}
      {hasRichContent(product.description) && (
        <div
          id="product-detail"
          className="mt-section-gap scroll-mt-24 border-t border-outline-variant pt-section-gap"
        >
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-stack-md flex items-center gap-2 font-headline-md text-headline-md text-primary">
              <span className="h-1 w-8 rounded-full bg-secondary" />
              <T k="detail.productDetails" />
            </h2>
            <LocalizedRichContent variants={descriptionVariants} />
          </div>
        </div>
      )}
    </Container>
  );
}
