"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { saveCarousel } from "@/app/admin/home/actions";
import { Icon } from "@/components/icon";
import { ProductImagePicker, ProductTextCombobox } from "./product-combobox";
import { compressImage } from "@/lib/compress-image";
import type { CarouselSlide } from "@/lib/types";

export interface ProductOption {
  id: string;
  label: string;
  image: string;
}

/** Editable slide: existing slides keep their DB `id`; new ones have `id: null`
 *  and a temporary `key`. Nothing is persisted until "บันทึก". */
interface EditSlide {
  key: string;
  id: string | null;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  productId: string | null;
  linkProductId: string | null;
}

function toEdit(s: CarouselSlide): EditSlide {
  return {
    key: s.id,
    id: s.id,
    imageUrl: s.imageUrl,
    title: s.title,
    subtitle: s.subtitle,
    productId: s.productId,
    linkProductId: s.linkProductId,
  };
}

/** Hero banners are a fixed 3:1 aspect ratio. Read an uploaded file's natural
 *  aspect so we can warn when it's far from 3:1 (it would get cropped). */
function readImageAspect(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(3);
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalHeight ? img.naturalWidth / img.naturalHeight : 3);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(3);
    };
    img.src = url;
  });
}

export function CarouselManager({
  initial,
  products,
}: {
  initial: CarouselSlide[];
  products: ProductOption[];
}) {
  const [slides, setSlides] = useState<EditSlide[]>(() => initial.map(toEdit));
  const [orig, setOrig] = useState<EditSlide[]>(() => initial.map(toEdit));
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pickProduct, setPickProduct] = useState("");
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── dirty tracking (computed from `orig`, never mutated until save) ─────────
  const origById = useMemo(() => {
    const m = new Map<string, EditSlide>();
    for (const s of orig) if (s.id) m.set(s.id, s);
    return m;
  }, [orig]);

  function slideDirty(s: EditSlide): boolean {
    if (!s.id) return true; // newly added, not yet saved
    const o = origById.get(s.id);
    if (!o) return true;
    return o.title !== s.title || o.linkProductId !== s.linkProductId;
  }

  const orderChanged = useMemo(() => {
    const origRemaining = orig
      .map((s) => s.id)
      .filter((id): id is string => !!id && !deletedIds.includes(id));
    const existingNow = slides
      .map((s) => s.id)
      .filter((id): id is string => !!id);
    if (existingNow.length !== origRemaining.length) return true;
    return existingNow.some((id, i) => id !== origRemaining[i]);
  }, [slides, orig, deletedIds]);

  const dirty =
    deletedIds.length > 0 || orderChanged || slides.some(slideDirty);

  // ── add (deferred — staged in local state, no DB write) ─────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setAspectWarning(null);
    const offRatio: string[] = [];
    for (const file of files) {
      const ratio = await readImageAspect(file);
      // 3:1 target; flag anything outside ~2.7:1–3.3:1.
      if (Math.abs(ratio - 3) > 0.3) offRatio.push(`${file.name} (${ratio.toFixed(2)}:1)`);
      const upload = await compressImage(file);
      const fd = new FormData();
      fd.set("file", upload);
      fd.set("productId", "home");
      fd.set("folder", "carousel");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setSlides((prev) => [
          ...prev,
          {
            key: crypto.randomUUID(),
            id: null,
            imageUrl: url,
            title: null,
            subtitle: null,
            productId: null,
            linkProductId: null,
          },
        ]);
      }
    }
    setUploading(false);
    if (offRatio.length) {
      setAspectWarning(
        `รูปต่อไปนี้อัตราส่วนไม่ใกล้ 3:1 อาจถูกตัดบนแบนเนอร์: ${offRatio.join(", ")}`,
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleAddProduct() {
    const product = products.find((p) => p.id === pickProduct);
    if (!product) return;
    setSlides((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        id: null,
        imageUrl: product.image,
        title: product.label,
        subtitle: "",
        productId: product.id,
        linkProductId: product.id,
      },
    ]);
    setPickProduct("");
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const next = [...slides];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setSlides(next);
  }

  function handleTitle(key: string, value: string) {
    setSlides((prev) =>
      prev.map((s) => (s.key === key ? { ...s, title: value } : s)),
    );
  }

  function handleLinkChange(key: string, linkProductId: string) {
    setSlides((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, linkProductId: linkProductId || null } : s,
      ),
    );
  }

  function handleDelete(slide: EditSlide) {
    setSlides((prev) => prev.filter((s) => s.key !== slide.key));
    if (slide.id) setDeletedIds((prev) => [...prev, slide.id!]);
    // A new uploaded slide removed before save leaves an orphaned Storage object,
    // which the periodic orphan scan reclaims.
  }

  function handleRevertAll() {
    setSlides(orig.map((s) => ({ ...s })));
    setDeletedIds([]);
  }

  function handleSaveAll() {
    startSaving(async () => {
      const fresh = await saveCarousel({
        slides: slides.map((s) => ({
          id: s.id,
          imageUrl: s.imageUrl,
          title: s.title,
          subtitle: s.subtitle,
          productId: s.productId,
          linkProductId: s.linkProductId,
        })),
        deletedIds,
      });
      const edits = fresh.map(toEdit);
      setOrig(edits);
      setSlides(edits);
      setDeletedIds([]);
    });
  }

  return (
    <div>
      {/* Save-all bar */}
      <div className="mb-4 flex items-center justify-end gap-3">
        {dirty && !saving && (
          <>
            <span className="font-body-sm text-body-sm text-error">
              มีการเปลี่ยนแปลงที่ยังไม่บันทึก
            </span>
            <button
              type="button"
              onClick={handleRevertAll}
              title="คืนค่าเดิม"
              className="flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-2 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
            >
              <Icon name="restart_alt" className="text-base" />
              คืนค่า
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving || !dirty}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          <Icon
            name={saving ? "hourglass_top" : "save"}
            className={saving ? "animate-spin text-base" : "text-base"}
          />
          {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="slides">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="mb-4 flex flex-col gap-4"
            >
              {slides.map((slide, index) => {
                const itemDirty = slideDirty(slide);
                return (
                  <Draggable key={slide.key} draggableId={slide.key} index={index}>
                    {(drag) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`flex gap-4 rounded-xl border bg-surface-container-lowest p-4 transition-colors ${
                          itemDirty ? "border-error/50" : "border-outline-variant"
                        }`}
                      >
                        <div
                          {...drag.dragHandleProps}
                          className="flex cursor-grab items-center text-on-surface-variant"
                          aria-label="ลากเพื่อจัดลำดับ"
                        >
                          <Icon name="drag_indicator" />
                        </div>
                        <div className="relative h-24 w-40 flex-none overflow-hidden rounded-lg bg-surface-container">
                          <Image
                            src={slide.imageUrl}
                            alt={slide.title ?? ""}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          {slide.productId && (
                            <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-primary/90 px-1.5 py-0.5 font-label-caps text-label-caps text-on-primary">
                              <Icon name="inventory_2" className="text-xs" />
                              สินค้า
                            </span>
                          )}
                          {!slide.id && (
                            <span className="absolute right-1 top-1 flex items-center gap-1 rounded bg-error/90 px-1.5 py-0.5 font-label-caps text-label-caps text-on-primary">
                              ใหม่
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          {slide.productId ? (
                            <div className="flex min-w-0 flex-col gap-1">
                              <span className="font-label-caps text-label-caps text-on-surface-variant">
                                คำอธิบายรูป (ใช้ชื่อสินค้า — แก้ไขไม่ได้)
                              </span>
                              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
                                <Icon name="lock" className="flex-none text-base" />
                                <span className="truncate">{slide.title}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-w-0 flex-col gap-1">
                              <label className="font-label-caps text-label-caps text-on-surface-variant">
                                Alt text / คำอธิบายรูปภาพ
                              </label>
                              <input
                                value={slide.title ?? ""}
                                onChange={(e) => handleTitle(slide.key, e.target.value)}
                                placeholder="เช่น โปรโมชั่นรอกรุ่นใหม่ ลด 20%"
                                className="w-full min-w-0 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
                              />
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                คำอธิบายสำหรับ screen reader และ SEO (ไม่แสดงบนหน้าเว็บ) — แนะนำให้ใส่
                              </span>
                            </div>
                          )}
                          <ProductTextCombobox
                            products={products}
                            value={slide.linkProductId ?? ""}
                            onChange={(id) => handleLinkChange(slide.key, id)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(slide)}
                          className="flex h-8 w-8 flex-none items-center justify-center self-start rounded-full text-error transition-colors hover:bg-error-container"
                          aria-label="ลบสไลด์"
                        >
                          <Icon name="delete" className="text-xl" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="mb-3 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
        <Icon name="info" className="mt-0.5 flex-none text-base text-secondary" />
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          แบนเนอร์เป็นรูปล้วน (ไม่มีหัวข้อ/คำบรรยายซ้อนทับ) — ออกแบบข้อความทั้งหมดลงในรูปเลย
          ใช้อัตราส่วน <strong>3:1</strong> (เช่น <strong>1536×512 px</strong> หรือใหญ่กว่า) และเก็บข้อความสำคัญไว้กลางภาพ
          ในขอบเขตปลอดภัย เพื่อไม่ให้ถูกตัดบนจอแคบ (รูปแสดงเต็มความกว้างบนมือถือ/แท็บเล็ต)
          <br />
          ลากเพื่อเรียงลำดับ — เลือก &quot;สินค้าที่เชื่อมโยง&quot; เพื่อกำหนดปลายทางเมื่อคลิกสไลด์
          การเพิ่ม ลบ และจัดลำดับจะมีผลเมื่อกด &quot;บันทึกการเปลี่ยนแปลง&quot; เท่านั้น
        </p>
      </div>

      {aspectWarning && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-error/40 bg-error-container/20 px-3 py-2">
          <Icon name="warning" className="mt-0.5 flex-none text-base text-error" />
          <p className="flex-1 font-body-sm text-body-sm text-error">{aspectWarning}</p>
          <button
            type="button"
            onClick={() => setAspectWarning(null)}
            aria-label="ปิด"
            className="flex-none text-error transition-opacity hover:opacity-70"
          >
            <Icon name="close" className="text-base" />
          </button>
        </div>
      )}

      {/* Add controls — one merged cell: product picker + add + upload (icon) */}
      <ProductImagePicker
        products={products}
        value={pickProduct}
        onChange={setPickProduct}
        className="rounded-xl border border-dashed border-outline-variant bg-surface-container p-2"
        trailing={
          <>
            <button
              type="button"
              onClick={handleAddProduct}
              disabled={!pickProduct}
              className="flex flex-none items-center gap-1 rounded-lg bg-primary px-3 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <Icon name="add" className="text-base" />
              เพิ่ม
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="เพิ่มสไลด์จากรูปอัปโหลด"
              title="เพิ่มสไลด์จากรูปอัปโหลด"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-outline-variant bg-white text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Icon
                name={uploading ? "hourglass_top" : "add_photo_alternate"}
                className={uploading ? "animate-spin text-xl text-secondary" : "text-xl"}
              />
            </button>
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
