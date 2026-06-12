"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Icon } from "@/components/icon";
import type { ProductMedia } from "@/lib/types";

export interface PendingMedia extends ProductMedia {
  isNew?: boolean;     // uploaded to storage, not yet committed to DB
  isDeleted?: boolean; // marked for deletion on next save
}

interface Props {
  productId: string;
  items: PendingMedia[];
  onItemsChange: (items: PendingMedia[]) => void;
}

/** Extract an 11-char YouTube video id from common URL shapes. */
function youTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}

function reindex(items: PendingMedia[]): PendingMedia[] {
  let idx = 0;
  return items.map((m) => {
    if (m.isDeleted) return m;
    return { ...m, sortOrder: idx, isPrimary: idx++ === 0 };
  });
}

export function MediaManager({ productId, items, onItemsChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytError, setYtError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = items.filter((m) => !m.isDeleted);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    let next = [...items];
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("productId", productId);
      fd.set("folder", "media");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        const type = file.type.startsWith("video") ? "video" : "image";
        const visCount = next.filter((m) => !m.isDeleted).length;
        next = [
          ...next,
          {
            id: crypto.randomUUID(),
            type: type as "image" | "video",
            provider: null,
            url,
            alt: null,
            sortOrder: visCount,
            isPrimary: visCount === 0,
            isNew: true,
          },
        ];
      }
    }
    onItemsChange(next);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleAddYouTube() {
    const url = ytUrl.trim();
    if (!url) return;
    if (!youTubeId(url)) { setYtError("ลิงก์ YouTube ไม่ถูกต้อง"); return; }
    setYtError(null);
    const visCount = visible.length;
    onItemsChange([
      ...items,
      {
        id: crypto.randomUUID(),
        type: "video",
        provider: "youtube",
        url,
        alt: null,
        sortOrder: visCount,
        isPrimary: visCount === 0,
        isNew: true,
      },
    ]);
    setYtUrl("");
  }

  function handleDelete(item: PendingMedia) {
    onItemsChange(reindex(items.map((m) => (m.id === item.id ? { ...m, isDeleted: true } : m))));
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const reordered = [...visible];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const deleted = items.filter((m) => m.isDeleted);
    onItemsChange(reindex([...reordered, ...deleted]));
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
              {visible.map((item, index) => (
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
                      {item.isNew && (
                        <span className="absolute bottom-1 left-1 rounded bg-secondary px-1 font-label-caps text-label-caps text-on-secondary">
                          ใหม่
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
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

      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />

      <div className="mt-3 flex flex-col gap-1">
        <label className="font-label-caps text-label-caps text-on-surface-variant">เพิ่มวิดีโอจาก YouTube</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="smart_display" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant" />
            <input
              type="url"
              value={ytUrl}
              onChange={(e) => { setYtUrl(e.target.value); setYtError(null); }}
              placeholder="วางลิงก์ YouTube เช่น https://youtu.be/..."
              className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 font-body-sm text-body-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleAddYouTube}
            disabled={!ytUrl.trim()}
            className="flex-none rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            เพิ่มวิดีโอ
          </button>
        </div>
        {ytError && <p className="font-body-sm text-body-sm text-error">{ytError}</p>}
      </div>

      <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
        รองรับ JPG, PNG, WEBP, MP4 และลิงก์ YouTube — ลากเพื่อเรียงลำดับ, รูปแรกจะเป็นรูปหน้าปก
      </p>
    </div>
  );
}
