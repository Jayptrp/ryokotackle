import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { ProductGallery } from "@/components/product-gallery";
import { RichContent } from "@/components/rich-content";
import { CHANNEL_META } from "@/lib/channels";
import { getProductBySlug, getPublishedSlugs } from "@/lib/queries";

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
  return {
    title: product
      ? `${product.name} — Ryoko Tackle`
      : "ไม่พบสินค้า — Ryoko Tackle",
    description: product?.summary ?? undefined,
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

  const { category, brand } = product;

  return (
    <Container className="py-stack-lg md:py-section-gap">
      {/* Breadcrumb */}
      <div className="mb-stack-lg flex flex-wrap items-center gap-base opacity-60">
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
              {category.name}
            </Link>
          </>
        )}
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="font-label-caps text-label-caps">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
        <div className="md:col-span-7">
          <ProductGallery media={product.media} alt={product.name} />
        </div>

        {/* Info */}
        <div className="flex flex-col gap-stack-lg md:col-span-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {brand && (
                <Link
                  href={`/products?brand=${brand.slug}`}
                  className="rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-primary"
                >
                  {brand.name}
                </Link>
              )}
              {category && (
                <Link
                  href={`/category/${category.slug}`}
                  className="font-label-caps text-label-caps text-secondary"
                >
                  {category.name}
                </Link>
              )}
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary">
              {product.name}
            </h1>
            {product.nameTh && product.nameTh !== product.name && (
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                {product.nameTh}
              </p>
            )}
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
                      <Icon
                        name={meta.icon}
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
        </div>
      </div>

      {/* Full detail */}
      {product.description && (
        <div className="mt-section-gap border-t border-outline-variant pt-section-gap">
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
