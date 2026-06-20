"use client";

import Link from "next/link";
import { useState, useTransition, useRef } from "react";
import { saveProductAll } from "@/app/admin/products/actions";
import { CategorySelect } from "@/components/admin/category-select";
import { ProductNameField } from "@/components/admin/product-name-field";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { MediaManager, type PendingMedia } from "@/components/admin/media-manager";
import { ChannelManager, type ChannelRow } from "@/components/admin/channel-manager";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { Icon } from "@/components/icon";
import type { ProductMedia } from "@/lib/types";

interface CategoryOption {
  id: string;
  slug: string;
  label: string;
  parentSlug: string | null;
}

interface ProductData {
  id: string;
  slug: string;
  name: string;
  nameTh: string | null;
  summary: string | null;
  description: string | null;
  categoryId: string | null;
  status: string;
  isFeatured: boolean;
  media: ProductMedia[];
  channels: ChannelRow[];
  warrantyIds: string[];
}

interface WarrantyOption {
  id: string;
  name: string;
}

interface Props {
  isNew: boolean;
  pageError?: string;
  product: ProductData | null;
  categories: CategoryOption[];
  warranties: WarrantyOption[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function isMediaDirty(items: PendingMedia[], original: ProductMedia[]): boolean {
  if (items.some((m) => m.isNew || m.isDeleted)) return true;
  const visible = items.filter((m) => !m.isDeleted);
  if (visible.length !== original.length) return true;
  return visible.some((m, i) => m.id !== (original[i]?.id ?? ""));
}

function isChannelsEqual(a: ChannelRow[], b: ChannelRow[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => r.channel === b[i].channel && r.url === b[i].url);
}

function isSetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((x) => set.has(x));
}

/** Red border + ring when a field has been modified. */
function inputCls(dirty: boolean) {
  return dirty
    ? "border-error/60 ring-1 ring-error/20 focus:border-error/60 focus:ring-error/20"
    : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20";
}

// ── SectionBlock ─────────────────────────────────────────────────────────────

function SectionBlock({
  title,
  subtitle,
  isDirty,
  onRevert,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  isDirty: boolean;
  onRevert: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border bg-surface-container-lowest p-6 shadow-sm transition-colors ${
        isDirty ? "border-error/50" : "border-outline-variant"
      } ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>
          )}
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={onRevert}
            title="คืนค่าเดิม"
            className="flex flex-none items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1.5 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
          >
            <Icon name="restart_alt" className="text-base" />
            คืนค่า
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

// ── ProductEditor ─────────────────────────────────────────────────────────────

export function ProductEditor({ isNew, pageError, product, categories, warranties }: Props) {
  const [isPending, startTransition] = useTransition();

  // ── controlled field state ────────────────────────────────────────────────
  const [name, setName] = useState(product?.name ?? "");
  const [nameTh, setNameTh] = useState(product?.nameTh ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(product?.categoryId ?? null);
  const [status, setStatus] = useState(product?.status ?? "draft");
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [description, setDescription] = useState(product?.description ?? "");

  const initialChannels: ChannelRow[] =
    (product?.channels ?? []).length > 0
      ? product!.channels
      : [{ channel: "shopee" as const, url: "" }];

  const [mediaItems, setMediaItems] = useState<PendingMedia[]>(product?.media ?? []);
  const [channels, setChannels] = useState<ChannelRow[]>(initialChannels);
  const [warrantyIds, setWarrantyIds] = useState<string[]>(product?.warrantyIds ?? []);

  // Keys to force-remount components that manage their own internal state
  const [nameKey, setNameKey] = useState(0);
  const [categoryKey, setCategoryKey] = useState(0);
  const [descriptionKey, setDescriptionKey] = useState(0);

  // ── original values (never mutated after init) ────────────────────────────
  const orig = useRef({
    name: product?.name ?? "",
    nameTh: product?.nameTh ?? "",
    categoryId: product?.categoryId ?? null,
    status: product?.status ?? "draft",
    isFeatured: product?.isFeatured ?? false,
    summary: product?.summary ?? "",
    description: product?.description ?? "",
    media: product?.media ?? [] as ProductMedia[],
    channels: initialChannels,
    warrantyIds: product?.warrantyIds ?? [],
  });

  // ── per-section dirty flags (computed, no useState needed) ────────────────
  const d = {
    name: name !== orig.current.name,
    nameTh: nameTh !== (orig.current.nameTh ?? ""),
    category: categoryId !== orig.current.categoryId,
    status: status !== orig.current.status,
    isFeatured: isFeatured !== orig.current.isFeatured,
    summary: summary !== (orig.current.summary ?? ""),
    description: description !== (orig.current.description ?? ""),
    media: isMediaDirty(mediaItems, orig.current.media),
    channels: !isChannelsEqual(channels, orig.current.channels),
    warranties: !isSetEqual(warrantyIds, orig.current.warrantyIds),
  };

  const sectionDirty = {
    media: d.media,
    core: d.name || d.nameTh || d.category || d.status || d.isFeatured,
    summary: d.summary,
    channels: d.channels,
    description: d.description,
    warranties: d.warranties,
  };

  const isDirty = Object.values(sectionDirty).some(Boolean);

  // ── revert handlers ───────────────────────────────────────────────────────
  function revertMedia() {
    setMediaItems(orig.current.media);
  }
  function revertCore() {
    setName(orig.current.name);
    setNameTh(orig.current.nameTh ?? "");
    setCategoryId(orig.current.categoryId);
    setStatus(orig.current.status);
    setIsFeatured(orig.current.isFeatured);
    setNameKey((k) => k + 1);
    setCategoryKey((k) => k + 1);
  }
  function revertSummary() {
    setSummary(orig.current.summary ?? "");
  }
  function revertChannels() {
    setChannels(orig.current.channels);
  }
  function revertWarranties() {
    setWarrantyIds(orig.current.warrantyIds);
  }
  function toggleWarranty(id: string) {
    setWarrantyIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }
  function revertDescription() {
    setDescription(orig.current.description ?? "");
    setDescriptionKey((k) => k + 1); // remount Tiptap with original content
  }

  // ── form submit ───────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("media_current", JSON.stringify(mediaItems.filter((m) => !m.isDeleted)));
    fd.set(
      "media_deleted",
      JSON.stringify(
        mediaItems.filter((m) => m.isDeleted && !m.isNew).map((m) => ({ id: m.id, url: m.url })),
      ),
    );
    fd.set("channels_json", JSON.stringify(channels));
    fd.set("warranties_json", JSON.stringify(warrantyIds));
    startTransition(async () => { await saveProductAll(fd); });
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-primary"
        >
          <Icon name="arrow_back" className="text-base" />
          กลับ
        </Link>
        <span className="text-on-surface-variant">/</span>
        <h1 className="font-headline-md text-headline-md text-primary">
          {isNew ? "เพิ่มสินค้าใหม่" : (product?.name ?? "แก้ไขสินค้า")}
        </h1>

        <div className="ml-auto flex items-center gap-3">
          {isDirty && !isPending && (
            <span className="font-body-sm text-body-sm text-error">มีการแก้ไข</span>
          )}
          <button
            type="submit"
            form="product-form"
            disabled={!isDirty || isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <Icon name="hourglass_top" className="animate-spin text-base" />
            ) : (
              <Icon name="save" className="text-base" />
            )}
            {isPending ? "กำลังบันทึก..." : isNew ? "สร้างสินค้า" : "บันทึกข้อมูล"}
          </button>

          {!isNew && product && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              className="flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              <Icon name="open_in_new" className="text-base" />
              ดูหน้าสินค้า
            </Link>
          )}
        </div>
      </div>

