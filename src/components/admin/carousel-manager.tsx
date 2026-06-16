"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  addSlide,
  addSlideFromProduct,
  deleteSlide,
  reorderSlides,
  saveSlideTexts,
} from "@/app/admin/home/actions";
import { Icon } from "@/components/icon";
import { compressImage } from "@/lib/compress-image";
import type { CarouselSlide } from "@/lib/types";

export interface ProductOption {
  id: string;
  label: string;
  image: string;
}

export function CarouselManager({
  initial,
  products,
}: {
  initial: CarouselSlide[];
  products: ProductOption[];
}) {
  const [slides, setSlides] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [pickProduct, setPickProduct] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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
        const id = await addSlide(url);
        setSlides((prev) => [
          ...prev,
          {
            id,
            imageUrl: url,
            title: null,
            subtitle: null,
            sortOrder: prev.length,
            productId: null,
            linkProductId: null,
            linkProductSlug: null,
          },
        ]);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleAddProduct() {
    const product = products.find((p) => p.id === pickProduct);
    if (!product) return;
    const id = await addSlideFromProduct(product.id);
    setSlides((prev) => [
      ...prev,
      {
        id,
        imageUrl: product.image,
        title: product.label,
        subtitle: "",
        sortOrder: prev.length,
        productId: product.id,
        linkProductId: product.id,
        linkProductSlug: null,
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
    startTransition(() => reorderSlides(next.map((s) => s.id)));
  }

  function handleField(id: string, field: "title" | "subtitle", value: string) {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    );
    setDirty(true);
  }

  function handleLinkChange(id: string, linkProductId: string) {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, linkProductId: linkProductId || null } : s)),
    );
    setDirty(true);
  }

  async function handleSaveAll() {
    setSaving(true);
    await saveSlideTexts(
      slides.map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        productId: s.productId,
        linkProductId: s.linkProductId,
      })),
    );
    setSaving(false);
    setDirty(false);
  }

  function handleDelete(slide: CarouselSlide) {
    startTransition(async () => {
      await deleteSlide(slide.id);
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
    });
  }

  return (
    <div>
      {/* Save-all bar */}
      <div className="mb-4 flex items-center justify-end gap-3">
        {dirty && (
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            มีการเปลี่ยนแปลงที่ยังไม่บันทึก
          </span>
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
              {slides.map((slide, index) => (
                <Draggable key={slide.id} draggableId={slide.id} index={index}>
                  {(drag) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      className="flex gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
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
                            onChange={(e) => handleField(slide.id, "title", e.target.value)}
                            placeholder="หัวข้อ (title)"
                            className="w-full min-w-0 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
                          />
                        )}
                        <input
                          value={slide.subtitle ?? ""}
                          onChange={(e) => handleField(slide.id, "subtitle", e.target.value)}
                          placeholder="คำบรรยาย (subtitle) — เว้นว่างได้"
                          className="w-full min-w-0 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
                        />
                        <select
                          value={slide.linkProductId ?? ""}
                          onChange={(e) => handleLinkChange(slide.id, e.target.value)}
                          className="w-full min-w-0 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
                        >
                          <option value="">— ไม่เชื่อมโยงสินค้า —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
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
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add controls */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container py-4 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          {uploading ? (
            <Icon name="hourglass_top" className="animate-spin text-xl text-secondary" />
          ) : (
            <Icon name="add_photo_alternate" className="text-xl" />
          )}
          {uploading ? "กำลังอัปโหลด..." : "เพิ่มสไลด์จากรูปอัปโหลด"}
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container p-2">
          <select
            value={pickProduct}
            onChange={(e) => setPickProduct(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
          >
            <option value="">— เลือกสินค้า —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddProduct}
            disabled={!pickProduct}
            className="flex flex-none items-center gap-1 rounded-lg bg-primary px-3 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            <Icon name="add" className="text-base" />
            เพิ่ม
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
      <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
        ลากเพื่อเรียงลำดับ — สไลด์จากสินค้าจะใช้รูปหลักและชื่อสินค้าเป็นหัวข้อ (แก้ไขคำบรรยายได้)
        เลือก &quot;สินค้าที่เชื่อมโยง&quot; เพื่อกำหนดว่าคลิกสไลด์แล้วจะไปหน้าสินค้าใด
        กด &quot;บันทึกการเปลี่ยนแปลง&quot; เพื่อบันทึกข้อความทั้งหมด
      </p>
    </div>
  );
}
