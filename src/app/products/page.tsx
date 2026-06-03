import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ProductsBrowser } from "@/components/products-browser";
import { CATEGORIES } from "@/lib/products";
import { getProducts } from "@/lib/queries";
import type { CategorySlug } from "@/lib/types";

export const metadata: Metadata = {
  title: "สินค้าทั้งหมด — Ryoko Tackle",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const products = await getProducts();
  const { category } = await searchParams;

  const initialCategory =
    category && CATEGORIES.some((c) => c.slug === category)
      ? (category as CategorySlug)
      : "all";

  return (
    <Container className="py-stack-lg">
      <header className="mb-section-gap text-center md:text-left">
        <h1 className="mb-stack-sm font-headline-lg text-headline-lg text-primary">
          สินค้าทั้งหมด
        </h1>
        <p className="max-w-2xl font-body-md text-body-md text-on-surface-variant">
          สัมผัสความประณีตระดับพรีเมียมจากญี่ปุ่นผ่านอุปกรณ์ตกปลา Ryoko
          ที่ถูกออกแบบมาเพื่อความแม่นยำและความทนทานสูงสุด
        </p>
      </header>

      <ProductsBrowser products={products} initialCategory={initialCategory} />
    </Container>
  );
}
