"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { saveFeatured } from "@/app/admin/home/actions";
import { Icon } from "@/components/icon";
import { compressImage } from "@/lib/compress-image";

export interface FeaturedProduct {
  id: string;
  label: string;
  image: string | null;
  isFeatured: boolean;
}

export interface FeaturedCategoryRow {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  /** Admin-uploaded 3:1 banner for this category's featured section (or null). */
  bannerUrl: string | null;
  /** Published products in this (top-level) category to feature. */
  products: FeaturedProduct[];
}

/** The per-category mutable fields. Everything else on a row is read-only. */
interface EditState {
  bannerUrl: string | null;
  /** Ids of the products marked featured (sorted for stable comparison). */
  featuredIds: string[];
}

function isDirty(a: EditState, b: EditState): boolean {
  return (
    a.bannerUrl !== b.bannerUrl ||
    a.featuredIds.join(",") !== b.featuredIds.join(",")
  );
}

/* ------------------------------------------------------------------- manager */

export function FeaturedManager({
  categories,
}: {
  categories: FeaturedCategoryRow[];
}) {
  const makeEdits = () =>
    categories.map<EditState>((c) => ({
      bannerUrl: c.bannerUrl,
      featuredIds: c.products.filter((p) => p.isFeatured).map((p) => p.id).sort(),
    }));

  // `categories` is read-only metadata; `edits` holds staged values; `orig` is
  // the last-saved baseline for dirty tracking. Nothing hits the DB until
  // "บันทึก" — the same unified-save pattern as the category image manager.
  const [edits, setEdits] = useState<EditState[]>(makeEdits);
  const [orig, setOrig] = useState<EditState[]>(makeEdits);
  const [saving, startSaving] = useTransition();

  const dirtyFlags = categories.map((_, i) => isDirty(edits[i], orig[i]));
  const anyDirty = dirtyFlags.some(Boolean);

  function patch(i: number, partial: Partial<EditState>) {
    setEdits((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...partial } : e)));
  }

  function toggleFeatured(i: number, productId: string) {
    setEdits((prev) =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        const has = e.featuredIds.includes(productId);
        const featuredIds = has
          ? e.featuredIds.filter((id) => id !== productId)
          : [...e.featuredIds, productId].sort();
        return { ...e, featuredIds };
      }),
    );
  }

  function revertOne(i: number) {
    setEdits((prev) =>
      prev.map((e, idx) =>
        idx === i ? { ...orig[i], featuredIds: [...orig[i].featuredIds] } : e,
      ),
    );
  }

  function revertAll() {
    setEdits(orig.map((e) => ({ ...e, featuredIds: [...e.featuredIds] })));
  }

  function handleSave() {
    startSaving(async () => {
      const featured: string[] = [];
      const unfeatured: string[] = [];
      const banners: { categoryId: string; bannerUrl: string | null }[] = [];

      categories.forEach((c, i) => {
        const e = edits[i];
        const o = orig[i];
        if (e.bannerUrl !== o.bannerUrl) {
          banners.push({ categoryId: c.id, bannerUrl: e.bannerUrl });
        }
        const origSet = new Set(o.featuredIds);
        const editSet = new Set(e.featuredIds);
        for (const id of editSet) if (!origSet.has(id)) featured.push(id);
        for (const id of origSet) if (!editSet.has(id)) unfeatured.push(id);
      });

      await saveFeatured({ featured, unfeatured, banners });
      setOrig(edits.map((e) => ({ ...e, featuredIds: [...e.featuredIds] })));
    });
  }

  return (
    <div>
      {/* Save-all bar */}
      <div className="mb-4 flex items-center justify-end gap-3">
        {anyDirty && !saving && (
          <>
            <span className="font-body-sm text-body-sm text-error">
              มีการเปลี่ยนแปลงที่ยังไม่บันทึก
            </span>
            <button
              type="button"
              onClick={revertAll}
              title="คืนค่าทั้งหมด"
              className="flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-2 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
            >
              <Icon name="restart_alt" className="text-base" />
              คืนค่าทั้งหมด
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !anyDirty}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          <Icon
            name={saving ? "hourglass_top" : "save"}
            className={saving ? "animate-spin text-base" : "text-base"}
          />
          {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((row, i) => (
          <FeaturedCategoryCard
            key={row.id}
            row={row}
            edit={edits[i]}
            dirty={dirtyFlags[i]}
            disabled={saving}
            onPatch={(partial) => patch(i, partial)}
            onToggleFeatured={(productId) => toggleFeatured(i, productId)}
            onRevert={() => revertOne(i)}
          />
        ))}
      </div>

      <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
        การเปลี่ยนแบนเนอร์และสินค้าแนะนำ จะมีผลเมื่อกด &quot;บันทึกการเปลี่ยนแปลง&quot; เท่านั้น
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- card editor */

function FeaturedCategoryCard({
  row,
  edit,
  dirty,
  disabled,
  onPatch,
  onToggleFeatured,
  onRevert,
}: {
  row: FeaturedCategoryRow;
  edit: EditState;
  dirty: boolean;
  disabled: boolean;
  onPatch: (partial: Partial<EditState>) => void;
  onToggleFeatured: (productId: string) => void;
  onRevert: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const featuredSet = useMemo(() => new Set(edit.featuredIds), [edit.featuredIds]);
  const featuredCount = edit.featuredIds.length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term
      ? row.products.filter((p) => p.label.toLowerCase().includes(term))
      : row.products;
  }, [q, row.products]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const upload = await compressImage(file);
    const fd = new FormData();
    fd.set("file", upload);
    fd.set("productId", "home");
    fd.set("folder", `featured-banner/${row.slug}`);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      onPatch({ bannerUrl: url });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        dirty
          ? "border-error/50 bg-surface-container-lowest"
          : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Icon name={row.icon ?? "category"} className="text-lg text-primary" />
        <span className="font-body-md text-body-md font-medium text-on-surface">
          {row.label}
        </span>
        <span className="rounded-full bg-secondary-container px-2 py-0.5 font-label-caps text-label-caps text-on-secondary-container">
          แนะนำ {featuredCount}
        </span>
        {dirty && (
          <button
            type="button"
            onClick={onRevert}
            title="คืนค่าหมวดหมู่นี้"
            className="ml-auto flex items-center gap-1 rounded-lg border border-error/40 px-2 py-1 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
          >
            <Icon name="undo" className="text-base" />
            คืนค่า
          </button>
        )}
      </div>

      {/* Full-width 3:1 banner preview */}
      <div className="relative mb-2 aspect-[3/1] w-full overflow-hidden rounded-lg bg-surface-container">
        {edit.bannerUrl ? (
          <Image src={edit.bannerUrl} alt={row.label} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-on-surface-variant">
            <Icon name="image" className="text-3xl" />
            <span className="font-label-caps text-label-caps">แบนเนอร์ 3:1</span>
          </div>
        )}
      </div>

      {/* Actions — upload / clear banner + toggle the product picker */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {uploading ? (
            <Icon name="hourglass_top" className="animate-spin text-base text-secondary" />
          ) : (
            <Icon name="upload" className="text-base" />
          )}
          {edit.bannerUrl ? "เปลี่ยนแบนเนอร์" : "อัปโหลดแบนเนอร์"}
        </button>
        {edit.bannerUrl && (
          <button
            type="button"
            onClick={() => onPatch({ bannerUrl: null })}
            disabled={disabled}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-error disabled:opacity-50"
          >
            <Icon name="delete" className="text-base" />
            ลบแบนเนอร์
          </button>
        )}

        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          disabled={disabled}
          className="ml-auto flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Icon name="grid_view" className="text-base" />
          เลือกสินค้า
          <Icon name={picking ? "expand_less" : "expand_more"} className="text-base" />
        </button>
      </div>

      {/* Product picker — click a product to toggle featured (green border) */}
      {picking && (
      <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
        <div className="relative mb-3">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`ค้นหาสินค้าใน ${row.label}...`}
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 font-body-sm text-body-sm outline-none focus:border-primary"
          />
        </div>
        <div className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
          {filtered.map((p) => {
            const selected = featuredSet.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggleFeatured(p.id)}
                disabled={disabled}
                aria-pressed={selected}
                title={p.label}
                className={`group relative overflow-hidden rounded-lg border-2 bg-surface-container text-left transition-all disabled:opacity-50 ${
                  selected
                    ? "border-green-500 ring-2 ring-green-500/40"
                    : "border-transparent hover:border-primary"
                }`}
              >
                <div className="relative aspect-square w-full">
                  {p.image ? (
                    <Image src={p.image} alt={p.label} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-on-surface-variant">
                      <Icon name="image" className="text-2xl" />
                    </div>
                  )}
                  {selected && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                      <Icon name="check" className="text-sm" />
                    </span>
                  )}
                </div>
                <p className="truncate px-1.5 py-1 font-body-sm text-body-sm text-on-surface">
                  {p.label}
                </p>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center font-body-sm text-body-sm text-on-surface-variant">
              ไม่พบสินค้า
            </p>
          )}
        </div>
      </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
