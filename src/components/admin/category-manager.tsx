"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { saveCategories } from "@/app/admin/categories/actions";
import { Icon } from "@/components/icon";
import { isValidSlug, slugify } from "@/lib/slug";
import type { CategoryAdminNode, CategoryProductRow } from "@/lib/types";

/* ------------------------------------------------------------------- types */

interface Row {
  /** Stable client key (survives reorder / reparent); not the DB id. */
  key: string;
  /** DB id, or null for a not-yet-persisted row. */
  id: string | null;
  /** Client key of the parent top-level row, or null for a top-level row. */
  parentKey: string | null;
  name: string;
  nameTh: string;
  slug: string;
  icon: string;
  /** Products directly in this category (any status); 0 for new rows. */
  productCount: number;
  /** Once the admin edits the slug we stop auto-deriving it from the name. */
  slugTouched: boolean;
}

interface StagedDelete {
  row: Row;
  /** DB id the products reassign to (null = uncategorized). */
  reassignTo: string | null;
  /** Human label for the reassignment target (for the pending list). */
  reassignLabel: string;
}

let keySeq = 0;
const nextKey = () => `cat-${keySeq++}`;

const labelOf = (r: { nameTh: string; name: string }) =>
  r.nameTh.trim() || r.name.trim() || "(ยังไม่ได้ตั้งชื่อ)";

/** Tops first, each immediately followed by its children — the render/order form. */
function canonical(rowList: Row[]): Row[] {
  const tops = rowList.filter((r) => r.parentKey === null);
  const out: Row[] = [];
  for (const t of tops) {
    out.push(t);
    for (const c of rowList) if (c.parentKey === t.key) out.push(c);
  }
  // Safety: keep any row whose parent vanished (shouldn't happen) as top-level.
  for (const r of rowList) if (!out.includes(r)) out.push({ ...r, parentKey: null });
  return out;
}

function toRows(nodes: CategoryAdminNode[]): Row[] {
  const keyById = new Map<string, string>();
  const rows: Row[] = nodes.map((n) => {
    const key = nextKey();
    keyById.set(n.id, key);
    return {
      key,
      id: n.id,
      parentKey: null,
      name: n.name,
      nameTh: n.nameTh ?? "",
      slug: n.slug,
      icon: n.icon ?? "",
      productCount: n.productCount,
      slugTouched: true,
    };
  });
  nodes.forEach((n, i) => {
    rows[i].parentKey = n.parentId ? keyById.get(n.parentId) ?? null : null;
  });
  return canonical(rows);
}

function inputCls(dirty: boolean) {
  return dirty
    ? "border-error/60 ring-1 ring-error/20 focus:border-error/60 focus:ring-error/20"
    : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20";
}

/* ------------------------------------------------------------------ manager */

