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
    return (
      o.title !== s.title ||
      o.subtitle !== s.subtitle ||
      o.linkProductId !== s.linkProductId
    );
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
    for (const file of files) {
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

  function handleField(key: string, field: "title" | "subtitle", value: string) {
    setSlides((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)),
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
                                หัวข้อ (ชื่อสินค้า — แก้ไขไม่ได้)
                              </span>
                              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
                                <Icon name="lock" className="flex-none text-base" />
                                <span className="truncate">{slide.title}</span>
                              </div>
                            </div>
                          ) : (
                            <input
                              value={slide.title ?? ""}
                              onChange={(e) => handleField(slide.key, "title", e.target.value)}
                              placeholder="หัวข้อ (title)"
                              className="w-full min-w-0 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
                            />
                          )}
                          <input
                            value={slide.subtitle ?? ""}
                            onChange={(e) => handleField(slide.key, "subtitle", e.target.value)}
                            placeholder="คำบรรยาย (subtitle) — เว้นว่างได้"
                            className="w-full min-w-0 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
                          />
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

      <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
        ลากเพื่อเรียงลำดับ — สไลด์จากสินค้าจะใช้รูปหลักและชื่อสินค้าเป็นหัวข้อ (แก้ไขคำบรรยายได้)
        เลือก &quot;สินค้าที่เชื่อมโยง&quot; เพื่อกำหนดว่าคลิกสไลด์แล้วจะไปหน้าสินค้าใด
        การเพิ่ม ลบ และจัดลำดับจะมีผลเมื่อกด &quot;บันทึกการเปลี่ยนแปลง&quot; เท่านั้น
      </p>

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
