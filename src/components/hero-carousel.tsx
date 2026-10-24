"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { VariantImage } from "@/components/variant-image";
import type { CarouselSlide } from "@/lib/types";

export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const n = slides.length;
  const loop = n > 1;

  // Extended track for the infinite effect: clone the last slide at the front
  // and the first slide at the end, so we can slide past either edge and then
  // snap (without animation) to the matching real slide.
  const extended = loop ? [slides[n - 1], ...slides, slides[0]] : slides;

  // `pos` indexes the extended array; real slides start at index 1 when looping.
  const [pos, setPos] = useState(loop ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Finger offset (px) while a horizontal swipe is in progress; null otherwise.
  const [dragX, setDragX] = useState<number | null>(null);
  // Swipe settles use a shorter drawer curve; arrows/dots/auto keep 700ms.
  const [swipeSettle, setSwipeSettle] = useState(false);

  const realIndex = loop ? (((pos - 1) % n) + n) % n : pos;

  // One-slide-at-a-time lock. Without it, rapid clicks/swipes increment `pos`
  // past the clones (n+1) before a transition ends, sliding the track off the
  // end into the bare container background (the "dark blue banner"). Cleared on
  // transitionend; a safety timeout guarantees it can never get stuck.
  const sliding = useRef(false);
  const lockTimer = useRef(0);
  const lock = useCallback(() => {
    sliding.current = true;
    clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => {
      sliding.current = false;
    }, 800);
  }, []);
  const unlock = useCallback(() => {
    sliding.current = false;
    clearTimeout(lockTimer.current);
  }, []);
  useEffect(() => () => clearTimeout(lockTimer.current), []);

  const step = useCallback(
    (delta: 1 | -1, swipe = false) => {
      if (sliding.current) return;
      lock();
      setSwipeSettle(swipe);
      setAnimate(true);
      setPos((p) => p + delta);
    },
    [lock],
  );
  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);
  const goTo = useCallback(
    (i: number) => {
      const target = loop ? i + 1 : i;
      if (sliding.current || target === pos) return;
      lock();
      setSwipeSettle(false);
      setAnimate(true);
      setPos(target);
    },
    [loop, pos, lock],
  );

  // When a slide lands on a clone, jump to its real counterpart with animation
  // off so the loop is seamless.
  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== "transform") return;
    unlock();
    if (!loop) return;
    if (pos === n + 1) {
      setAnimate(false);
      setPos(1);
    } else if (pos === 0) {
      setAnimate(false);
      setPos(n);
    }
  };

  // Re-enable the transition a frame after a snap. Double rAF guarantees the
  // browser paints the snapped (un-animated) frame before the transition class
  // returns, so the snap itself never animates.
  useEffect(() => {
    if (animate) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setAnimate(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [animate]);

  // Auto-advance every 5s. Pauses while hovered/touched; `pos` in the deps means
  // any manual navigation (arrows/dots/swipe) restarts the countdown.
  useEffect(() => {
    if (!loop || paused || hidden) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [loop, paused, hidden, pos, next]);

  // Background tabs don't run CSS transitions / fire transitionend, so the loop
  // snap can't happen — without pausing, the timer would march `pos` off the end
  // of the track into the empty container background. Pause while hidden, and on
  // return snap (no animation) back to the current real slide.
  useEffect(() => {
    const onVisibility = () => {
      const isHidden = document.hidden;
      setHidden(isHidden);
      if (!isHidden && loop) {
        clearTimeout(lockTimer.current);
        sliding.current = false;
        setDragX(null);
        setAnimate(false);
        setPos((p) => ((((p - 1) % n) + n) % n) + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [loop, n]);

  // Touch swipe: the track follows the finger 1:1 once the gesture locks
  // horizontal (~8px); a vertical gesture is left to the browser (pan-y) so the
  // page scrolls. On release, commit on distance or flick velocity, else snap
  // back. Disabled with a single slide (no clones to slide onto).
  const sectionRef = useRef<HTMLElement>(null);
  const touch = useRef({
    x: 0,
    y: 0,
    t: 0,
    dx: 0,
    dir: null as "h" | "v" | null,
    active: false,
  });
  // A horizontal drag must not also count as a tap on a linked slide.
  const suppressClick = useRef(false);
  const onTouchStart = (e: React.TouchEvent) => {
    setPaused(true);
    suppressClick.current = false;
    // Ignore touches mid-slide: grabbing the track then would cancel the
    // transition (no transitionend → no clone snap) and let the next move run
    // past the clones.
    if (!loop || sliding.current) return;
    const t = e.touches[0];
    touch.current = {
      x: t.clientX,
      y: t.clientY,
      t: performance.now(),
      dx: 0,
      dir: null,
      active: true,
    };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const g = touch.current;
    if (!g.active) return;
    const t = e.touches[0];
    const dx = t.clientX - g.x;
    const dy = t.clientY - g.y;
    if (g.dir === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      g.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (g.dir !== "h") return;
    // Clamp to one slide so a long drag can't reveal past the clones.
    const w = sectionRef.current?.offsetWidth ?? Infinity;
    g.dx = Math.max(-w, Math.min(w, dx));
    suppressClick.current = true;
    setDragX(g.dx);
  };
  const onTouchEnd = () => {
    const g = touch.current;
    const wasDrag = g.active && g.dir === "h";
    g.active = false;
    setPaused(false);
    if (!wasDrag) return;
    setDragX(null);
    const elapsed = Math.max(1, performance.now() - g.t);
    if (Math.abs(g.dx) > 40 || Math.abs(g.dx) / elapsed > 0.11) {
      step(g.dx < 0 ? 1 : -1, true);
    } else if (g.dx !== 0) {
      // Snap back to the current slide.
      lock();
      setSwipeSettle(true);
      setAnimate(true);
    }
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  if (n === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="group relative aspect-[3/1] w-full touch-pan-y overflow-hidden rounded-none bg-primary-container shadow-md lg:rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClickCapture={onClickCapture}
    >
      {/* Sliding track */}
      <div
        className={cn(
          "flex h-full w-full",
          dragX === null &&
            animate &&
            (swipeSettle
              ? "transition-transform duration-400 ease-drawer motion-reduce:duration-200"
              : "transition-transform duration-700 ease-in-out"),
        )}
        style={{
          transform:
            dragX === null
              ? `translateX(-${pos * 100}%)`
              : `translateX(calc(-${pos * 100}% + ${dragX}px))`,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extended.map((slide, i) => {
          // Image-only slides: the admin bakes any text/detail into the image
          // itself, so there's no title/subtitle/gradient overlay here.
          // The first real slide is the LCP image: load it eagerly at high
          // priority rather than preloading it, since a preload would fetch the
          // desktop size on phones (see VariantImage).
          const first = loop ? i === 1 : i === 0;
          const content = (
            <VariantImage
              src={slide.imageUrl}
              variant="banner"
              mobileVariant="banner-sm"
              alt={slide.title ?? ""}
              fill
              loading={first ? "eager" : undefined}
              fetchPriority={first ? "high" : undefined}
              className="object-cover transition-transform duration-300 group-hover:scale-102"
            />
          );
          // overflow-hidden clips each image to its own slide, so a hovered
          // slide's zoom can't bleed into the neighbouring slide.
          const slideClassName = "relative h-full w-full shrink-0 overflow-hidden";
          // Clones share ids with real slides, so key by track position.
          return slide.linkProductSlug ? (
            <Link
              key={i}
              href={`/products/${slide.linkProductSlug}`}
              className={cn(slideClassName, "block")}
            >
              {content}
            </Link>
          ) : (
            <div key={i} className={slideClassName}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {n > 1 && (
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
                  i === realIndex ? "w-6" : "w-2 bg-white/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