export function CategoryManager({
  initialNodes,
  products,
}: {
  initialNodes: CategoryAdminNode[];
  products: CategoryProductRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(() => toRows(initialNodes));
  const [deleted, setDeleted] = useState<StagedDelete[]>([]);
  // Last-saved baseline (same client keys as `orig`) — restored on revert.
  const baseline = useRef<Row[]>(rows);

  // Delete-flow modals.
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<Row | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);

  // Stable label map (by DB id) for the reference table — safe across renames.
  const catLabelById = useMemo(
    () => new Map(initialNodes.map((n) => [n.id, n.nameTh ?? n.name])),
    [initialNodes],
  );

  const snapshot = (rs: Row[]) => ({
    byKey: new Map(
      rs.map((r) => [
        r.key,
        { name: r.name, nameTh: r.nameTh, slug: r.slug, icon: r.icon, parentKey: r.parentKey },
      ]),
    ),
    keys: rs.map((r) => r.key),
  });
  const orig = useRef(snapshot(rows));

  const fieldDirty = (r: Row) => {
    const o = orig.current.byKey.get(r.key);
    if (!o) return { name: true, nameTh: true, slug: true, icon: true, parent: true };
    return {
      name: r.name !== o.name,
      nameTh: r.nameTh !== o.nameTh,
      slug: r.slug !== o.slug,
      icon: r.icon !== o.icon,
      parent: r.parentKey !== o.parentKey,
    };
  };
  const rowDirty = (r: Row) => Object.values(fieldDirty(r)).some(Boolean);

  const structureChanged =
    rows.length !== orig.current.keys.length ||
    rows.some((r, i) => r.key !== orig.current.keys[i]);
  const isDirty = structureChanged || deleted.length > 0 || rows.some(rowDirty);

  const topRows = rows.filter((r) => r.parentKey === null);
  const childrenOf = (key: string) => rows.filter((r) => r.parentKey === key);

  /* ── mutations ─────────────────────────────────────────────────────────── */
  function patchRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function editName(key: string, name: string) {
    setRows((rs) =>
      rs.map((r) =>
        r.key === key
          ? { ...r, name, slug: r.slugTouched ? r.slug : slugify(name) }
          : r,
      ),
    );
  }
  function editSlug(key: string, slug: string) {
    patchRow(key, { slug: slug.toLowerCase(), slugTouched: true });
  }
  function setParent(key: string, parentKey: string | null) {
    setRows((rs) => canonical(rs.map((r) => (r.key === key ? { ...r, parentKey } : r))));
  }
  function addTop() {
    setRows((rs) =>
      canonical([
        ...rs,
        { key: nextKey(), id: null, parentKey: null, name: "", nameTh: "", slug: "", icon: "", productCount: 0, slugTouched: false },
      ]),
    );
  }
  function addSub(parentKey: string) {
    setRows((rs) =>
      canonical([
        ...rs,
        { key: nextKey(), id: null, parentKey, name: "", nameTh: "", slug: "", icon: "", productCount: 0, slugTouched: false },
      ]),
    );
  }
  function dropRow(key: string) {
    setRows((rs) => canonical(rs.filter((r) => r.key !== key)));
  }

  /* ── delete flow ───────────────────────────────────────────────────────── */
  function reassignTargetOf(row: Row): { id: string | null; label: string } {
    if (!row.parentKey) return { id: null, label: "ไม่มีหมวดหมู่ (uncategorized)" };
    const parent = rows.find((r) => r.key === row.parentKey);
    return { id: parent?.id ?? null, label: parent ? labelOf(parent) : "หมวดแม่" };
  }

  function requestDelete(row: Row) {
    if (childrenOf(row.key).length > 0) {
      setBlockedDelete(row);
      return;
    }
    if (row.id === null) {
      dropRow(row.key); // never persisted — just discard
      return;
    }
    if (row.productCount > 0) {
      setDeleteTarget(row); // needs the reassign confirmation
      return;
    }
    stageDelete(row); // existing + empty → stage straight away
  }
  function stageDelete(row: Row) {
    const target = reassignTargetOf(row);
    setDeleted((d) => [...d, { row, reassignTo: target.id, reassignLabel: target.label }]);
    dropRow(row.key);
  }
  function undoDelete(key: string) {
    setDeleted((d) => {
      const entry = d.find((x) => x.row.key === key);
      if (entry) setRows((rs) => canonical([...rs, entry.row]));
      return d.filter((x) => x.row.key !== key);
    });
  }

  /* ── drag reorder ──────────────────────────────────────────────────────── */
  function onDragEnd(result: DropResult) {
    const { source, destination, type, draggableId } = result;
    if (!destination) return;

    if (type === "top") {
      if (source.index === destination.index) return;
      const tops = rows.filter((r) => r.parentKey === null);
      const [moved] = tops.splice(source.index, 1);
      tops.splice(destination.index, 0, moved);
      const rebuilt: Row[] = [];
      for (const t of tops) {
        rebuilt.push(t);
        for (const c of rows) if (c.parentKey === t.key) rebuilt.push(c);
      }
      setRows(rebuilt);
      return;
    }

    // type === "sub": reorder within, or move across, parent sub-lists.
    const destParent = destination.droppableId.replace(/^sub-/, "");
    const moved = rows.find((r) => r.key === draggableId);
    if (!moved) return;
    const movedUpdated = { ...moved, parentKey: destParent };
    const others = rows.filter((r) => r.key !== moved.key);
    const rebuilt: Row[] = [];
    for (const t of others.filter((r) => r.parentKey === null)) {
      rebuilt.push(t);
      const kids = others.filter((r) => r.parentKey === t.key);
      if (t.key === destParent) kids.splice(destination.index, 0, movedUpdated);
      rebuilt.push(...kids);
    }
    setRows(rebuilt);
  }

  /* ── revert / save ─────────────────────────────────────────────────────── */
  function revertAll() {
    setRows(baseline.current.map((r) => ({ ...r })));
    setDeleted([]);
  }

  function validate(): string | null {
    for (const r of rows) {
      if (!r.name.trim() && !r.nameTh.trim())
        return `มีหมวดที่ยังไม่ได้ตั้งชื่อ (ไทยหรืออังกฤษ)`;
      if (!isValidSlug(r.slug))
        return `slug ของ "${labelOf(r)}" ไม่ถูกต้อง: "${r.slug || "(ว่าง)"}" — ใช้ได้เฉพาะ a-z, 0-9 และ -`;
    }
    const seen = new Set<string>();
    for (const r of rows) {
      if (seen.has(r.slug)) return `slug ซ้ำกัน: "${r.slug}"`;
      seen.add(r.slug);
    }
    return null;
  }

  // Existing categories carrying products that are being edited or deleted —
  // these are the SEO-affecting saves the admin should confirm.
  const affectedWithProducts = useMemo(() => {
    const out: { label: string; count: number; reason: string }[] = [];
    for (const r of rows) {
      if (!r.id || r.productCount === 0) continue;
      const d = fieldDirty(r);
      const reasons: string[] = [];
      if (d.slug) reasons.push("เปลี่ยน URL");
      if (d.parent) reasons.push("ย้ายหมวดแม่");
      if (d.name || d.nameTh) reasons.push("เปลี่ยนชื่อ");
      if (reasons.length)
        out.push({ label: labelOf(r), count: r.productCount, reason: reasons.join(" · ") });
    }
    for (const d of deleted) {
      if (d.row.productCount > 0)
        out.push({ label: labelOf(d.row), count: d.row.productCount, reason: `ลบ → ย้ายไป ${d.reassignLabel}` });
    }
    return out;
  }, [rows, deleted]);

  function attemptSave() {
    const err = validate();
    if (err) {
      alert(err);
      return;
    }
    if (affectedWithProducts.length > 0) {
      setConfirmSave(true);
      return;
    }
    doSave();
  }

  function doSave() {
    setConfirmSave(false);
    startTransition(async () => {
      try {
        const fresh = await saveCategories({
          categories: rows.map((r) => ({
            key: r.key,
            id: r.id,
            parentKey: r.parentKey,
            name: r.name,
            nameTh: r.nameTh.trim() || null,
            slug: r.slug,
            icon: r.icon.trim() || null,
          })),
          deletions: deleted.map((d) => ({ id: d.row.id!, reassignTo: d.reassignTo })),
        });
        const newRows = toRows(fresh);
        baseline.current = newRows;
        setRows(newRows);
        setDeleted([]);
        orig.current = snapshot(newRows);
      } catch (e) {
        alert(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      }
    });
  }

  const parentOptions = (row: Row) => {
    const hasChildren = childrenOf(row.key).length > 0;
    const opts = [{ value: "", label: "— หมวดหลัก (ไม่มีหมวดแม่) —" }];
    if (!hasChildren) {
      for (const t of topRows) {
        if (t.key === row.key) continue;
        opts.push({ value: t.key, label: labelOf(t) });
      }
    }
    return opts;
  };

  /* ───────────────────────────────────────────────────────────── render */
  return (
    <div className="flex flex-col gap-6">
      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {isDirty && !isPending && (
          <span className="font-body-sm text-body-sm text-error">มีการแก้ไข</span>
        )}
        {isDirty && !isPending && (
          <button
            type="button"
            onClick={revertAll}
            title="คืนค่าทั้งหมด"
            className="flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-2 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
          >
            <Icon name="restart_alt" className="text-base" />
            คืนค่าทั้งหมด
          </button>
        )}
        <button
          type="button"
          onClick={attemptSave}
          disabled={!isDirty || isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name={isPending ? "hourglass_top" : "save"} className={`text-base ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      {/* SEO caution */}
      <div className="flex gap-3 rounded-xl border border-secondary/30 bg-secondary-container/20 px-4 py-3">
        <Icon name="info" className="mt-0.5 flex-none text-base text-secondary" />
        <p className="font-body-sm text-body-sm leading-relaxed text-on-surface">
          การเปลี่ยน <b>slug (URL)</b> หรือ <b>หมวดแม่</b> ของหมวดที่มีสินค้า จะเปลี่ยนที่อยู่หน้า{" "}
          <code className="rounded bg-surface-container px-1">/category/…</code> และมีผลต่อ SEO —
          ลิงก์เดิมที่ถูกแชร์หรือถูก Google เก็บไว้จะใช้ไม่ได้ ควรเปลี่ยนเมื่อจำเป็นเท่านั้น
        </p>
      </div>

      {/* ── Section: category tree ──────────────────────────────────────── */}
      <section className={`rounded-xl border bg-surface-container-lowest p-6 shadow-sm transition-colors ${isDirty ? "border-error/50" : "border-outline-variant"}`}>
        <div className="mb-4">
          <h2 className="font-headline-sm text-headline-sm text-primary">โครงสร้างหมวดหมู่</h2>
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
            ลากเพื่อจัดลำดับ · เลือก &quot;หมวดแม่&quot; เพื่อย้ายเป็นหมวดย่อย · หมวดย่อยลากข้ามหมวดแม่ได้
          </p>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="tops" type="top">
            {(prov) => (
              <div ref={prov.innerRef} {...prov.droppableProps} className="flex flex-col gap-3">
                {topRows.map((top, i) => (
                  <Draggable key={top.key} draggableId={top.key} index={i}>
                    {(drag) => (
                      <div
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className="rounded-xl border border-outline-variant bg-surface-container-low p-3"
                      >
                        <div className="flex items-start gap-2">
                          <div {...drag.dragHandleProps} className="mt-2 flex cursor-grab items-center text-on-surface-variant" aria-label="ลากเพื่อจัดลำดับ">
                            <Icon name="drag_indicator" />
                          </div>
                          <div className="flex-1">
                            <RowEditor
                              row={top}
                              dirty={fieldDirty(top)}
                              parentOptions={parentOptions(top)}
                              onName={(v) => editName(top.key, v)}
                              onPatch={(p) => patchRow(top.key, p)}
                              onSlug={(v) => editSlug(top.key, v)}
                              onParent={(v) => setParent(top.key, v || null)}
                              onDelete={() => requestDelete(top)}
                            />
                          </div>
                        </div>

                        {/* sub-categories */}
                        <div className="ml-6 mt-3 border-l-2 border-outline-variant/60 pl-4">
                          <Droppable droppableId={`sub-${top.key}`} type="sub">
                            {(sprov) => (
                              <div ref={sprov.innerRef} {...sprov.droppableProps} className="flex flex-col gap-2">
                                {childrenOf(top.key).map((sub, j) => (
                                  <Draggable key={sub.key} draggableId={sub.key} index={j}>
                                    {(sdrag) => (
                                      <div ref={sdrag.innerRef} {...sdrag.draggableProps} className="flex items-start gap-2">
                                        <div {...sdrag.dragHandleProps} className="mt-2 flex cursor-grab items-center text-on-surface-variant" aria-label="ลากเพื่อจัดลำดับ">
                                          <Icon name="drag_indicator" className="text-base" />
                                        </div>
                                        <div className="flex-1">
                                          <RowEditor
                                            row={sub}
                                            isSub
                                            dirty={fieldDirty(sub)}
                                            parentOptions={parentOptions(sub)}
                                            onName={(v) => editName(sub.key, v)}
                                            onPatch={(p) => patchRow(sub.key, p)}
                                            onSlug={(v) => editSlug(sub.key, v)}
                                            onParent={(v) => setParent(sub.key, v || null)}
                                            onDelete={() => requestDelete(sub)}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {sprov.placeholder}
                              </div>
                            )}
                          </Droppable>
                          <button
                            type="button"
                            onClick={() => addSub(top.key)}
                            className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-outline-variant px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                          >
                            <Icon name="add" className="text-base" />
                            เพิ่มหมวดย่อย
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {prov.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button
          type="button"
          onClick={addTop}
          className="mt-4 flex items-center gap-1 rounded-lg border border-dashed border-outline-variant px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="add" className="text-base" />
          เพิ่มหมวดหลัก
        </button>
      </section>

      {/* ── Pending deletions ───────────────────────────────────────────── */}
      {deleted.length > 0 && (
        <section className="rounded-xl border border-error/50 bg-error-container/10 p-6">
          <h2 className="mb-3 font-headline-sm text-headline-sm text-error">จะถูกลบเมื่อกดบันทึก</h2>
          <div className="flex flex-col gap-2">
            {deleted.map((d) => (
              <div key={d.row.key} className="flex items-center gap-3 rounded-lg bg-surface-container-lowest px-3 py-2">
                <Icon name="delete_forever" className="flex-none text-base text-error" />
                <span className="font-body-sm text-body-sm text-on-surface">{labelOf(d.row)}</span>
                {d.row.productCount > 0 && (
                  <span className="font-body-xs text-body-xs text-on-surface-variant">
                    ย้ายสินค้า {d.row.productCount} รายการ → {d.reassignLabel}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => undoDelete(d.row.key)}
                  className="ml-auto flex items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
                >
                  <Icon name="undo" className="text-base" />
                  คืนค่า
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section: product reference table ────────────────────────────── */}
      <ProductReferenceTable products={products} catLabelById={catLabelById} />

      {/* ── delete confirmation (has products) ──────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          row={deleteTarget}
          target={reassignTargetOf(deleteTarget)}
          products={products.filter((p) => p.categoryId === deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            stageDelete(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}

      {/* ── delete blocked (has children) ───────────────────────────────── */}
      {blockedDelete && (
        <Modal onClose={() => setBlockedDelete(null)}>
          <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">ลบไม่ได้ — {labelOf(blockedDelete)}</h2>
          <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
            หมวดนี้มีหมวดย่อยอยู่ ต้องย้ายหรือลบหมวดย่อยเหล่านี้ก่อน:
          </p>
          <ul className="mb-4 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 font-body-sm text-body-sm text-on-surface">
            {childrenOf(blockedDelete.key).map((c) => (
              <li key={c.key}>{labelOf(c)}</li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setBlockedDelete(null)}
              className="rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </Modal>
      )}

      {/* ── save confirmation (SEO-affecting) ───────────────────────────── */}
      {confirmSave && (
        <Modal onClose={() => setConfirmSave(false)}>
          <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">ยืนยันการบันทึก</h2>
          <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
            การเปลี่ยนแปลงนี้กระทบหมวดที่มีสินค้าอยู่ และอาจเปลี่ยน URL (มีผลต่อ SEO):
          </p>
          <div className="mb-4 max-h-56 overflow-y-auto rounded-lg border border-outline-variant">
            <table className="w-full text-left font-body-sm text-body-sm">
              <tbody>
                {affectedWithProducts.map((a, i) => (
                  <tr key={i} className="border-b border-outline-variant last:border-0">
                    <td className="px-3 py-2 font-medium text-on-surface">{a.label}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{a.count} สินค้า</td>
                    <td className="px-3 py-2 text-secondary">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmSave(false)}
              className="rounded-lg border border-outline-variant px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={doSave}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              <Icon name="save" className="text-base" />
              ยืนยันบันทึก
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- row editor */

function RowEditor({
  row,
  isSub = false,
  dirty,
  parentOptions,
  onName,
  onPatch,
  onSlug,
  onParent,
  onDelete,
}: {
  row: Row;
  isSub?: boolean;
  dirty: { name: boolean; nameTh: boolean; slug: boolean; icon: boolean; parent: boolean };
  parentOptions: { value: string; label: string }[];
  onName: (v: string) => void;
  onPatch: (p: Partial<Row>) => void;
  onSlug: (v: string) => void;
  onParent: (v: string) => void;
  onDelete: () => void;
}) {
  const base = "rounded-lg border bg-white px-3 py-2 font-body-sm text-body-sm outline-none transition-all";
  return (
    <div className="rounded-lg border border-outline-variant/70 bg-white p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={row.nameTh}
          onChange={(e) => onPatch({ nameTh: e.target.value })}
          placeholder="ชื่อไทย (แสดงบนเว็บ)"
          className={`${base} ${inputCls(dirty.nameTh)}`}
        />
        <input
          value={row.name}
          onChange={(e) => onName(e.target.value)}
          placeholder="ชื่ออังกฤษ (ช่วยตั้ง slug)"
          className={`${base} ${inputCls(dirty.name)}`}
        />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className={`flex items-center rounded-lg border bg-white ${inputCls(dirty.slug)}`}>
          <span className="pl-3 font-body-xs text-body-xs text-on-surface-variant/70">/category/</span>
          <input
            value={row.slug}
            onChange={(e) => onSlug(e.target.value)}
            placeholder="slug"
            className="w-full rounded-r-lg bg-transparent px-1 py-2 font-body-sm text-body-sm outline-none"
          />
        </div>
        <select
          value={row.parentKey ?? ""}
          onChange={(e) => onParent(e.target.value)}
          title="หมวดแม่"
          className={`${base} ${inputCls(dirty.parent)}`}
        >
          {parentOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
          <Icon name={row.icon.trim() || "category"} className="text-lg" />
        </span>
        <input
          value={row.icon}
          onChange={(e) => onPatch({ icon: e.target.value })}
          placeholder={isSub ? "ไอคอน (ไม่บังคับ)" : "ไอคอน Material Symbol"}
          className={`w-44 ${base} ${inputCls(dirty.icon)}`}
        />
        <span className="font-body-xs text-body-xs text-on-surface-variant">
          {row.productCount > 0 ? `${row.productCount} สินค้า` : row.id ? "ไม่มีสินค้า" : "ใหม่"}
        </span>
        <button
          type="button"
          onClick={onDelete}
          title="ลบหมวดนี้"
          className="ml-auto flex-none rounded-lg border border-outline-variant p-2 text-on-surface-variant transition-colors hover:border-error hover:text-error"
        >
          <Icon name="delete" className="text-base" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- product reference */

const STATUS_META: Record<string, { label: string; cls: string }> = {
  published: { label: "เผยแพร่", cls: "bg-secondary-container/50 text-secondary" },
  hidden: { label: "ซ่อน", cls: "bg-surface-container text-on-surface-variant" },
  draft: { label: "ฉบับร่าง", cls: "bg-error-container/40 text-error" },
};

function ProductReferenceTable({
  products,
  catLabelById,
}: {
  products: CategoryProductRow[];
  catLabelById: Map<string, string>;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const catFilterOptions = useMemo(() => {
    const ids = new Set(products.map((p) => p.categoryId ?? "__none__"));
    const opts = [...ids].map((id) =>
      id === "__none__"
        ? { value: "__none__", label: "— ไม่มีหมวดหมู่ —" }
        : { value: id, label: catLabelById.get(id) ?? id },
    );
    opts.sort((a, b) => a.label.localeCompare(b.label, "th"));
    return opts;
  }, [products, catLabelById]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const inCat = !cat || (cat === "__none__" ? !p.categoryId : p.categoryId === cat);
      const inText =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.nameTh ?? "").toLowerCase().includes(term);
      return inCat && inText;
    });
  }, [products, q, cat]);

  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="font-headline-sm text-headline-sm text-primary">สินค้าตามหมวดหมู่</h2>
        <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
          รายการอ้างอิง (อ่านอย่างเดียว) — ค้นหาและกรองเพื่อดูว่าสินค้าอยู่ในหมวดใด ก่อนปรับโครงสร้างด้านบน
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาชื่อสินค้า..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 font-body-sm text-body-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 font-body-sm text-body-sm outline-none focus:border-primary"
        >
          <option value="">ทุกหมวดหมู่</option>
          {catFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-96 overflow-y-auto rounded-lg border border-outline-variant">
        <table className="w-full text-left font-body-sm text-body-sm">
          <thead className="sticky top-0 bg-surface-container">
            <tr className="text-on-surface-variant">
              <th className="px-3 py-2 font-medium">สินค้า</th>
              <th className="px-3 py-2 font-medium">หมวดหมู่</th>
              <th className="px-3 py-2 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const s = STATUS_META[p.status] ?? STATUS_META.draft;
              return (
                <tr key={p.id} className="border-t border-outline-variant">
                  <td className="px-3 py-2 text-on-surface">{p.nameTh ?? p.name}</td>
                  <td className="px-3 py-2 text-on-surface-variant">
                    {p.categoryId ? catLabelById.get(p.categoryId) ?? "—" : "— ไม่มีหมวดหมู่ —"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 font-label-caps text-label-caps ${s.cls}`}>
                      {s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-on-surface-variant">
                  ไม่พบสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-body-xs text-body-xs text-on-surface-variant">
        แสดง {filtered.length} จาก {products.length} รายการ
      </p>
    </section>
  );
}

/* -------------------------------------------------------------- modals */

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">{children}</div>
    </div>
  );
}

function DeleteModal({
  row,
  target,
  products,
  onCancel,
  onConfirm,
}: {
  row: Row;
  target: { id: string | null; label: string };
  products: CategoryProductRow[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onCancel}>
      <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">ลบหมวด — {labelOf(row)}</h2>
      <p className="mb-3 font-body-sm text-body-sm text-on-surface-variant">
        หมวดนี้มีสินค้า <b>{row.productCount}</b> รายการ หากลบ สินค้าจะถูกย้ายไปที่{" "}
        <b>{target.label}</b>
      </p>
      {products.length > 0 && (
        <ul className="mb-4 max-h-48 list-disc space-y-1 overflow-y-auto rounded-lg border border-outline-variant p-3 pl-6 font-body-sm text-body-sm text-on-surface">
          {products.map((p) => (
            <li key={p.id}>{p.nameTh ?? p.name}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-outline-variant px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center gap-2 rounded-lg bg-error px-5 py-2 font-label-caps text-label-caps text-on-error transition-colors hover:bg-error/90"
        >
          <Icon name="delete" className="text-base" />
          ลบและย้ายไป {target.label}
        </button>
      </div>
    </Modal>
  );
}
