"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import type { ProductMedia } from "@/lib/types";

function youTubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

type Filter = "all" | "image" | "video";

export function ProductGallery({
  media,
  alt,
}: {
  media: ProductMedia[];
  alt: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const hasImage = media.some((m) => m.type === "image");
  const hasVideo = media.some((m) => m.type === "video");

  const list = useMemo(
    () => (filter === "all" ? media : media.filter((m) => m.type === filter)),
    [media, filter],
  );

  const idx = Math.min(active, Math.max(0, list.length - 1));
  const current = list[idx];
  const go = (i: number) => setActive((i + list.length) % list.length);
  const pick = (f: Filter) => {
    setFilter(f);
    setActive(0);
  };

  // Keyboard nav + Esc while the lightbox is open; lock body scroll.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "ArrowRight") go(idx + 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, idx, list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (media.length === 0) {
    return (
      <div className="mx-auto flex aspect-square max-h-[480px] w-full items-center justify-center rounded-lg border border-outline-variant bg-gradient-to-br from-surface-container to-surface-container-high">
        <Icon name="image" className="text-6xl text-outline-variant" />
      </div>
    );
  }

  const filterBtn = (f: Filter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => pick(f)}
      className={cn(
        "rounded-md px-3 py-1.5 font-label-caps text-label-caps transition-colors",
        filter === f
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container-high",
      )}
    >
      {label} ({count})
    </button>
  );

  return (
    <div className="flex flex-col gap-stack-md">
      {/* Image / Video filter — only when both kinds exist */}
      {hasImage && hasVideo && (
        <div className="flex gap-1 self-start rounded-lg bg-surface-container p-1">
          {filterBtn("all", "ทั้งหมด", media.length)}
          {filterBtn("image", "รูปภาพ", media.filter((m) => m.type === "image").length)}
          {filterBtn("video", "วิดีโอ", media.filter((m) => m.type === "video").length)}
        </div>
      )}

      {/* Main viewer — height-capped so it never dominates large screens */}
      <div className="group relative aspect-square max-h-[480px] w-full overflow-hidden rounded-lg border border-outline-variant bg-white">
        {current.type === "video" ? (
          youTubeEmbed(current.url) ? (
            <iframe
              src={youTubeEmbed(current.url)!}
              title={alt}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={current.url} controls className="h-full w-full object-contain" />
          )
        ) : (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="block h-full w-full cursor-zoom-in"
            aria-label="ดูรูปขนาดใหญ่"
          >
            <Image
              src={current.url}
              alt={current.alt ?? alt}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 560px"
              unoptimized
              priority
            />
          </button>
        )}

        {/* n / N counter */}
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 font-body-sm text-body-sm font-medium text-white">
          {idx + 1}/{list.length}
        </span>

        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(idx - 1)}
              aria-label="ก่อนหน้า"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <Icon name="arrow_back_ios" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              aria-label="ถัดไป"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <Icon name="arrow_forward_ios" className="text-[18px]" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails — horizontal scroll */}
      {list.length > 1 && (
        <div className="flex gap-stack-sm overflow-x-auto pb-2">
          {list.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white transition-opacity",
                i === idx
                  ? "border-2 border-primary opacity-100"
                  : "border-outline-variant opacity-60 hover:opacity-100",
              )}
            >
              {m.type === "video" ? (
                <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
                  <Icon name="play_circle" className="text-2xl text-primary" />
                </div>
              ) : (
                <Image
                  src={m.url}
                  alt={m.alt ?? `${alt} ${i + 1}`}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
        >
          <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 font-body-sm text-body-sm text-white">
            {idx + 1}/{list.length}
          </span>
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="ปิด"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <Icon name="close" />
          </button>

          <div
            className="relative flex h-full w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {current.type === "video" && youTubeEmbed(current.url) ? (
              <iframe
                src={youTubeEmbed(current.url)!}
                title={alt}
                className="aspect-video w-full max-w-4xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <Image
                src={current.url}
                alt={current.alt ?? alt}
                width={1400}
                height={1400}
                className="max-h-[88vh] w-auto object-contain"
                unoptimized
              />
            )}

            {list.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(idx - 1)}
                  aria-label="ก่อนหน้า"
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <Icon name="arrow_back_ios" className="text-xl" />
                </button>
                <button
                  type="button"
                  onClick={() => go(idx + 1)}
                  aria-label="ถัดไป"
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                >
                  <Icon name="arrow_forward_ios" className="text-xl" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
