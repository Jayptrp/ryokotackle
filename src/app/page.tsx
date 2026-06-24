import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import Image from "next/image";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductCard } from "@/components/product-card";
import { T, LocalizedName } from "@/components/i18n/localized";
import {
  getCarouselSlides,
  getCategoryCards,
  getFeaturedByCategory,
} from "@/lib/queries";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [slides, categories, featuredGroups] = await Promise.all([
    getCarouselSlides(),
    getCategoryCards(),
    getFeaturedByCategory(),
  ]);

  return (
    <>
      {/* SEO heading — the visual hero is image-led, so the page's single H1
          carries the brand + primary keywords for crawlers and screen readers. */}
      <h1 className="sr-only">
        Ryoko Tackle — ร้านอุปกรณ์ตกปลา คันเบ็ด รอก เหยื่อปลอม สายเอ็น PE
        และอุปกรณ์ตกปลาคุณภาพสูง
      </h1>

      {/* Hero: full-bleed (edge-to-edge, square corners) on mobile + tablet;
          contained with gutters + rounded corners from desktop (lg) up. */}
      <div className="pt-stack-md lg:mx-auto lg:w-full lg:max-w-[var(--container-max)] lg:px-margin-desktop">
        <HeroCarousel slides={slides} />
      </div>

      {/* Categories */}
      <section className="py-stack-lg md:py-section-gap">
        <Container>
          <div className="mb-stack-lg flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-primary">
              <T k="home.categories" />
            </h2>
            <Link
              href="/products"
              className="flex items-center gap-1 font-label-caps text-label-caps text-secondary transition-all hover:gap-2"
            >
              <T k="home.viewAll" /> <Icon name="arrow_forward" className="text-sm" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-stack-md sm:grid-cols-3 lg:grid-cols-4">
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
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" />
                )}
                {/* Name in a centered pill ("notch") at the bottom for readability */}
                <div className="relative mb-stack-md flex justify-center px-2">
                  <span className="rounded-full bg-primary/70 px-3 py-1 text-center font-body-md text-body-md font-medium text-on-primary backdrop-blur-sm transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                    <LocalizedName th={category.nameTh} other={category.name} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured — grouped by top-level category; each group shows an optional
          3:1 banner above its featured products. Only categories the admin has
          featured products in appear (see getFeaturedByCategory). */}
      {featuredGroups.length > 0 && (
        <section className="pb-stack-lg md:pb-section-gap">
          <Container>
            <div className="mb-stack-lg">
              <h2 className="font-headline-md text-headline-md text-primary">
                <T k="home.featured" />
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                <T k="home.featuredSubtitle" />
              </p>
            </div>

            <div className="flex flex-col gap-stack-lg md:gap-section-gap">
              {featuredGroups.map((group) => (
                <div key={group.slug}>
                  {/* 3:1 banner (only when the admin set one) */}
                  {group.bannerUrl && (
                    <Link
                      href={`/category/${group.slug}`}
                      className="relative mb-stack-md block aspect-[3/1] overflow-hidden rounded-xl border border-outline-variant transition-all hover:border-secondary hover:shadow-md"
                    >
                      <Image
                        src={group.bannerUrl}
                        alt={group.nameTh ?? group.name}
                        fill
                        sizes="(min-width: 1024px) 1200px, 100vw"
                        className="object-cover"
                        unoptimized
                      />
                    </Link>
                  )}

                  <div className="mb-stack-md flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm text-primary">
                      <LocalizedName th={group.nameTh} other={group.name} />
                    </h3>
                    <Link
                      href={`/category/${group.slug}`}
                      className="flex items-center gap-1 font-label-caps text-label-caps text-secondary transition-all hover:gap-2"
                    >
                      <T k="home.viewAll" /> <Icon name="arrow_forward" className="text-sm" />
                    </Link>
                  </div>

                  <div className="-mx-margin-mobile flex gap-stack-md overflow-x-auto px-margin-mobile pb-stack-md scroll-x-touch md:mx-0 md:px-0">
                    {group.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        className="w-44 flex-none sm:w-48"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

    </>
  );
}
