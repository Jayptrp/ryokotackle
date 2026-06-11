import Link from "next/link";
import {
  FeaturedManager,
  type FeaturedRow,
} from "@/components/admin/featured-manager";
import { Icon } from "@/components/icon";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
function primaryImage(media: any[]): string | null {
  if (!media?.length) return null;
  const images = media
    .filter((m) => m.type === "image")
    .sort((a, b) => a.sort_order - b.sort_order);
  return (images.find((m) => m.is_primary) ?? images[0])?.url ?? null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default async function FeaturedAdminPage() {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, name_th, is_featured, media:product_media(url, type, is_primary, sort_order)",
    )
    .order("name");

  const rows: FeaturedRow[] = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    nameTh: p.name_th,
    isFeatured: p.is_featured,
    image: primaryImage((p as { media?: unknown[] }).media ?? []),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">แก้ไขสินค้าแนะนำ</h1>
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
        สินค้าที่ตั้งเป็น &quot;แนะนำ&quot; จะแสดงในส่วนสินค้าแนะนำบนหน้าแรกทั้งหมด (เฉพาะสินค้าที่เผยแพร่แล้ว)
      </p>
      <FeaturedManager initial={rows} />
    </div>
  );
}
