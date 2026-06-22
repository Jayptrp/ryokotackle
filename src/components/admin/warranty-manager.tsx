"use client";

import { useRef, useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { saveWarranties } from "@/app/admin/warranty/actions";
import { Icon } from "@/components/icon";
import type { Warranty } from "@/lib/types";
import {
  WARRANTY_COLORS,
  WARRANTY_ICONS,
  warrantyBadgeCls,
} from "@/lib/warranty-style";

interface Row {
  /** Stable client key (survives reorder); not the DB id. */
  key: string;
  /** DB id, or null for a not-yet-persisted row. */
  id: string | null;
  name: string;
  detail: string;
  icon: string;
  color: string;
}

let keySeq = 0;
const nextKey = () => `w-${keySeq++}`;

function toRows(warranties: Warranty[]): Row[] {
  return warranties.map((w) => ({
    key: nextKey(),
    id: w.id,
    name: w.name,
    detail: w.detail ?? "",
    icon: w.icon,
    color: w.color,
  }));
}

function inputCls(dirty: boolean) {
  return dirty
    ? "border-error/60 ring-1 ring-error/20 focus:border-error/60 focus:ring-error/20"
    : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20";
}

// ── SectionBlock (mirrors product-editor.tsx) ─────────────────────────────────

function SectionBlock({
  title,
  subtitle,
  isDirty,
  onRevert,
  children,
}: {
  title: string;
  subtitle?: string;
  isDirty: boolean;
  onRevert: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border bg-surface-container-lowest p-6 shadow-sm transition-colors ${
        isDirty ? "border-error/50" : "border-outline-variant"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
              {subtitle}
            </p>
          )}
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={onRevert}
            title="คืนค่าเดิม"
            className="flex flex-none items-center gap-1 rounded-lg border border-error/40 px-2.5 py-1.5 font-label-caps text-label-caps text-error transition-colors hover:bg-error-container/30"
          >
            <Icon name="restart_alt" className="text-base" />
            คืนค่า
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

interface Props {
  initial: Warranty[];
  initialPage: { title: string; subtitle: string };
}

export function WarrantyManager({ initial, initialPage }: Props) {
  const [isPending, startTransition] = useTransition();

  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [title, setTitle] = useState(initialPage.title);
  const [subtitle, setSubtitle] = useState(initialPage.subtitle);

  // Original snapshot (keyed by client key) for per-field/section dirty tracking.
  const snapshot = (rs: Row[]) => ({
    rows: rs.map((r) => ({ ...r })),
    rowsByKey: new Map(
      rs.map((r) => [r.key, { name: r.name, detail: r.detail, icon: r.icon, color: r.color }]),
    ),
    keys: rs.map((r) => r.key),
  });

  const orig = useRef({
    ...snapshot(rows),
    title: initialPage.title,
    subtitle: initialPage.subtitle,
  });

  const rowDirty = (r: Row) => {
    const o = orig.current.rowsByKey.get(r.key);
    if (!o) return { name: true, detail: true, style: true }; // newly added
    return {
      name: r.name !== o.name,
      detail: r.detail !== o.detail,
      style: r.icon !== o.icon || r.color !== o.color,
    };
  };

  const orderChanged =
    rows.length !== orig.current.keys.length ||
    rows.some((r, i) => r.key !== orig.current.keys[i]);

  // Section 1 owns: membership (add/delete), order, names, and badge style.
  const typesDirty =
    orderChanged ||
    deletedIds.length > 0 ||
    rows.some((r) => {
      const d = rowDirty(r);
      return d.name || d.style;
    });

  // Section 2 owns: page title/subtitle, and each type's detail.
  const contentDirty =
    title !== orig.current.title ||
    subtitle !== orig.current.subtitle ||
    rows.some((r) => rowDirty(r).detail);

  const isDirty = typesDirty || contentDirty;

  // ── mutations ───────────────────────────────────────────────────────────
  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      { key: nextKey(), id: null, name: "", detail: "", icon: "verified_user", color: "blue" },
    ]);
  }
  function removeRow(key: string) {
    setRows((rs) => {
      const target = rs.find((r) => r.key === key);
      if (target?.id) setDeletedIds((ids) => [...ids, target.id!]);
      return rs.filter((r) => r.key !== key);
    });
  }
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    setRows((rs) => {
      const next = [...rs];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination!.index, 0, moved);
      return next;
    });
  }

  // Revert section 1 only: restore original membership/order/names/badge style,
  // but keep any detail edits the admin made to surviving rows (section 2's).
  function revertTypes() {
    const detailNow = new Map(rows.map((r) => [r.key, r.detail]));
    setRows(
      orig.current.rows.map((o) => ({
        key: o.key,
        id: o.id,
        name: o.name,
        icon: o.icon,
        color: o.color,
        detail: detailNow.has(o.key) ? detailNow.get(o.key)! : o.detail,
      })),
    );
    setDeletedIds([]);
  }

  // Revert section 2 only: restore title/subtitle and each surviving row's detail,
  // leaving names/order/membership untouched.
  function revertContent() {
    setTitle(orig.current.title);
    setSubtitle(orig.current.subtitle);
    setRows((rs) =>
      rs.map((r) => {
        const o = orig.current.rowsByKey.get(r.key);
        return o ? { ...r, detail: o.detail } : r;
      }),
    );
  }

  function handleSave() {
    if (rows.some((r) => !r.name.trim())) {
      alert("กรุณากรอกชื่อประเภทการรับประกันให้ครบทุกรายการ");
      return;
    }
    startTransition(async () => {
      const fresh = await saveWarranties({
        page: { title, subtitle },
        warranties: rows.map((r) => ({
          id: r.id,
          name: r.name,
          detail: r.detail,
          icon: r.icon,
          color: r.color,
        })),
        deletedIds,
      });
      const newRows = toRows(fresh);
      setRows(newRows);
      setDeletedIds([]);
      orig.current = { ...snapshot(newRows), title, subtitle };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Save bar — badge sits directly left of the save button */}
      <div className="flex items-center justify-end gap-3">
        {isDirty && !isPending && (
          <span className="font-body-sm text-body-sm text-error">มีการแก้ไข</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon
            name={isPending ? "hourglass_top" : "save"}
            className={`text-base ${isPending ? "animate-spin" : ""}`}
          />
          {isPending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      {/* ── Section 1: CRUD warranty types ─────────────────────────────── */}
      <SectionBlock
        title="จัดการประเภทการรับประกัน"
        subtitle="เพิ่ม แก้ไขชื่อ ลบ หรือลากเพื่อจัดลำดับ — ชื่อนี้จะแสดงเป็นแท็กในหน้าสินค้า"
        isDirty={typesDirty}
        onRevert={revertTypes}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="warranty-types">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-2"
              >
                {rows.map((r, i) => {
                  const d = rowDirty(r);
                  return (
                    <Draggable key={r.key} draggableId={r.key} index={i}>
                      {(drag) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className="flex items-center gap-2"
                        >
                          <div
                            {...drag.dragHandleProps}
                            className="flex cursor-grab items-center text-on-surface-variant"
                            aria-label="ลากเพื่อจัดลำดับ"
                          >
                            <Icon name="drag_indicator" />
                          </div>
                          {/* Live preview of the chosen icon + color */}
                          <span
                            className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${warrantyBadgeCls(r.color)}`}
                            title="ตัวอย่างไอคอน"
                          >
                            <Icon name={r.icon} className="text-lg" />
                          </span>
                          <input
                            value={r.name}
                            onChange={(e) => updateRow(r.key, { name: e.target.value })}
                            placeholder="ชื่อประเภทการรับประกัน"
                            className={`min-w-0 flex-1 rounded-lg border bg-white px-4 py-2.5 font-body-md text-body-md outline-none ${inputCls(d.name)}`}
                          />
                          <select
                            value={r.icon}
                            onChange={(e) => updateRow(r.key, { icon: e.target.value })}
                            title="ไอคอน"
                            className={`w-32 flex-none rounded-lg border bg-white px-2 py-2.5 font-body-sm text-body-sm outline-none ${inputCls(d.style)}`}
                          >
                            {WARRANTY_ICONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={r.color}
                            onChange={(e) => updateRow(r.key, { color: e.target.value })}
                            title="สี"
                            className={`w-24 flex-none rounded-lg border bg-white px-2 py-2.5 font-body-sm text-body-sm outline-none ${inputCls(d.style)}`}
                          >
                            {Object.entries(WARRANTY_COLORS).map(([key, c]) => (
                              <option key={key} value={key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeRow(r.key)}
                            className="flex-none rounded-lg border border-outline-variant p-2.5 text-on-surface-variant transition-colors hover:border-error hover:text-error"
                            title="ลบ"
                          >
                            <Icon name="delete" className="text-base" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button
          type="button"
          onClick={addRow}
          className="mt-4 flex items-center gap-1 rounded-lg border border-dashed border-outline-variant px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="add" className="text-base" />
          เพิ่มประเภทการรับประกัน
        </button>
      </SectionBlock>

      {/* ── Section 2: page content + details ──────────────────────────── */}
      <SectionBlock
        title="เนื้อหาหน้าการรับประกัน"
        subtitle="หัวข้อ คำบรรยาย และรายละเอียดของการรับประกันแต่ละประเภทที่แสดงในหน้า /warranty"
        isDirty={contentDirty}
        onRevert={revertContent}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-label-caps text-on-surface-variant">
              หัวข้อ
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`rounded-lg border bg-white px-4 py-2.5 font-body-md text-body-md outline-none ${inputCls(title !== orig.current.title)}`}
              placeholder="ประกันและอะไหล่"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-caps text-label-caps text-on-surface-variant">
              คำบรรยาย
            </label>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
              className={`resize-none rounded-lg border bg-white px-4 py-2.5 font-body-md text-body-md outline-none ${inputCls(subtitle !== orig.current.subtitle)}`}
              placeholder="คำบรรยายสั้น ๆ ใต้หัวข้อ"
            />
          </div>

          <div className="mt-2 border-t border-outline-variant pt-4">
            <h3 className="mb-3 font-label-caps text-label-caps text-on-surface-variant">
              รายละเอียดแต่ละประเภท
            </h3>
            {rows.length === 0 ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                ยังไม่มีประเภทการรับประกัน — เพิ่มได้ในส่วนด้านบน
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {rows.map((r) => {
                  const d = rowDirty(r);
                  return (
                    <div key={r.key} className="flex flex-col gap-1">
                      <label className="font-body-sm text-body-sm font-medium text-on-surface">
                        {r.name.trim() || "(ยังไม่ได้ตั้งชื่อ)"}
                      </label>
                      <textarea
                        value={r.detail}
                        onChange={(e) => updateRow(r.key, { detail: e.target.value })}
                        rows={3}
                        placeholder="รายละเอียดเงื่อนไขการรับประกัน"
                        className={`resize-y rounded-lg border bg-white px-4 py-2.5 font-body-md text-body-md outline-none ${inputCls(d.detail)}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}
