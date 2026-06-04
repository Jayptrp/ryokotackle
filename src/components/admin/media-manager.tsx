"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { addMedia, deleteMedia, reorderMedia } from "@/app/admin/products/actions";
import { Icon } from "@/components/icon";
import type { ProductMedia } from "@/lib/types";

interface Props {
  productId: string;
  initial: ProductMedia[];
}

export function MediaManager({ productId, initial }: Props) {
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("productId", productId);
      fd.set("folder", "media");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        const type = file.type.startsWith("video") ? "video" : "image";
        await addMedia(productId, url, type);
        setItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type,
            provider: null,
            url,
            alt: null,
            sortOrder: prev.length,
            isPrimary: prev.length === 0,
          },
        ]);
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const next = [...items];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    const updated = next.map((item, i) => ({ ...item, sortOrder: i, isPrimary: i === 0 }));
    setItems(updated);
    startTransition(() => reorderMedia(productId, updated.map((i) => i.id)));
  }

  function handleDelete(item: ProductMedia) {
    startTransition(async () => {
      await deleteMedia(item.id, productId, item.url);
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== item.id);
        return next.map((i, idx) => ({ ...i, sortOrder: idx, isPrimary: idx === 0 }));
      });
    });
  }

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="media" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="mb-3 flex flex-wrap gap-3"
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(drag) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      {...drag.dragHandleProps}
                      className="group relative h-28 w-28 flex-none overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low"
                    >
                      {item.type === "image" ? (
                        <Image src={item.url} alt={item.alt ?? ""} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Icon name="play_circle" className="text-4xl text-on-surface-variant" />
                        </div>
                      )}
                      {item.isPrimary && (
                        <span className="absolute left-1 top-1 rounded bg-primary px-1 font-label-caps text-label-caps text-on-primary">
                          หลัก
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={isPending}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-error opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Icon name="close" className="text-sm" />
                      </button>
                      <div className="absolute bottom-1 right-1 flex h-5 w-5 cursor-grab items-center justify-center rounded bg-white/60 opacity-0 group-hover:opacity-100">
                        <Icon name="drag_indicator" className="text-xs text-on-surface-variant" />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-28 w-28 flex-none flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-outline-variant bg-surface-container transition-colors hover:border-primary hover:bg-surface-container-low"
              >
                {uploading ? (
                  <Icon name="hourglass_top" className="animate-spin text-2xl text-secondary" />
                ) : (
                  <>
                    <Icon name="add_photo_alternate" className="text-2xl text-on-surface-variant" />
                    <span className="font-label-caps text-label-caps text-on-surface-variant">อัปโหลด</span>
                  </>
                )}
              </button>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        รองรับ JPG, PNG, WEBP, MP4 — ลากเพื่อเรียงลำดับ, รูปแรกจะเป็นรูปหน้าปก
      </p>
    </div>
  );
}
