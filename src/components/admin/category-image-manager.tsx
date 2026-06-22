"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { saveCategoriesAll } from "@/app/admin/home/actions";
import { Icon } from "@/components/icon";
import { compressImage } from "@/lib/compress-image";

export interface CategoryProduct {
  id: string;
  label: string;
  image: string;
}

export interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  imageUrl: string | null;
  imageProductId: string | null;
  disclaimer: string | null;
  /** Currently resolved background (uploaded → product → auto-pick). */
  resolved: string | null;
  /** Has sub-categories — blocks deletion (would orphan the children). */
  hasChildren: boolean;
  /** Published products (with a primary image) in this category to choose from. */
  products: CategoryProduct[];
}

/** The per-category mutable fields. Everything else on a row is read-only metadata. */
interface EditState {
  imageUrl: string | null;
  imageProductId: string | null;
  disclaimer: string;
}

function toEdit(row: CategoryRow): EditState {
  return {
    imageUrl: row.imageUrl,
    imageProductId: row.imageProductId,
    disclaimer: row.disclaimer ?? "",
  };
}

function isDirty(a: EditState, b: EditState): boolean {
  return (
    a.imageUrl !== b.imageUrl ||
    a.imageProductId !== b.imageProductId ||
    a.disclaimer !== b.disclaimer
  );
}

/* ------------------------------------------------------------------- manager */

