"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import type { ProductMedia } from "@/lib/types";

function youTubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export function ProductGallery({
  media,
  alt,
}: {
  media: ProductMedia[];
  alt: string;
}) {
  const [active, setActive] = useState(0);

  if (media.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-outline-variant bg-gradient-to-br from-surface-container to-surface-container-high">
        <Icon name="image" className="text-6xl text-outline-variant" />
      </div>
    );
  }

  const current = media[Math.min(active, media.length - 1)];
  const go = (i: number) => setActive((i + media.length) % media.length);

  return (
    <div className="flex flex-col gap-stack-md">
      <div className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant bg-white">
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
          <Image
            src={current.url}
            alt={current.alt ?? alt}
            fill
            className="object-contain"
            unoptimized
            priority
          />
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="ก่อนหน้า"
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <Icon name="arrow_back_ios" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="ถัดไป"
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <Icon name="arrow_forward_ios" className="text-[18px]" />
            </button>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-stack-sm overflow-x-auto pb-2 no-scrollbar">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-20 min-w-[80px] overflow-hidden rounded-lg border bg-white transition-opacity",
                i === active
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
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
