import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductCard } from "@/components/product-card";
import { getCategoryTree, getFeatured, getNewArrivals } from "@/lib/queries";

export default async function HomePage() {
  const [categories, featured, newArrivals] = await Promise.all([
    getCategoryTree(),
    getFeatured(8),
    getNewArrivals(8),
  ]);

  return (
    <>
      <HeroCarousel />

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
                className="group flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-stack-md text-center transition-all hover:border-secondary hover:shadow-sm"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-primary transition-colors group-hover:bg-secondary-container group-hover:text-on-secondary-container">
                  <Icon name={category.icon ?? "category"} className="text-2xl" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-label-caps text-label-caps font-medium">
                    {category.nameTh ?? category.name}
                  </span>
                  {category.nameTh && category.nameTh !== category.name && (
                    <span className="text-xs text-on-surface-variant">
                      {category.name}
                    </span>
                  )}
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