export function CategoryImageManager({ categories }: { categories: CategoryRow[] }) {
  // `rows` holds read-only metadata; `edits` holds the staged values; `orig` is
  // the last-saved baseline used for dirty tracking. Nothing hits the DB until
  // "บันทึก" — the same unified-save pattern as the carousel manager.
  const [rows, setRows] = useState(categories);
  const [edits, setEdits] = useState<EditState[]>(() => categories.map(toEdit));
  const [orig, setOrig] = useState<EditState[]>(() => categories.map(toEdit));
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, startSaving] = useTransition();

  const dirtyFlags = rows.map(
    (r, i) => deletedIds.includes(r.id) || isDirty(edits[i], orig[i]),
  );
  const anyDirty = dirtyFlags.some(Boolean);

  function patch(i: number, partial: Partial<EditState>) {
    setEdits((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...partial } : e)));
  }

  function toggleDelete(i: number) {
    const id = rows[i].id;
    setDeletedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function revertOne(i: number) {
    setEdits((prev) => prev.map((e, idx) => (idx === i ? { ...orig[i] } : e)));
    setDeletedIds((prev) => prev.filter((x) => x !== rows[i].id));
  }

  function revertAll() {
    setEdits(orig.map((e) => ({ ...e })));
    setDeletedIds([]);
  }

  function handleSave() {
    startSaving(async () => {
      await saveCategoriesAll({
        categories: rows
          .map((r, i) => ({ r, e: edits[i] }))
          .filter(({ r }) => !deletedIds.includes(r.id))
          .map(({ r, e }) => ({
            id: r.id,
            imageUrl: e.imageUrl,
            imageProductId: e.imageProductId,
            disclaimer: e.disclaimer,
          })),
        deletedIds,
      });

      // Drop deleted rows locally and re-baseline the survivors.
      const keep = rows
        .map((r, i) => ({ r, e: edits[i] }))
        .filter(({ r }) => !deletedIds.includes(r.id));
      setRows(
        keep.map(({ r, e }) => ({
          ...r,
          imageUrl: e.imageUrl,
          imageProductId: e.imageProductId,
          disclaimer: e.disclaimer.trim() || null,
        })),
      );
      setEdits(keep.map(({ e }) => ({ ...e })));
      setOrig(keep.map(({ e }) => ({ ...e })));
      setDeletedIds([]);
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
        {rows.map((row, i) => (
          <CategoryCardEditor
            key={row.id}
            row={row}
            edit={edits[i]}
            dirty={dirtyFlags[i]}
            markedDeleted={deletedIds.includes(row.id)}
            disabled={saving}
            onPatch={(partial) => patch(i, partial)}
            onToggleDelete={() => toggleDelete(i)}
            onRevert={() => revertOne(i)}
          />
        ))}
      </div>

      <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">
        การเปลี่ยนรูป ข้อความแจ้งเตือน และการลบหมวดหมู่ จะมีผลเมื่อกด
        &quot;บันทึกการเปลี่ยนแปลง&quot; เท่านั้น — ลบได้เฉพาะหมวดหมู่ที่ไม่มีสินค้าและไม่มีหมวดย่อย
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- card editor */

function CategoryCardEditor({
  row,
  edit,
  dirty,
  markedDeleted,
  disabled,
  onPatch,
  onToggleDelete,
  onRevert,
}: {
  row: CategoryRow;
  edit: EditState;
  dirty: boolean;
  markedDeleted: boolean;
  disabled: boolean;
  onPatch: (partial: Partial<EditState>) => void;
  onToggleDelete: () => void;
  onRevert: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Disclaimer modal (local until "ใช้ข้อความนี้" stages it into `edit`).
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerText, setDisclaimerText] = useState(edit.disclaimer);

  const autoImage = row.products[0]?.image ?? null;
  const productImage = edit.imageProductId
    ? (row.products.find((p) => p.id === edit.imageProductId)?.image ?? null)
    : null;
  const preview = edit.imageUrl ?? productImage ?? autoImage;
  const mode = edit.imageUrl ? "uploaded" : edit.imageProductId ? "product" : "auto";

  const canDelete = row.products.length === 0 && !row.hasChildren;
  const deleteReason = row.hasChildren
    ? "ลบไม่ได้: มีหมวดย่อยอยู่"
    : row.products.length > 0
      ? "ลบไม่ได้: ยังมีสินค้าในหมวดนี้"
      : "ลบหมวดหมู่นี้";

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term
      ? row.products.filter((p) => p.label.toLowerCase().includes(term))
      : row.products;
  }, [q, row.products]);

  function openDisclaimer() {
    setDisclaimerText(edit.disclaimer);
    setDisclaimerOpen(true);
  }

  function applyDisclaimer() {
    onPatch({ disclaimer: disclaimerText });
    setDisclaimerOpen(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const upload = await compressImage(file);
    const fd = new FormData();
    fd.set("file", upload);
    fd.set("productId", "home");
    fd.set("folder", `category/${row.slug}`);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      onPatch({ imageUrl: url, imageProductId: null });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function selectProduct(p: CategoryProduct) {
    onPatch({ imageProductId: p.id, imageUrl: null });
    setPicking(false);
    setQ("");
  }

  function handleClear() {
    onPatch({ imageUrl: null, imageProductId: null });
    setPicking(false);
  }

  const controlsDisabled = disabled || markedDeleted;

  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${
        markedDeleted
          ? "border-error bg-error-container/10"
          : dirty
            ? "border-error/50 bg-surface-container-lowest"
            : "border-outline-variant bg-surface-container-lowest"
      }`}
    >
      {/* Marked-for-deletion banner */}
      {markedDeleted && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-error-container/40 px-3 py-2">
          <Icon name="delete_forever" className="text-base text-error" />
          <span className="flex-1 font-body-sm text-body-sm text-error">
            หมวดหมู่นี้จะถูกลบเมื่อกดบันทึก
          </span>
          <button
            type="button"
            onClick={onRevert}
            className="flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
          >
            <Icon name="undo" className="text-base" />
            คืนค่า
          </button>
        </div>
      )}

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${
          markedDeleted ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {/* Preview */}
        <div className="relative h-28 w-full flex-none overflow-hidden rounded-lg bg-surface-container sm:w-44">
          {preview ? (
            <Image src={preview} alt={row.label} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-on-surface-variant">
              <Icon name="image" className="text-3xl" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2">
            <Icon name={row.icon ?? "category"} className="text-base text-white" />
            <span className="font-label-caps text-label-caps text-white">{row.label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-body-md text-body-md font-medium text-on-surface">
              {row.label}
            </span>
            <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-label-caps text-on-surface-variant">
              {mode === "uploaded"
                ? "รูปอัปโหลด"
                : mode === "product"
                  ? "รูปจากสินค้า"
                  : "อัตโนมัติ"}
            </span>

            {/* Per-card revert (in-place edits) */}
            {dirty && !markedDeleted && (
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

            {/* Disclaimer editor */}
            <button
              type="button"
              onClick={openDisclaimer}
              disabled={controlsDisabled}
              title="แก้ไขข้อความแจ้งเตือนในหน้าหมวดหมู่"
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-label-caps text-label-caps transition-colors disabled:opacity-50 ${
                dirty && !markedDeleted ? "" : "ml-auto"
              } ${
                edit.disclaimer
                  ? "border-secondary/50 bg-secondary-container/30 text-secondary hover:bg-secondary-container/60"
                  : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              <Icon name="edit_note" className="text-base" />
            </button>

            {/* Delete category */}
            <button
              type="button"
              onClick={onToggleDelete}
              disabled={controlsDisabled || !canDelete}
              title={deleteReason}
              className="flex items-center gap-1 rounded-lg border border-outline-variant px-2 py-1 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-error hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="delete" className="text-base" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={controlsDisabled || uploading}
              className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {uploading ? (
                <Icon name="hourglass_top" className="animate-spin text-base text-secondary" />
              ) : (
                <Icon name="upload" className="text-base" />
              )}
              อัปโหลดรูป
            </button>

            <span className="font-label-caps text-label-caps text-on-surface-variant">หรือ</span>

            <button
              type="button"
              onClick={() => setPicking((v) => !v)}
              disabled={controlsDisabled || row.products.length === 0}
              className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            >
              <Icon name="grid_view" className="text-base" />
              {row.products.length ? "เลือกจากสินค้า" : "ไม่มีสินค้าในหมวดนี้"}
              {row.products.length > 0 && (
                <Icon name={picking ? "expand_less" : "expand_more"} className="text-base" />
              )}
            </button>

            {mode !== "auto" && (
              <button
                type="button"
                onClick={handleClear}
                disabled={controlsDisabled}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-error"
              >
                <Icon name="restart_alt" className="text-base" />
                ใช้อัตโนมัติ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual product picker */}
      {picking && !markedDeleted && (
        <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-3">
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
          <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
            {filtered.map((p) => {
              const selected = p.id === edit.imageProductId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProduct(p)}
                  title={p.label}
                  className={`group relative overflow-hidden rounded-lg border bg-surface-container text-left transition-all ${
                    selected
                      ? "border-primary ring-2 ring-primary"
                      : "border-outline-variant hover:border-primary"
                  }`}
                >
                  <div className="relative aspect-square w-full">
                    <Image src={p.image} alt={p.label} fill className="object-cover" unoptimized />
                    {selected && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
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

      {/* Disclaimer modal — edits are staged into `edit`, persisted on save */}
      {disclaimerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDisclaimerOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">
              ข้อความแจ้งเตือน — {row.label}
            </h2>
            <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
              แสดงระหว่างหัวหมวดหมู่กับรายการสินค้า เว้นว่างเพื่อซ่อน
            </p>
            <textarea
              rows={6}
              value={disclaimerText}
              onChange={(e) => setDisclaimerText(e.target.value)}
              className="w-full resize-y rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="ข้อความที่ต้องการแสดงในหน้าหมวดหมู่..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisclaimerOpen(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={applyDisclaimer}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                <Icon name="check" className="text-base" />
                ใช้ข้อความนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
