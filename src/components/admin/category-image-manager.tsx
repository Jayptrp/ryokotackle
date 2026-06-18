"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  clearCategoryImage,
  saveCategoryDisclaimer,
  setCategoryImageProduct,
  setCategoryImageUrl,
} from "@/app/admin/home/actions";
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
  /** Published products (with a primary image) in this category to choose from. */
  products: CategoryProduct[];
}

const DEFAULT_DISCLAIMER =
  "ในหมวดหมู่นี้ สินค้าบางรายการอาจต้องการการระบุรุ่นหรือรายละเอียดเพิ่มเติมเพื่อความถูกต้องในการจัดส่ง " +
  "หากท่านต้องการอะไหล่สำหรับซ่อมแซม หรือต้องการชิ้นส่วนเฉพาะส่วน กรุณาติดต่อทีมงาน Ryoko โดยตรง " +
  "เพื่อให้เราสามารถแนะนำและจัดหาสินค้าที่ตรงตามความต้องการของท่านได้อย่างถูกต้องและแม่นยำ";

function CategoryCardEditor({ row }: { row: CategoryRow }) {
  const [imageUrl, setImageUrl] = useState(row.imageUrl);
  const [productId, setProductId] = useState(row.imageProductId);
  const [preview, setPreview] = useState(row.resolved);
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Disclaimer modal
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerText, setDisclaimerText] = useState(row.disclaimer ?? "");
  const [savingDisclaimer, setSavingDisclaimer] = useState(false);

  function openDisclaimer() {
    setDisclaimerText(row.disclaimer ?? DEFAULT_DISCLAIMER);
    setDisclaimerOpen(true);
  }

  async function handleSaveDisclaimer() {
    setSavingDisclaimer(true);
    await saveCategoryDisclaimer(row.id, disclaimerText);
    setSavingDisclaimer(false);
    setDisclaimerOpen(false);
  }

  const autoImage = row.products[0]?.image ?? null;

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
    fd.set("folder", `category/${row.slug}`);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setImageUrl(url);
      setProductId(null);
      setPreview(url);
      startTransition(() => setCategoryImageUrl(row.id, url));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function selectProduct(p: CategoryProduct) {
    setProductId(p.id);
    setImageUrl(null);
    setPreview(p.image);
    setPicking(false);
    setQ("");
    startTransition(() => setCategoryImageProduct(row.id, p.id));
  }

  function handleClear() {
    setImageUrl(null);
    setProductId(null);
    setPreview(autoImage);
    setPicking(false);
    startTransition(() => clearCategoryImage(row.id));
  }

  const mode = imageUrl ? "uploaded" : productId ? "product" : "auto";

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            <button
              type="button"
              onClick={openDisclaimer}
              title="แก้ไขข้อความแจ้งเตือนในหน้าหมวดหมู่"
              className={`ml-auto flex items-center gap-1 rounded-lg border px-2.5 py-1 font-label-caps text-label-caps transition-colors ${
                row.disclaimer
                  ? "border-secondary/50 bg-secondary-container/30 text-secondary hover:bg-secondary-container/60"
                  : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              <Icon name="edit" className="text-base" />
              
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || isPending}
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
              disabled={isPending || row.products.length === 0}
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
                disabled={isPending}
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
      {picking && (
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
              const selected = p.id === productId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProduct(p)}
                  disabled={isPending}
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

      {/* Disclaimer modal */}
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
                onClick={handleSaveDisclaimer}
                disabled={savingDisclaimer}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                {savingDisclaimer && <Icon name="hourglass_top" className="animate-spin text-base" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CategoryImageManager({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {categories.map((row) => (
        <CategoryCardEditor key={row.id} row={row} />
      ))}
    </div>
  );
}
