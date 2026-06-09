import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBrands, getCategories } from "@/lib/queries";
import { saveProduct } from "@/app/admin/products/actions";
import { MediaManager } from "@/components/admin/media-manager";
import { ChannelManager } from "@/components/admin/channel-manager";
import { DescriptionForm } from "@/components/admin/description-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { Icon } from "@/components/icon";
import type { ProductMedia, ProductChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isNew = id === "new";

  const supabase = await createAdminClient();
  const [brands, categories] = await Promise.all([getBrands(), getCategories()]);

  // Fetch existing product if editing
  let product: {
    id: string; slug: string; name: string; name_th: string | null;
    summary: string | null; description: string | null;
    brand_id: string | null; category_id: string | null;
    status: string; is_featured: boolean;
    media: ProductMedia[]; channels: ProductChannel[];
  } | null = null;

  if (!isNew) {
    const { data } = await supabase
      .from("products")
      .select(
        "id, slug, name, name_th, summary, description, brand_id, category_id, status, is_featured, media:product_media(id, type, provider, url, alt, sort_order, is_primary), channels:product_channels(id, channel, url, sort_order)",
      )
      .eq("id", id)
      .maybeSingle();

    if (!data) notFound();

    const raw = data as typeof data & { media: never[]; channels: never[] };
    product = {
      ...raw,
      media: (raw.media ?? [])
        .sort((a: never, b: never) => (a as { sort_order: number }).sort_order - (b as { sort_order: number }).sort_order)
        .map((m: never) => {
          const mm = m as { id: string; type: string; provider: string | null; url: string; alt: string | null; sort_order: number; is_primary: boolean };
          return {
            id: mm.id,
            type: mm.type as "image" | "video",
            provider: mm.provider as never,
            url: mm.url,
            alt: mm.alt,
            sortOrder: mm.sort_order,
            isPrimary: mm.is_primary,
          } satisfies ProductMedia;
        }),
      channels: (raw.channels ?? [])
        .sort((a: never, b: never) => (a as { sort_order: number }).sort_order - (b as { sort_order: number }).sort_order)
        .map((c: never) => {
          const cc = c as { id: string; channel: string; url: string; sort_order: number };
          return {
            id: cc.id,
            channel: cc.channel as never,
            url: cc.url,
            sortOrder: cc.sort_order,
          } satisfies ProductChannel;
        }),
    };
  }

  const topCategories = categories.filter((c) => !c.parentSlug);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" className="text-base" />
          กลับ
        </Link>
        <span className="text-on-surface-variant">/</span>
        <h1 className="font-headline-md text-headline-md text-primary">
          {isNew ? "เพิ่มสินค้าใหม่" : product?.name ?? "แก้ไขสินค้า"}
        </h1>

        {!isNew && product && (
          <Link
            href={`/products/${product.slug}`}
            target="_blank"
            className="ml-auto flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            <Icon name="open_in_new" className="text-base" />
            ดูหน้าสินค้า
          </Link>
        )}
      </div>

      <form action={saveProduct} className="flex flex-col gap-6">
        {product && <input type="hidden" name="id" value={product.id} />}

        {/* Core fields */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="mb-4 font-headline-sm text-headline-sm text-primary">ข้อมูลพื้นฐาน</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                ชื่อสินค้า (EN) <span className="text-error">*</span>
              </label>
              <input
                name="name"
                required
                defaultValue={product?.name ?? ""}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="ชื่อสินค้าภาษาอังกฤษ"
              />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">ชื่อสินค้า (TH)</label>
              <input
                name="name_th"
                defaultValue={product?.name_th ?? ""}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="ชื่อสินค้าภาษาไทย (ถ้ามี)"
              />
            </div>

            {/* Brand */}
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">แบรนด์</label>
              <select
                name="brand_id"
                defaultValue={product?.brand_id ?? ""}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-primary"
              >
                <option value="">— เลือกแบรนด์ —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">หมวดหมู่</label>
              <select
                name="category_id"
                defaultValue={product?.category_id ?? ""}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-primary"
              >
                <option value="">— เลือกหมวดหมู่ —</option>
                {topCategories.map((cat) => (
                  <optgroup key={cat.slug} label={cat.nameTh ?? cat.name}>
                    <option value={cat.id}>{cat.nameTh ?? cat.name}</option>
                    {categories
                      .filter((c) => c.parentSlug === cat.slug)
                      .map((sub) => (
                        <option key={sub.id} value={sub.id}>— {sub.nameTh ?? sub.name}</option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">สถานะ</label>
              <select
                name="status"
                defaultValue={product?.status ?? "draft"}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-primary"
              >
                <option value="published">เผยแพร่</option>
                <option value="hidden">ซ่อน</option>
                <option value="draft">ร่าง</option>
              </select>
            </div>

            {/* Featured */}
            <div className="flex items-center gap-3 pt-6">
              <input
                type="hidden"
                name="is_featured"
                value="false"
              />
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  name="is_featured"
                  value="true"
                  defaultChecked={product?.is_featured ?? false}
                  className="h-4 w-4 rounded border-outline-variant accent-primary"
                />
                <span className="font-body-md text-body-md text-on-surface">
                  สินค้าแนะนำ (Featured)
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">คำอธิบายสั้น</h2>
          <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
            แสดงใต้ชื่อสินค้า ควรสั้นกระชับ (1–2 ประโยค)
          </p>
          <textarea
            name="summary"
            rows={2}
            defaultValue={product?.summary ?? ""}
            className="w-full rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none resize-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            placeholder="เช่น: รอกหยดน้ำระดับพรีเมียม สเปคญี่ปุ่นแท้ พร้อมระบบเบรก X-Drag"
          />
        </section>

        {/* Save button (core fields) */}
        <button
          type="submit"
          className="self-start rounded-lg bg-primary px-8 py-3 font-label-caps text-label-caps text-on-primary shadow-sm transition-colors hover:bg-primary-container"
        >
          {isNew ? "สร้างสินค้า" : "บันทึกข้อมูล"}
        </button>
      </form>

      {/* Non-form sections — shown only for existing products */}
      {!isNew && product && (
        <div className="mt-6 flex flex-col gap-6">
          {/* Media */}
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">รูปภาพ / วิดีโอ</h2>
            <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
              แสดงในหน้าสินค้าเป็นคาร์รูเซล
            </p>
            <MediaManager productId={product.id} initial={product.media} />
          </section>

          {/* Channels */}
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">ช่องทางการซื้อ</h2>
            <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
              หน้าสินค้าจะแสดงเฉพาะช่องทางที่ใส่ลิงก์ไว้
            </p>
            <ChannelManager
              productId={product.id}
              initial={product.channels.map((c) => ({
                channel: c.channel,
                url: c.url,
              }))}
            />
          </section>

          {/* Description (Tiptap) */}
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">รายละเอียดสินค้า</h2>
            <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
              รองรับตาราง spec, รูปภาพ, และการจัดรูปแบบข้อความ
            </p>
            <DescriptionForm productId={product.id} description={product.description} />
          </section>

          {/* Danger zone */}
          <section className="rounded-xl border border-error/30 bg-error-container/20 p-6">
            <h2 className="mb-1 font-headline-sm text-headline-sm text-error">Danger Zone</h2>
            <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
              การลบสินค้าไม่สามารถกู้คืนได้
            </p>
            <DeleteProductButton id={product.id} name={product.name} />
          </section>
        </div>
      )}
    </div>
  );
}
