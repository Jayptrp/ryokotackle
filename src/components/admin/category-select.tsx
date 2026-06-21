"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";

export interface CatOption {
  id: string;
  slug: string;
  label: string; // nameTh ?? name
  parentSlug: string | null;
}

// Sentinels for not-yet-created categories. Kept in sync with the server's
// resolveCategoryId in src/app/admin/products/actions.ts.
const NEW_TOP = "__new_top__";
const NEW_SUB = "__new_sub__";

const selectCls =
  "w-full rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none focus:border-primary disabled:bg-surface-container disabled:opacity-60";
const addBtnCls =
  "flex flex-none items-center justify-center rounded-lg border border-outline-variant bg-white px-3 text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40";

/**
 * หมวดหมู่ (top) + หมวดหมู่ย่อย (sub) selectors with inline "add new". Submits a
 * single hidden `category_id` (the subcategory when chosen, otherwise the top).
 *
 * New categories are NOT written to the DB on click — they're staged locally and
 * created by the product's unified save (resolveCategoryId). While staged, the
 * effective id is a sentinel and the name travels in companion hidden inputs.
 */
export function CategorySelect({
  categories,
  defaultCategoryId,
  onCategoryChange,
}: {
  categories: CatOption[];
  defaultCategoryId: string | null;
  onCategoryChange?: (id: string | null) => void;
}) {
  const initial = useMemo(() => {
    const cur = categories.find((c) => c.id === defaultCategoryId);
    if (!cur) return { top: "", sub: "" };
    if (cur.parentSlug) {
      const parent = categories.find((c) => c.slug === cur.parentSlug);
      return { top: parent?.id ?? "", sub: cur.id };
    }
    return { top: cur.id, sub: "" };
  }, [categories, defaultCategoryId]);

  const [topId, setTopId] = useState(initial.top);
  const [subId, setSubId] = useState(initial.sub);
  const [addingTop, setAddingTop] = useState(false);
  const [addingSub, setAddingSub] = useState(false);
  const [newTop, setNewTop] = useState("");
  const [newSub, setNewSub] = useState("");
  // Staged (not-yet-saved) new category names.
  const [pendingTop, setPendingTop] = useState<string | null>(null);
  const [pendingSub, setPendingSub] = useState<string | null>(null);

  const tops = useMemo(() => categories.filter((c) => !c.parentSlug), [categories]);
  const isTopNew = topId === NEW_TOP;
  const topSlug = isTopNew ? null : (categories.find((c) => c.id === topId)?.slug ?? null);
  const subs = useMemo(
    () => (isTopNew ? [] : categories.filter((c) => c.parentSlug === topSlug)),
    [categories, topSlug, isTopNew],
  );

  const categoryId = subId || topId;

  // Notify parent whenever the effective category id changes.
  const cbRef = useRef(onCategoryChange);
  cbRef.current = onCategoryChange;
  useEffect(() => { cbRef.current?.(categoryId || null); }, [categoryId]);

  function pickTop(id: string) {
    setTopId(id);
    setSubId("");
    setPendingSub(null); // a staged sub belongs to the previously selected top
    if (id !== NEW_TOP) setPendingTop(null); // dropped the staged new top
  }

  function stageTop() {
    const name = newTop.trim();
    if (!name) return;
    setPendingTop(name);
    setTopId(NEW_TOP);
    setSubId("");
    setPendingSub(null);
    setNewTop("");
    setAddingTop(false);
  }

  function stageSub() {
    const name = newSub.trim();
    if (!name || !topId) return;
    setPendingSub(name);
    setSubId(NEW_SUB);
    setNewSub("");
    setAddingSub(false);
  }

  return (
    <>
      <input type="hidden" name="category_id" value={categoryId} />
      {isTopNew && <input type="hidden" name="new_top_name" value={pendingTop ?? ""} />}
      {subId === NEW_SUB && (
        <>
          <input type="hidden" name="new_sub_name" value={pendingSub ?? ""} />
          <input
            type="hidden"
            name="new_sub_parent_id"
            value={isTopNew ? NEW_TOP : topId}
          />
        </>
      )}

      {/* หมวดหมู่ */}
      <div className="flex flex-col gap-1">
        <label className="font-label-caps text-label-caps text-on-surface-variant">
          หมวดหมู่
        </label>
        <div className="flex gap-2">
          <select value={topId} onChange={(e) => pickTop(e.target.value)} className={selectCls}>
            <option value="">— เลือกหมวดหมู่ —</option>
            {tops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            {pendingTop && <option value={NEW_TOP}>{pendingTop} (ใหม่)</option>}
          </select>
          <button
            type="button"
            onClick={() => setAddingTop((v) => !v)}
            className={addBtnCls}
            aria-label="เพิ่มหมวดหมู่"
          >
            <Icon name={addingTop ? "close" : "add"} />
          </button>
        </div>
        {addingTop && (
          <div className="mt-1 flex gap-2">
            <input
              value={newTop}
              onChange={(e) => setNewTop(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); stageTop(); } }}
              placeholder="ชื่อหมวดหมู่ใหม่"
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={stageTop}
              disabled={!newTop.trim()}
              className="flex-none rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              เพิ่ม
            </button>
          </div>
        )}
      </div>

      {/* หมวดหมู่ย่อย */}
      <div className="flex flex-col gap-1">
        <label className="font-label-caps text-label-caps text-on-surface-variant">
          หมวดหมู่ย่อย <span className="text-on-surface-variant/60">(ถ้ามี)</span>
        </label>
        <div className="flex gap-2">
          <select
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
            disabled={!topId}
            className={selectCls}
          >
            <option value="">— ไม่มีหมวดหมู่ย่อย —</option>
            {subs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
            {pendingSub && <option value={NEW_SUB}>{pendingSub} (ใหม่)</option>}
          </select>
          <button
            type="button"
            onClick={() => setAddingSub((v) => !v)}
            disabled={!topId}
            className={addBtnCls}
            aria-label="เพิ่มหมวดหมู่ย่อย"
          >
            <Icon name={addingSub ? "close" : "add"} />
          </button>
        </div>
        {addingSub && topId && (
          <div className="mt-1 flex gap-2">
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); stageSub(); } }}
              placeholder="ชื่อหมวดหมู่ย่อยใหม่"
              className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={stageSub}
              disabled={!newSub.trim()}
              className="flex-none rounded-lg bg-primary px-4 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              เพิ่ม
            </button>
          </div>
        )}
        {!topId && (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            เลือกหมวดหมู่ก่อนเพื่อเลือกหรือเพิ่มหมวดหมู่ย่อย
          </p>
        )}
        {(pendingTop || pendingSub) && (
          <p className="font-body-sm text-body-sm text-secondary">
            หมวดหมู่ใหม่จะถูกสร้างเมื่อกดบันทึกข้อมูล
          </p>
        )}
      </div>
    </>
  );
}
