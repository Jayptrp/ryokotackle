import Link from "next/link";
import { CarouselManager } from "@/components/admin/carousel-manager";
import { Icon } from "@/components/icon";
import { getAllPublishedListItems, getCarouselSlides } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CarouselAdminPage() {
  const [slides, items] = await Promise.all([
    getCarouselSlides(),
    getAllPublishedListItems(),
  ]);

  // Only products with a primary image can back a slide.
  const products = items
    .filter((p) => p.primaryImage)
    .map((p) => ({
      id: p.id,
      label: p.nameTh ?? p.name,
      image: p.primaryImage as string,
    }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">แก้ไข carousel</h1>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1 font-label-caps text-label-caps text-secondary hover:underline"
        >
          <Icon name="open_in_new" className="text-base" />
          ดูหน้าแรก
        </Link>
      </div>
      <p className="mb-6 font-body-sm text-body-sm text-on-surface-variant">
        สไลด์ในแบนเนอร์หน้าแรก แต่ละสไลด์มีรูปพื้นหลัง พร้อมหัวข้อและคำบรรยาย
      </p>
      <CarouselManager initial={slides} products={products} />
    </div>
  );
}
