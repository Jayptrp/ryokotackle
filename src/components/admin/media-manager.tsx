"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";
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
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: "before" | "after" } | null>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [ytError, setYtError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = items.filter((m) => !m.isDeleted);

  async function uploadFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    let next = [...items];
    for (const file of files) {
      const upload = await compressImage(file);
      const fd = new FormData();
      fd.set("file", upload);
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    uploadFiles(files);
  }

  // --- Native Drag and Drop (Internal Reordering) ---
  
  function onInternalDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function onInternalDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const position = e.clientX < midpoint ? "before" : "after";

    // Avoid showing indicator if it's the same as current position
    if (index === draggedIndex || (position === "before" && index === draggedIndex + 1) || (position === "after" && index === draggedIndex - 1)) {
      setDropTarget(null);
    } else {
      setDropTarget({ index, position });
    }
  }

  function onInternalDrop(e: React.DragEvent) {
    e.preventDefault();
    if (draggedIndex === null || dropTarget === null) {
      setDraggedIndex(null);
      setDropTarget(null);
      return;
    }

    const reordered = [...visible];
    const [moved] = reordered.splice(draggedIndex, 1);
    
    // Adjust target index based on position and removal
    let target = dropTarget.index;
    if (dropTarget.position === "after") target += 1;
    if (draggedIndex < target) target -= 1;

    reordered.splice(target, 0, moved);
    
    const deleted = items.filter((m) => m.isDeleted);
    onItemsChange(reindex([...reordered, ...deleted]));
    
    setDraggedIndex(null);
    setDropTarget(null);
  }

  function onInternalDragEnd() {
    setDraggedIndex(null);
    setDropTarget(null);
  }

  // --- File Drag and Drop (External Upload) ---

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
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

  function handleAltChange(id: string, value: string) {
    onItemsChange(items.map((m) => (m.id === id ? { ...m, alt: value || null } : m)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3">
        {visible.map((item, index) => {
          const isBeingDragged = draggedIndex === index;
          const showBarBefore = dropTarget?.index === index && dropTarget.position === "before";
          const showBarAfter = dropTarget?.index === index && dropTarget.position === "after";

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onInternalDragStart(e, index)}
              onDragOver={(e) => onInternalDragOver(e, index)}
              onDrop={onInternalDrop}
              onDragEnd={onInternalDragEnd}
              className="relative flex w-28 flex-none flex-col gap-1"
            >
              {/* Insertion Bar Indicator — pinned to image height only */}
              {showBarBefore && (
                <div className="absolute -left-[7px] top-0 z-30 h-28 w-1 rounded-full bg-primary animate-pulse" />
              )}
              {showBarAfter && (
                <div className="absolute -right-[7px] top-0 z-30 h-28 w-1 rounded-full bg-primary animate-pulse" />
              )}

              <div className={cn(
                "group relative h-28 w-full overflow-hidden rounded-lg border transition-all duration-200",
                isBeingDragged 
                  ? "border-dashed border-outline-variant bg-surface-container opacity-40 grayscale" 
                  : "border-outline-variant bg-surface-container-low shadow-sm hover:shadow-md hover:border-primary/50"
              )}>
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
                
                {!isBeingDragged && (
                  <>
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
                  </>
                )}
              </div>

              {/* Alt text — one line per thumbnail, persisted on save */}
              <input
                type="text"
                value={item.alt ?? ""}
                onChange={(e) => handleAltChange(item.id, e.target.value)}
                onDragStart={(e) => e.stopPropagation()}
                placeholder="alt text..."
                className="w-full rounded border border-outline-variant bg-white px-1.5 py-0.5 text-[11px] text-on-surface outline-none focus:border-primary"
              />
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          disabled={uploading}
          className={`flex h-28 w-28 flex-none flex-col items-center justify-center gap-1 rounded-lg border border-dashed transition-colors ${
            isDraggingFile
              ? "border-primary bg-primary/5"
              : "border-outline-variant bg-surface-container hover:border-primary hover:bg-surface-container-low"
          }`}
        >
          {uploading ? (
            <Icon name="hourglass_top" className="animate-spin text-2xl text-secondary" />
          ) : (
            <>
              <Icon
                name={isDraggingFile ? "upload" : "add_photo_alternate"}
                className={`text-2xl ${isDraggingFile ? "text-primary" : "text-on-surface-variant"}`}
              />
              <span
                className={`font-label-caps text-label-caps ${
                  isDraggingFile ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {isDraggingFile ? "วางเพื่ออัปโหลด" : "อัปโหลด"}
              </span>
            </>
          )}
        </button>
      </div>

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
