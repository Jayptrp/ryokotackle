"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";

export function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const gallery = images.length > 0 ? images : [""];

  const go = (i: number) => setActive((i + gallery.length) % gallery.length);

  return (
    <div className="flex flex-col gap-stack-md">
      {/* Pill toggle (Images / Video) — visual only */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-outline-variant bg-surface-container p-1">
          <span className="rounded-full bg-secondary px-6 py-2 font-label-caps text-label-caps text-on-secondary">
            รูป (Images)
          </span>
          <span className="rounded-full px-6 py-2 font-label-caps text-label-caps text-on-surface-variant">
            คลิป (Video)
          </span>
        </div>
      </div>

      {/* Main image */}
      <div className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant bg-white">
        <Image
          src={gallery[active]}
          alt={alt}
          fill
          className="object-contain transition-opacity duration-500"
          unoptimized
          priority
        />
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="รูปก่อนหน้า"
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <Icon name="arrow_back_ios" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="รูปถัดไป"
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <Icon name="arrow_forward_ios" className="text-[18px]" />
            </button>
          </>
        )}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {gallery.map((src, i) => (
            <span
              key={`${src}-${i}`}
              className={cn(
                "h-2 w-2 rounded-full",
                i === active ? "bg-primary" : "bg-outline-variant",
              )}
            />
          ))}
        </div>
      </div>

      {/* Thumbnails */}
      {gallery.length > 1 && (
        <div className="flex gap-stack-sm overflow-x-auto pb-2 no-scrollbar">
          {gallery.map((src, i) => (
            <button
              key={`${src}-thumb-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "h-20 min-w-[80px] overflow-hidden rounded-lg border bg-white transition-opacity",
                i === active
                  ? "border-2 border-primary opacity-100"
                  : "border-outline-variant opacity-60 hover:opacity-100",
              )}
            >
              <Image
                src={src}
                alt={`${alt} ${i + 1}`}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
