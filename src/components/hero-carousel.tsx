"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import type { CarouselSlide } from "@/lib/types";

export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (i: number) => {
      setCurrent((i + slides.length) % slides.length);
    },
    [slides.length],
  );
  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance every 5s. Pauses while hovered; `current` in the deps means any
  // manual navigation (arrows/dots) restarts the countdown instead of firing early.
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length, paused, current]);

  if (slides.length === 0) return null;

  return (
    <section
      className="group relative aspect-[3/1] w-full overflow-hidden rounded-none bg-primary-container lg:rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const content = (
          <>
            <Image
              src={slide.imageUrl}
              alt={slide.title ?? ""}
              fill
              priority={i === 0}
              className="object-cover"
              unoptimized
            />
            <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-primary/60 to-transparent pb-stack-sm md:pb-stack-lg">
              <div className="mb-stack-sm w-full px-6 md:mb-stack-lg md:px-10">
                {slide.title && (
                  <h2 className="max-w-xl font-headline-lg text-headline-lg text-on-primary">
                    {slide.title}
                  </h2>
                )}
                {slide.subtitle && (
                  <p className="mt-stack-sm max-w-lg font-body-lg text-body-lg text-on-primary/80">
                    {slide.subtitle}
                  </p>
                )}
              </div>
            </div>
          </>
        );
        const wrapperClassName = cn(
          "absolute inset-0 block transition-opacity duration-1000",
          i === current ? "opacity-100" : "pointer-events-none opacity-0",
        );
        return slide.linkProductSlug ? (
          <Link key={slide.id} href={`/products/${slide.linkProductSlug}`} className={wrapperClassName}>
            {content}
          </Link>
        ) : (
          <div key={slide.id} className={wrapperClassName}>
            {content}
          </div>
        );
      })}

      {/* Controls */}
      {slides.length > 1 && (
      <>
      <button
        type="button"
        onClick={prev}
        aria-label="สไลด์ก่อนหน้า"
        className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-white opacity-0 transition-all hover:bg-white/10 group-hover:opacity-100"
      >
        <Icon name="chevron_left" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="สไลด์ถัดไป"
        className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 text-white opacity-0 transition-all hover:bg-white/10 group-hover:opacity-100"
      >
        <Icon name="chevron_right" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-stack-sm md:bottom-10">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`ไปยังสไลด์ ${i + 1}`}
            className={cn(
              "h-2 rounded-full bg-white transition-all",
              i === current ? "w-6" : "w-2 bg-white/40",
            )}
          />
        ))}
      </div>
      </>
      )}
    </section>
  );
}
