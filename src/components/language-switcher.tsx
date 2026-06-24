"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { useLocale } from "@/components/i18n/language-provider";

/**
 * Language picker for the nav bar (sits after the search icon). A small
 * self-contained dropdown — there's no menu/popover primitive in the kit — that
 * flips the locale via `useLocale()`; the choice persists in a cookie.
 */
export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="เปลี่ยนภาษา / Change language"
        className="flex items-center gap-1 rounded-full p-base text-primary transition-all hover:bg-surface-container-low"
      >
        <Icon name="language" />
        <span className="font-label-caps text-label-caps">
          {LOCALE_META[locale].short}
        </span>
        <Icon name="expand_more" className="text-base" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-lg"
        >
          {LOCALES.map((l) => {
            const active = l === locale;
            return (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLocale(l);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left font-body-sm text-body-sm transition-colors",
                    active
                      ? "bg-surface-container text-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-primary",
                  )}
                >
                  <span>{LOCALE_META[l].label}</span>
                  <span className="font-label-caps text-label-caps opacity-60">
                    {LOCALE_META[l].short}
                  </span>
                  {active && <Icon name="check" className="text-base text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
