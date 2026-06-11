"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { setFeatured } from "@/app/admin/home/actions";
import { Icon } from "@/components/icon";

export interface FeaturedRow {
  id: string;
  name: string;
  nameTh: string | null;
  image: string | null;
  isFeatured: boolean;
}

export function FeaturedManager({ initial }: { initial: FeaturedRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [isPending, startTransition] = useTransition();

  const featuredCount = rows.filter((r) => r.isFeatured).length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyFeatured && !r.isFeatured) return false;
      if (!term) return true;
      return (
        r.name.toLowerCase().includes(term) ||
        (r.nameTh ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, onlyFeatured]);

  function toggle(row: FeaturedRow) {
    const next = !row.isFeatured;
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, isFeatured: next } : r)),
    );
    startTransition(() => setFeatured(row.id, next));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-10 pr-4 font-body-sm text-body-sm outline-none focus:border-primary"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={onlyFeatured}
            onChange={(e) => setOnlyFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-outline-variant accent-primary"
          />
          เฉพาะที่แนะนำ
        </label>
        <span className="rounded-full bg-secondary-container px-3 py-1 font-label-caps text-label-caps text-on-secondary-container">
          แนะนำ {featuredCount} รายการ
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {filtered.length === 0 && (
          <p className="px-4 py-12 text-center font-body-sm text-body-sm text-on-surface-variant">
            ไม่พบสินค้า
          </p>
        )}
        {filtered.map((row, i) => (
          <div
            key={row.id}
            className={`flex items-center gap-3 border-b border-outline-variant px-4 py-3 last:border-0 ${
              i % 2 ? "bg-surface-container-lowest" : ""
            }`}
          >
            <div className="relative h-12 w-12 flex-none overflow-hidden rounded-lg bg-surface-container">
              {row.image ? (
                <Image src={row.image} alt={row.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center text-on-surface-variant">
                  <Icon name="image" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-body-sm text-body-sm font-medium text-on-surface">
                {row.nameTh ?? row.name}
              </p>
              {row.nameTh && row.nameTh !== row.name && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">{row.name}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => toggle(row)}
              disabled={isPending}
              aria-pressed={row.isFeatured}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-label-caps text-label-caps transition-colors ${
                row.isFeatured
                  ? "bg-secondary text-on-secondary hover:bg-on-secondary-container"
                  : "border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              <Icon name="star" filled={row.isFeatured} className="text-base" />
              {row.isFeatured ? "แนะนำ" : "ตั้งเป็นแนะนำ"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
