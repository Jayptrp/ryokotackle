import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ProductsBrowser } from "@/components/products-browser";
import { getAllPublishedListItems, getBrands, getCategories } from "@/lib/queries";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "สินค้าทั้งหมด",
  description: `เลือกซื้ออุปกรณ์ตกปลาครบวงจรจาก ${SITE_NAME} — คันเบ็ด รอก เหยื่อปลอม เหยื่อจิ๊ก สายเอ็น PE กล่องอุปกรณ์ และอะไหล่ ครบทุกแบรนด์ในที่เดียว`,
  alternates: { canonical: "/products" },
};

// Static: the catalog is loaded once and filtered in the browser, so there is
// no per-request server work. Revalidated on demand when admins edit products.
export default async function ProductsPage() {
  const [categories, products, brands] = await Promise.all([
    getCategories(),
    getAllPublishedListItems(),
    getBrands(),
  ]);

  return (
    <Container className="py-stack-lg">
      <header className="mb-stack-lg text-center md:text-left">
        <h1 className="mb-stack-sm font-headline-lg text-headline-lg text-primary">
          สินค้าทั้งหมด
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant md:whitespace-nowrap">
          แคตตาล็อกอุปกรณ์ตกปลา Ryoko และแบรนด์ในเครือ — คันเบ็ด รอก เหยื่อปลอม
          สายเอ็น และอุปกรณ์เสริมคุณภาพสูง
        </p>
      </header>

      <ProductsBrowser products={products} categories={categories} brands={brands} />
    </Container>
  );
}
