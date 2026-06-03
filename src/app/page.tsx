import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES } from "@/lib/products";
import { getProducts } from "@/lib/queries";

export default async function HomePage() {
  const products = await getProducts();
  const featured = products.slice(0, 4);

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
          <div className="flex flex-wrap gap-stack-md">
            {CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="group flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-6 py-3 transition-all hover:border-secondary"
              >
                <Icon
                  name={category.icon}
                  className="text-on-surface-variant group-hover:text-secondary"
                />
                <span className="font-label-caps text-label-caps">
                  {category.label}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured products */}
      <section className="pb-section-gap">
        <Container>
          <div className="mb-stack-lg flex flex-col justify-between gap-stack-md md:flex-row md:items-end">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary">
                สินค้าแนะนำ
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                อุปกรณ์ยอดนิยมที่นักตกปลาวางใจ
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-10 pr-4 font-body-sm outline-none transition-all focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          <div className="-mx-margin-mobile flex gap-stack-md overflow-x-auto px-margin-mobile pb-stack-md no-scrollbar md:mx-0 md:px-0">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-72 flex-none"
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Newsletter CTA */}
      <section className="mb-section-gap">
        <Container>
          <div className="flex flex-col items-center rounded-xl bg-primary-container p-stack-lg text-center md:p-16">
            <h2 className="font-headline-lg text-headline-lg text-on-primary">
              ร่วมเป็นส่วนหนึ่งของวิถีแห่ง Ryoko
            </h2>
            <p className="mt-stack-sm max-w-2xl font-body-lg text-body-lg text-on-primary/70">
              ติดตามข่าวสาร โปรโมชั่น และเทคนิคการตกปลาแบบมืออาชีพส่งตรงถึงอีเมลของคุณ
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
