"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";

interface Slide {
  image: string;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAOD-P8X7ullFR4dKhcbqBboXo8t6u-6tAVP8scPzYnrGfzRS9WW_gUUUMq-bTC5UagRz0iJBz-V0TQtvAcWNtpL8DOjPHQV6Z5UGx997ycnb1rOxMEips8-TLP_fDgRDf6l0CdQR3HezT0pejTz6E5oAgPes4t9I5Vdrs6W1dBXoKjLYsiXCwkSwiPLNYVZV2g4izNMU2Wo_npDbECROICKc8h2CKeHf9SyxuyAOZ56nV_dNdM0dMdDUPPmn9vmtvTLG5mxZf9YyI",
    title: "Ultimate Precision in Every Cast",
    subtitle: "สัมผัสประสบการณ์ตกปลาระดับพรีเมียมด้วยเทคโนโลยีจากญี่ปุ่น",
  },
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAYqJ8DE1vlpVivWseIFT9CF0HC82261ZPrGPE3GavGvFi38lC5Vf3QbQdPbiv1MsI422Ww8eXhwzOOw_cJEDeMRQcoqLZ0_C7giolt-sD9QDmZvwFTjVYIFW9p-AU7wgfZ0AyCkD3wUEuUXR8HngeC-t0Wa6HRK3E0NuF7XpyLAr4rWwreRD9Ez316U44sjtTi1_IcMChc0pYm8pg-V7842dX8Eu6ZY1qflhg1MekGoUd4qRfjfg03wY6lv8s-G8o-3ffduvXF6m4",
    title: "Master the Ocean's Rhythm",
    subtitle: "คันเบ็ดคุณภาพสูงที่ออกแบบมาเพื่อการควบคุมที่แม่นยำ",
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((i: number) => {
    setCurrent((i + SLIDES.length) % SLIDES.length);
  }, []);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="group relative h-[clamp(320px,55vh,520px)] w-full overflow-hidden rounded-2xl bg-primary-container">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            i === current ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority={i === 0}
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-primary/60 to-transparent pb-stack-lg">
            <div className="mb-stack-lg w-full px-6 md:px-10">
              <h2 className="max-w-xl font-headline-lg text-headline-lg text-on-primary">
                {slide.title}
              </h2>
              <p className="mt-stack-sm max-w-lg font-body-lg text-body-lg text-on-primary/80">
                {slide.subtitle}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Controls */}
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
      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 gap-stack-sm">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
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
    </section>
  );
}
