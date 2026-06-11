import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import Image from "next/image";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductCard } from "@/components/product-card";
import {
  getCarouselSlides,
  getCategoryCards,
  getFeatured,
  getNewArrivals,
} from "@/lib/queries";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [slides, categories, featured, newArrivals] = await Promise.all([
    getCarouselSlides(),
    getCategoryCards(),
    getFeatured(),
    getNewArrivals(8),
  ]);

  return (
    <>
      {/* SEO heading — the visual hero is image-led, so the page's single H1
          carries the brand + primary keywords for crawlers and screen readers. */}
      <h1 className="sr-only">
        Ryoko Tackle — ร้านอุปกรณ์ตกปลา คันเบ็ด รอก เหยื่อปลอม สายเอ็น PE
        และอุปกรณ์ตกปลาคุณภาพสูง
      </h1>

      <Container className="pt-stack-md">
        <HeroCarousel slides={slides} />
      </Container>

      {/* Categories */}
      <section className="py-section-gap">
        <Container>
          <div className="mb-stack-lg flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-primary">
              หมวดหมู่สินค้า
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 font-label-caps text-label-caps text-secondary transition-all hover:gap-2"
            >
              ดูทั้งหมด <Icon name="arrow_forward" className="text-sm" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-stack-md sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-xl border border-outline-variant bg-primary-container transition-all hover:border-secondary hover:shadow-md active:scale-[0.98]"
              >
                {/* Background image (uploaded → product → auto-pick) or gradient fallback */}
                {category.backgroundImage ? (
                  <Image
                    src={category.backgroundImage}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" />
                )}
                {/* Readability scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/25 to-transparent" />

                {/* Footer: icon down on the left, beside the name */}
                <div className="relative flex items-center gap-2 p-stack-md">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                    <Icon name={category.icon ?? "category"} className="text-xl" />
                  </span>
                  <span className="font-body-md text-body-md font-medium text-on-primary">
                    {category.nameTh ?? category.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="pb-section-gap">
          <Container>
            <div className="mb-stack-lg">
              <h2 className="font-headline-md text-headline-md text-primary">
                สินค้าแนะนำ
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                อุปกรณ์ที่ทีมงานคัดสรร
              </p>
            </div>
            <div className="-mx-margin-mobile flex gap-stack-md overflow-x-auto px-margin-mobile pb-stack-md no-scrollbar md:mx-0 md:px-0">
              {featured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  className="w-64 flex-none"
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="pb-section-gap">
          <Container>
            <div className="mb-stack-lg flex items-end justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">
                  มาใหม่
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  สินค้าล่าสุดในแคตตาล็อก
                </p>
              </div>
              <Link
                href="/products?sort=newest"
                className="flex items-center gap-1 font-label-caps text-label-caps text-secondary transition-all hover:gap-2"
              >
                ดูทั้งหมด <Icon name="arrow_forward" className="text-sm" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-gutter sm:grid-cols-3 lg:grid-cols-4">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="mb-section-gap">
        <Container>
          <div className="flex flex-col items-center rounded-xl bg-primary-container p-stack-lg text-center md:p-16">
            <h2 className="font-headline-lg text-headline-lg text-on-primary">
              ร่วมเป็นส่วนหนึ่งของวิถีแห่ง Ryoko
            </h2>
            <p className="mt-stack-sm max-w-2xl font-body-lg text-body-lg text-on-primary/70">
              ติดตามข่าวสาร สินค้าใหม่ และเทคนิคการตกปลาแบบมืออาชีพ
            </p>
            <form className="mt-stack-lg flex w-full max-w-lg flex-col gap-stack-sm md:flex-row">
              <input
                type="email"
                placeholder="อีเมลของคุณ"
                className="flex-grow rounded-lg border border-white/20 bg-white/10 px-6 py-4 text-white outline-none transition-all placeholder:text-white/50 focus:ring-1 focus:ring-secondary"
              />
              <button
                type="submit"
                className="rounded-lg bg-secondary px-8 py-4 font-label-caps text-label-caps text-on-secondary transition-all hover:bg-on-secondary-container"
              >
                สมัครสมาชิก
              </button>
            </form>
          </div>
        </Container>
      </section>
    </>
  );
}
