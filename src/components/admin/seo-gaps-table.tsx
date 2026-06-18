"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";

export interface SeoGapRow {
  id: string;
  name: string;
  nameTh: string | null;
  status: string;
  hasImage: boolean;
  hasSummary: boolean;
  hasDescription: boolean;
  gapCount: number;
}

const PAGE_SIZE = 30;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  published: { label: "เผยแพร่", color: "bg-secondary-container text-on-secondary-container" },
  hidden:    { label: "ซ่อน",    color: "bg-surface-container text-on-surface-variant" },
  draft:     { label: "ร่าง",    color: "bg-error-container text-on-error-container" },
};

function Dot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-medium ${
        ok
          ? "bg-secondary-container/60 text-on-secondary-container"
          : "bg-error-container/60 text-error"
      }`}
    >
      <Icon name={ok ? "check" : "close"} className="text-[11px]" />
      {label}
    </span>
  );
}

export function SeoGapsTable({ rows }: { rows: SeoGapRow[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const slice = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container">
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">
                ชื่อสินค้า
              </th>
              <th className="w-28 whitespace-nowrap px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">
                สถานะ
              </th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">
                ข้อมูล SEO
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center font-body-sm text-body-sm text-on-surface-variant">
                  <Icon name="check_circle" className="mb-2 text-3xl text-secondary" />
                  <p>ข้อมูล SEO ครบทุกสินค้า</p>
                </td>
              </tr>
            )}
            {slice.map((r, i) => {
              const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.draft;
              return (
                <tr
                  key={r.id}
                  className={`border-b border-outline-variant transition-colors hover:bg-surface-container-low ${
                    i % 2 === 0 ? "" : "bg-surface-container-lowest"
                  }`}
                >
                  <td className="px-4 py-3">
                    <p className="font-body-sm text-body-sm font-medium text-on-surface">
                      {r.nameTh ?? r.name}
                    </p>
                    {r.nameTh && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">{r.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 font-label-caps text-label-caps ${s.color}`}>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Dot ok={r.hasImage} label="รูป" />
                      <Dot ok={!!r.nameTh} label="ชื่อไทย" />
                      <Dot ok={r.hasSummary} label="สรุป" />
                      <Dot ok={r.hasDescription} label="รายละเอียด" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                    >
                      <Icon name="edit" className="text-base" />
                      แก้ไข
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            หน้า {safePage} / {totalPages} ({rows.length} รายการ)
          </p>
          <div className="flex gap-2">
            {safePage > 1 && (
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                className="rounded-lg border border-outline-variant px-4 py-2 font-label-caps text-label-caps transition-colors hover:border-primary"
              >
                ก่อนหน้า
              </button>
            )}
            {safePage < totalPages && (
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                className="rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                ถัดไป
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
