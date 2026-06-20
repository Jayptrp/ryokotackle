import Link from "next/link";
import { WarrantyManager } from "@/components/admin/warranty-manager";
import { Icon } from "@/components/icon";
import { getWarranties, getWarrantyPage } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WarrantyAdminPage() {
  const [warranties, page] = await Promise.all([
    getWarranties(),
    getWarrantyPage(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">
          การรับประกันและการเคลมสินค้า
        </h1>
        <Link
          href="/warranty"
          target="_blank"
          className="flex items-center gap-1 font-label-caps text-label-caps text-secondary hover:underline"
        >
          <Icon name="open_in_new" className="text-base" />
          ดูหน้าการรับประกัน
        </Link>
      </div>
      <p className="mb-6 font-body-sm text-body-sm text-on-surface-variant">
        จัดการประเภทการรับประกัน และแก้ไขหัวข้อ/คำบรรยาย/รายละเอียดที่แสดงในหน้าการรับประกัน
      </p>
      <WarrantyManager initial={warranties} initialPage={page} />
    </div>
  );
}
