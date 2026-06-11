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

/** Extract an 11-char YouTube video id from common URL shapes. */
function youTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}

export function MediaManager({ productId, initial }: Props) {
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytError, setYtError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAddYouTube() {
    const url = ytUrl.trim();
    if (!url) return;
    if (!youTubeId(url)) {
      setYtError("ลิงก์ YouTube ไม่ถูกต้อง");
      return;
    }
    setYtError(null);
    startTransition(async () => {
      await addMedia(productId, url, "video", "youtube");
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "video",
          provider: "youtube",
          url,
          alt: null,
          sortOrder: prev.length,
          isPrimary: prev.length === 0,
        },
      ]);
      setYtUrl("");
    });
  }

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
                      ) : youTubeId(item.url) ? (
                        <>
                          <Image
                            src={`https://img.youtube.com/vi/${youTubeId(item.url)}/mqdefault.jpg`}
                            alt={item.alt ?? ""}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <Icon name="smart_display" filled className="text-4xl text-white" />
                          </div>
                        </>
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

      {/* Add a YouTube link */}
      <div className="mt-3 flex flex-col gap-1">
        <label className="font-label-caps text-label-caps text-on-surface-variant">
          เพิ่มวิดีโอจาก YouTube
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon
              name="smart_display"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
            />
            <input
              type="url"
              value={ytUrl}
              onChange={(e) => {
                setYtUrl(e.target.value);
                setYtError(null);
              }}
              placeholder="วางลิงก์ YouTube เช่น https://youtu.be/..."
              className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 font-body-sm text-body-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleAddYouTube}
            disabled={isPending || !ytUrl.trim()}
            className="flex-none rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            เพิ่มวิดีโอ
          </button>
        </div>
        {ytError && (
          <p className="font-body-sm text-body-sm text-error">{ytError}</p>
        )}
      </div>

      <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
        รองรับ JPG, PNG, WEBP, MP4 และลิงก์ YouTube — ลากเพื่อเรียงลำดับ, รูปแรกจะเป็นรูปหน้าปก
      </p>
    </div>
  );
}
