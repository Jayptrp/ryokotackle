"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";

export interface PickerProduct {
  id: string;
  label: string;
  image: string;
}

/** Cap how many rows we mount at once so a broad query can't dump the whole catalog. */
const TEXT_LIMIT = 50;
const IMAGE_LIMIT = 24;

/**
 * Text-only, type-to-filter replacement for a native product `<select>`.
 * No images — cheap enough to keep one per slide. Shows all names on open,
 * narrows as you type.
 */
export function ProductTextCombobox({
  products,
  value,
  onChange,
  placeholder = "— ไม่เชื่อมโยงสินค้า —",
}: {
  products: PickerProduct[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = products.find((p) => p.id === value)?.label ?? "";

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? products.filter((p) => p.label.toLowerCase().includes(term))
      : products;
    return list.slice(0, TEXT_LIMIT);
  }, [query, products]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-outline-variant bg-white px-3 py-2 text-left font-body-sm text-body-sm outline-none focus:border-primary"
      >
        <span className={`truncate ${selectedLabel ? "text-on-surface" : "text-on-surface-variant"}`}>
          {selectedLabel || placeholder}
        </span>
        <Icon
          name={open ? "expand_less" : "expand_more"}
          className="flex-none text-base text-on-surface-variant"
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-outline-variant bg-white shadow-lg">
          <div className="relative border-b border-outline-variant p-2">
            <Icon
              name="search"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-on-surface-variant"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์เพื่อค้นหา..."
              className="w-full rounded-md border border-outline-variant bg-white py-1.5 pl-8 pr-2 font-body-sm text-body-sm outline-none focus:border-primary"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => choose("")}
                className="flex w-full items-center px-3 py-2 text-left font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container"
              >
                {placeholder}
              </button>
            </li>
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => choose(p.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-body-sm text-body-sm hover:bg-surface-container ${
                    p.id === value ? "text-primary" : "text-on-surface"
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  {p.id === value && (
                    <Icon name="check" className="flex-none text-base text-primary" />
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center font-body-sm text-body-sm text-on-surface-variant">
                ไม่พบสินค้า
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Image + name product picker. Starts empty and autofocuses the search box —
 * results (with thumbnails) only mount once the admin types, so we never render
 * the whole catalog's images at once. Collapses to a thumbnail chip when chosen.
 */
export function ProductImagePicker({
  products,
  value,
  onChange,
  className,
  trailing,
}: {
  products: PickerProduct[];
  value: string;
  onChange: (id: string) => void;
  /** Extra classes for the outer cell (e.g. border/background). */
  className?: string;
  /** Action buttons rendered to the right of the trigger, inside the same cell. */
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = products.find((p) => p.id === value) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => p.label.toLowerCase().includes(term))
      .slice(0, IMAGE_LIMIT);
  }, [query, products]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-2 text-left font-body-sm text-body-sm outline-none focus:border-primary"
        >
          {selected ? (
            <>
              <span className="relative h-7 w-7 flex-none overflow-hidden rounded bg-surface-container">
                <Image src={selected.image} alt="" fill className="object-cover" unoptimized sizes="28px" />
              </span>
              <span className="truncate text-on-surface">{selected.label}</span>
            </>
          ) : (
            <span className="truncate text-on-surface-variant">— เลือกสินค้า —</span>
          )}
          <Icon
            name={open ? "expand_less" : "expand_more"}
            className="ml-auto flex-none text-base text-on-surface-variant"
          />
        </button>
        {trailing}
      </div>

      {open && (
        <div className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-outline-variant bg-white shadow-lg">
          <div className="relative border-b border-outline-variant p-2">
            <Icon
              name="search"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-on-surface-variant"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="พิมพ์ชื่อสินค้าเพื่อค้นหา..."
              className="w-full rounded-md border border-outline-variant bg-white py-1.5 pl-8 pr-2 font-body-sm text-body-sm outline-none focus:border-primary"
            />
          </div>
          {query.trim() === "" ? (
            <p className="px-3 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              พิมพ์เพื่อค้นหาสินค้า
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              ไม่พบสินค้า
            </p>
          ) : (
            <ul className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto p-2 sm:grid-cols-3">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p.id)}
                    title={p.label}
                    className={`group w-full overflow-hidden rounded-lg border text-left transition-colors ${
                      p.id === value
                        ? "border-primary ring-2 ring-primary"
                        : "border-outline-variant hover:border-primary"
                    }`}
                  >
                    <span className="relative block aspect-square w-full bg-surface-container">
                      <Image
                        src={p.image}
                        alt={p.label}
                        fill
                        className="object-cover"
                        unoptimized
                        loading="lazy"
                        sizes="120px"
                      />
                    </span>
                    <span className="block truncate px-1.5 py-1 font-body-sm text-body-sm text-on-surface">
                      {p.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
