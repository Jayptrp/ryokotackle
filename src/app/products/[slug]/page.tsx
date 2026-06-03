import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { ProductGallery } from "@/components/product-gallery";
import { CATEGORIES, SEED_PRODUCTS, formatTHB } from "@/lib/products";
import { getProductBySlug } from "@/lib/queries";

const PURCHASE_CHANNELS = [
  { label: "Shopee", icon: "shopping_bag", color: "#EE4D2D" },
  { label: "Lazada", icon: "local_mall", color: "#00008F" },
  { label: "TikTok", icon: "music_note", color: "#000000" },
  { label: "Facebook", icon: "social_leaderboard", color: "#1877F2" },
  { label: "LINE", icon: "chat_bubble", color: "#06C755" },
] as const;

export function generateStaticParams() {
  return SEED_PRODUCTS.map((p) => ({ slug: p.slug }));
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
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const categoryLabel =
    CATEGORIES.find((c) => c.slug === product.category)?.label ??
    product.category;
  const images = product.images ?? [product.image];
  const discount = product.compareAtPrice
    ? Math.round(
        ((product.compareAtPrice - product.price) / product.compareAtPrice) *
          100,
      )
    : 0;

  return (
    <Container className="py-stack-lg md:py-section-gap">
      {/* Breadcrumb */}
      <div className="mb-stack-lg flex items-center gap-base opacity-60">
        <Link href="/products" className="font-label-caps text-label-caps">
          สินค้าทั้งหมด
        </Link>
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="font-label-caps text-label-caps">{categoryLabel}</span>
        <Icon name="chevron_right" className="text-[14px]" />
        <span className="font-label-caps text-label-caps">{product.name}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
        <div className="md:col-span-7">
          <ProductGallery images={images} alt={product.name} />
        </div>

        {/* Product info */}
        <div className="flex flex-col gap-stack-lg md:col-span-5">
          <div>
            {product.badge && (
              <span className="mb-2 block font-label-caps text-label-caps text-secondary">
                {product.badge} | RYOKO PREMIUM
              </span>
            )}
            <h1 className="mb-4 font-headline-lg text-headline-lg text-primary">
              {product.name}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {product.tagline}
            </p>
          </div>

          <div className="flex items-center gap-stack-md border-y border-outline-variant py-4">
            <span className="font-headline-md text-headline-md text-primary">
              {formatTHB(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="font-body-md text-body-md text-outline line-through">
                {formatTHB(product.compareAtPrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-full bg-error-container px-3 py-1 font-label-caps text-label-caps text-on-error-container">
                ประหยัด {discount}%
              </span>
            )}
          </div>

          {/* Purchase channels */}
          <div className="flex flex-col gap-stack-md">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant">
              ช่องทางการซื้อ
            </h3>
            <div className="grid grid-cols-5 gap-stack-sm">
              {PURCHASE_CHANNELS.map((channel) => (
                <a
                  key={channel.label}
                  href="#"
                  aria-label={channel.label}
                  style={{ backgroundColor: channel.color }}
                  className="group flex aspect-square items-center justify-center rounded-lg text-white shadow-sm transition-all hover:opacity-90"
                >
                  <Icon
                    name={channel.icon}
                    className="text-[32px] transition-transform group-hover:scale-110"
                  />
                </a>
              ))}
            </div>
          </div>

          {/* Fast actions */}
          <div className="mt-stack-md flex flex-col gap-stack-sm">
            <button
              type="button"
              className="w-full rounded-lg bg-primary py-4 font-headline-sm text-headline-sm text-on-primary shadow-md transition-colors hover:bg-primary-container"
            >
              ซื้อทันที
            </button>
            <button
              type="button"
              className="w-full rounded-lg border border-secondary py-4 font-headline-sm text-headline-sm text-secondary transition-colors hover:bg-secondary-container/20"
            >
              เพิ่มลงรถเข็น
            </button>
          </div>
        </div>
      </div>

      {/* Full-width content */}
      <div className="mt-section-gap border-t border-outline-variant pt-section-gap">
        <div className="mx-auto flex max-w-4xl flex-col gap-section-gap">
          {/* Description */}
          <section>
            <h2 className="mb-stack-md flex items-center gap-2 font-headline-md text-headline-md text-primary">
              <span className="h-1 w-8 rounded-full bg-secondary" />
              รายละเอียดสินค้า
            </h2>
            <div className="flex flex-col gap-4 font-body-md text-body-md leading-relaxed text-on-surface-variant">
              {product.description.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Specifications */}
          <section>
            <h2 className="mb-stack-md flex items-center gap-2 font-headline-md text-headline-md text-primary">
              <span className="h-1 w-8 rounded-full bg-secondary" />
              ข้อมูลทางเทคนิค (Specifications)
            </h2>
            <div className="overflow-hidden rounded-xl border border-outline-variant shadow-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-secondary text-on-secondary">
                    <th className="border-r border-white/20 p-4 text-left font-label-caps text-label-caps">
                      คุณสมบัติ
                    </th>
                    <th className="p-4 text-left font-label-caps text-label-caps">
                      รายละเอียด
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {product.specs.map((spec, i) => (
                    <tr
                      key={spec.label}
                      className={
                        i < product.specs.length - 1
                          ? "border-b border-outline-variant"
                          : undefined
                      }
                    >
                      <td className="w-1/3 bg-surface-container-low p-4 font-body-md text-body-md font-medium text-on-surface">
                        {spec.label}
                      </td>
                      <td className="p-4 font-body-md text-body-md">
                        {spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Video */}
          {product.videoTitle && (
            <section>
              <h2 className="mb-stack-md flex items-center gap-2 font-headline-md text-headline-md text-primary">
                <span className="h-1 w-8 rounded-full bg-secondary" />
                วิดีโอรีวิวการใช้งาน
              </h2>
              <div className="group relative aspect-video cursor-pointer overflow-hidden rounded-xl bg-black shadow-xl">
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error text-white shadow-lg transition-transform group-hover:scale-110">
                    <Icon name="play_arrow" filled className="text-[48px]" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 z-10 font-body-md text-body-md text-white">
                  {product.videoTitle}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </Container>
  );
}