      {pageError === "duplicate-name" && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/40 bg-error-container/30 px-4 py-3 font-body-sm text-body-sm text-on-error-container">
          <Icon name="error" className="text-lg text-error" />
          มีสินค้าชื่อนี้อยู่แล้ว — กรุณาใช้ชื่ออื่น
        </div>
      )}

      <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        {product && <input type="hidden" name="id" value={product.id} />}

        {/* ── รูปภาพ / วิดีโอ ──────────────────────────── */}
        {!isNew && product && (
          <SectionBlock
            title="รูปภาพ / วิดีโอ"
            subtitle="แสดงในหน้าสินค้าเป็นคาร์รูเซล — บันทึกเมื่อกดบันทึกข้อมูล"
            isDirty={sectionDirty.media}
            onRevert={revertMedia}
          >
            <MediaManager
              productId={product.id}
              items={mediaItems}
              onItemsChange={setMediaItems}
            />
          </SectionBlock>
        )}

        {/* ── ข้อมูลพื้นฐาน ─────────────────────────────── */}
        <SectionBlock title="ข้อมูลพื้นฐาน" isDirty={sectionDirty.core} onRevert={revertCore}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ProductNameField
              key={`name-${nameKey}`}
              defaultValue={orig.current.name}
              excludeId={product?.id}
              onValueChange={setName}
              modified={d.name}
            />

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                ชื่อสินค้า (TH)
              </label>
              <input
                name="name_th"
                value={nameTh}
                onChange={(e) => setNameTh(e.target.value)}
                className={`rounded-lg border bg-white px-4 py-3 font-body-md text-body-md outline-none ${inputCls(d.nameTh)}`}
                placeholder="ชื่อสินค้าภาษาไทย (ถ้ามี)"
              />
            </div>

            <CategorySelect
              key={`cat-${categoryKey}`}
              categories={categories}
              defaultCategoryId={orig.current.categoryId}
              onCategoryChange={setCategoryId}
            />

            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                สถานะ
              </label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`rounded-lg border bg-white px-4 py-3 font-body-md text-body-md outline-none ${inputCls(d.status)}`}
              >
                <option value="published">เผยแพร่</option>
                <option value="hidden">ซ่อน</option>
                <option value="draft">ร่าง</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <input type="hidden" name="is_featured" value="false" />
              <label className={`flex cursor-pointer items-center gap-2 ${d.isFeatured ? "text-error" : ""}`}>
                <input
                  type="checkbox"
                  name="is_featured"
                  value="true"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-outline-variant accent-primary"
                />
                <span className="font-body-md text-body-md text-on-surface">
                  สินค้าแนะนำ (Featured)
                  {d.isFeatured && <span className="ml-1 text-error">•</span>}
                </span>
              </label>
            </div>
          </div>
        </SectionBlock>

        {/* ── คำอธิบายสั้น + ช่องทางการสั่งซื้อ ──────── */}
        <div className={`grid grid-cols-1 gap-6 ${!isNew && product ? "md:grid-cols-2" : ""}`}>
          <SectionBlock
            title="คำอธิบายสั้น"
            subtitle="แสดงใต้ชื่อสินค้า ควรสั้นกระชับ (1–2 ประโยค)"
            isDirty={sectionDirty.summary}
            onRevert={revertSummary}
          >
            <textarea
              name="summary"
              rows={5}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={`w-full resize-none rounded-lg border bg-white px-4 py-3 font-body-md text-body-md outline-none ${inputCls(d.summary)}`}
              placeholder="เช่น: รอกหยดน้ำระดับพรีเมียม สเปคญี่ปุ่นแท้ พร้อมระบบเบรก X-Drag"
            />
          </SectionBlock>

          {!isNew && product && (
            <SectionBlock
              title="ช่องทางการสั่งซื้อ"
              subtitle="หน้าสินค้าจะแสดงเฉพาะช่องทางที่ใส่ลิงก์ไว้"
              isDirty={sectionDirty.channels}
              onRevert={revertChannels}
            >
              <ChannelManager
                rows={channels}
                onRowsChange={setChannels}
              />
            </SectionBlock>
          )}
        </div>

        {/* ── การรับประกัน ──────────────────────────────── */}
        {!isNew && product && (
          <SectionBlock
            title="การรับประกัน"
            subtitle="เลือกประเภทการรับประกันของสินค้านี้ — แสดงเป็นแท็กในหน้าสินค้า (ถ้าไม่เลือกจะแสดงให้ติดต่อสอบถาม)"
            isDirty={sectionDirty.warranties}
            onRevert={revertWarranties}
          >
            {warranties.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                ยังไม่มีประเภทการรับประกัน —{" "}
                <Link href="/admin/warranty" className="text-primary hover:underline">
                  เพิ่มได้ที่หน้าการรับประกัน
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {warranties.map((w) => {
                  const selected = warrantyIds.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWarranty(w.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-label-caps text-label-caps transition-colors ${
                        selected
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Icon name={selected ? "check" : "add"} className="text-base" />
                      {w.name}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionBlock>
        )}

        {/* ── รายละเอียดสินค้า ──────────────────────────── */}
        {!isNew && product && (
          <SectionBlock
            title="รายละเอียดสินค้า"
            subtitle="รองรับตาราง spec, รูปภาพ, และการจัดรูปแบบข้อความ"
            isDirty={sectionDirty.description}
            onRevert={revertDescription}
          >
            <TiptapEditor
              key={`desc-${descriptionKey}`}
              name="description"
              defaultValue={orig.current.description || ""}
              productId={product.id}
              onUpdate={setDescription}
            />
          </SectionBlock>
        )}
      </form>

      {/* ── Danger zone ───────────────────────────────── */}
      {!isNew && product && (
        <section className="mt-6 rounded-xl border border-error/30 bg-error-container/20 p-6">
          <h2 className="mb-1 font-headline-sm text-headline-sm text-error">Danger Zone</h2>
          <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
            การลบสินค้าไม่สามารถกู้คืนได้
          </p>
          <DeleteProductButton id={product.id} name={product.name} />
        </section>
      )}
    </div>
  );
}
