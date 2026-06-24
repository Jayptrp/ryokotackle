"use client";

import { useRef, useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { saveContact } from "@/app/admin/contact/actions";
import { Icon } from "@/components/icon";
import { BrandIcon } from "@/components/brand-icon";
import type { ContactCard } from "@/lib/types";

export interface ContactRow {
  intro: string | null;
  locationDesc: string | null;
  address: string | null;
  mapLat: number | null;
  mapLng: number | null;
}

// Curated icons for the contact cards (Brand logos & Material Symbols).
const CONTACT_ICONS = [
  { value: "phone", label: "โทรศัพท์" },
  { value: "smartphone", label: "มือถือ" },
  { value: "mail", label: "อีเมล" },
  { value: "line", label: "แชท / LINE" },
  { value: "location_on", label: "ที่ตั้ง" },
  { value: "schedule", label: "เวลาทำการ" },
  { value: "language", label: "เว็บไซต์" },
  { value: "print", label: "แฟกซ์" },
  { value: "store", label: "หน้าร้าน" },
  { value: "support_agent", label: "ฝ่ายบริการ" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "info", label: "อื่น ๆ" },
];

const labelCls = "font-label-caps text-label-caps text-on-surface-variant";
const fieldBase =
  "rounded-lg border bg-white px-4 py-3 font-body-md text-body-md outline-none transition-all";

function inputCls(dirty: boolean) {
  return dirty
    ? "border-error/60 ring-1 ring-error/20 focus:border-error/60 focus:ring-error/20"
    : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20";
}

interface CardRow {
  key: string;
  id: string | null;
  icon: string;
  label: string;
  value: string;
}

const LEGACY_MAP: Record<string, string> = {
  forum: "facebook",
  photo_camera: "instagram",
  play_circle: "youtube",
  music_note: "tiktok",
  chat: "line",
};
const mapLegacyIcon = (icon: string) => LEGACY_MAP[icon] ?? icon;

let keySeq = 0;
const nextKey = () => `c-${keySeq++}`;
const toRows = (cards: ContactCard[]): CardRow[] =>
  cards.map((c) => ({ key: nextKey(), id: c.id, icon: mapLegacyIcon(c.icon), label: c.label, value: c.value }));

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
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>
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

export function ContactEditor({
  contact,
  cards,
}: {
  contact: ContactRow;
  cards: ContactCard[];
}) {
  const [isPending, startTransition] = useTransition();

  const [intro, setIntro] = useState(contact.intro ?? "");
  const [locationDesc, setLocationDesc] = useState(contact.locationDesc ?? "");
  const [address, setAddress] = useState(contact.address ?? "");
  const [mapLat, setMapLat] = useState(contact.mapLat != null ? String(contact.mapLat) : "");
  const [mapLng, setMapLng] = useState(contact.mapLng != null ? String(contact.mapLng) : "");

  const [rows, setRows] = useState<CardRow[]>(() => toRows(cards));
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const cardSnapshot = (rs: CardRow[]) => ({
    cards: rs.map((r) => ({ ...r })),
    byKey: new Map(rs.map((r) => [r.key, { icon: r.icon, label: r.label, value: r.value }])),
    keys: rs.map((r) => r.key),
  });

  const orig = useRef({
    intro: contact.intro ?? "",
    locationDesc: contact.locationDesc ?? "",
    address: contact.address ?? "",
    mapLat: contact.mapLat != null ? String(contact.mapLat) : "",
    mapLng: contact.mapLng != null ? String(contact.mapLng) : "",
    ...cardSnapshot(rows),
  });

  const rowDirty = (r: CardRow) => {
    const o = orig.current.byKey.get(r.key);
    if (!o) return true; // newly added
    return r.icon !== o.icon || r.label !== o.label || r.value !== o.value;
  };
  const orderChanged =
    rows.length !== orig.current.keys.length ||
    rows.some((r, i) => r.key !== orig.current.keys[i]);

  const headerDirty = intro !== orig.current.intro;
  const contactDirty = orderChanged || deletedIds.length > 0 || rows.some(rowDirty);
  const locationDirty =
    locationDesc !== orig.current.locationDesc ||
    address !== orig.current.address ||
    mapLat !== orig.current.mapLat ||
    mapLng !== orig.current.mapLng;
  const isDirty = headerDirty || contactDirty || locationDirty;

  // ── card mutations ────────────────────────────────────────────────────────
  function updateRow(key: string, patch: Partial<CardRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { key: nextKey(), id: null, icon: "info", label: "", value: "" }]);
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

  // ── reverts ───────────────────────────────────────────────────────────────
  function revertHeader() {
    setIntro(orig.current.intro);
  }
  function revertContact() {
    setRows(orig.current.cards.map((c) => ({ ...c })));
    setDeletedIds([]);
  }
  function revertLocation() {
    setLocationDesc(orig.current.locationDesc);
    setAddress(orig.current.address);
    setMapLat(orig.current.mapLat);
    setMapLng(orig.current.mapLng);
  }

  function handleSave() {
    if (rows.some((r) => !r.label.trim() || !r.value.trim())) {
      alert("กรุณากรอกหัวข้อและข้อมูลของการ์ดให้ครบทุกใบ");
      return;
    }
    startTransition(async () => {
      const fresh = await saveContact({
        page: { intro, locationDesc, address, mapLat, mapLng },
        cards: rows.map((r) => ({ id: r.id, icon: r.icon, label: r.label, value: r.value })),
        deletedIds,
      });
      const newRows = toRows(fresh);
      setRows(newRows);
      setDeletedIds([]);
      orig.current = { intro, locationDesc, address, mapLat, mapLng, ...cardSnapshot(newRows) };
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

      {/* ── ส่วนหัว ── */}
      <SectionBlock
        title="ส่วนหัว"
        subtitle="ข้อความเกริ่นนำใต้หัวข้อ &quot;ติดต่อเรา&quot;"
        isDirty={headerDirty}
        onRevert={revertHeader}
      >
        <textarea
          rows={3}
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          className={`w-full resize-y ${fieldBase} ${inputCls(headerDirty)}`}
        />
      </SectionBlock>

      {/* ── ข้อมูลติดต่อ (CRUD cards) ── */}
      <SectionBlock
        title="ข้อมูลติดต่อ"
        subtitle="เพิ่ม แก้ไข ลบ หรือลากเพื่อจัดลำดับการ์ด — เลือกไอคอน หัวข้อ และข้อมูลได้เอง"
        isDirty={contactDirty}
        onRevert={revertContact}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="contact-cards">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2">
                {rows.map((r, i) => {
                  const dirty = rowDirty(r);
                  return (
                    <Draggable key={r.key} draggableId={r.key} index={i}>
                      {(drag) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <div
                            {...drag.dragHandleProps}
                            className="flex cursor-grab items-center text-on-surface-variant"
                            aria-label="ลากเพื่อจัดลำดับ"
                          >
                            <Icon name="drag_indicator" />
                          </div>
                          {/* Live icon preview */}
                          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                            <BrandIcon name={r.icon} fallback={r.icon} className="text-lg" />
                          </span>
                          <select
                            value={r.icon}
                            onChange={(e) => updateRow(r.key, { icon: e.target.value })}
                            title="ไอคอน"
                            className={`w-32 flex-none rounded-lg border bg-white px-2 py-2.5 font-body-sm text-body-sm outline-none ${inputCls(dirty)}`}
                          >
                            {CONTACT_ICONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <input
                            value={r.label}
                            onChange={(e) => updateRow(r.key, { label: e.target.value })}
                            placeholder="หัวข้อ (เช่น โทรศัพท์)"
                            className={`w-36 flex-none rounded-lg border bg-white px-3 py-2.5 font-body-md text-body-md outline-none ${inputCls(dirty)}`}
                          />
                          <input
                            value={r.value}
                            onChange={(e) => updateRow(r.key, { value: e.target.value })}
                            placeholder="ข้อมูล (เช่น +66-2-183-7857)"
                            className={`min-w-0 flex-1 rounded-lg border bg-white px-3 py-2.5 font-body-md text-body-md outline-none ${inputCls(dirty)}`}
                          />
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
          เพิ่มการ์ด
        </button>
      </SectionBlock>

      {/* ── ที่ตั้งบริษัทและหน้าร้าน ── */}
      <SectionBlock
        title="ที่ตั้งบริษัทและหน้าร้าน"
        subtitle="คำอธิบาย ที่อยู่ และพิกัดแผนที่ (ละติจูด/ลองจิจูด)"
        isDirty={locationDirty}
        onRevert={revertLocation}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>คำอธิบาย</label>
            <textarea rows={2} value={locationDesc} onChange={(e) => setLocationDesc(e.target.value)} className={`w-full resize-y ${fieldBase} ${inputCls(locationDesc !== orig.current.locationDesc)}`} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>ที่อยู่ (ขึ้นบรรทัดใหม่ได้)</label>
            <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} className={`w-full resize-y ${fieldBase} ${inputCls(address !== orig.current.address)}`} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>ละติจูด (Latitude)</label>
              <input value={mapLat} onChange={(e) => setMapLat(e.target.value)} inputMode="decimal" className={`${fieldBase} ${inputCls(mapLat !== orig.current.mapLat)}`} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>ลองจิจูด (Longitude)</label>
              <input value={mapLng} onChange={(e) => setMapLng(e.target.value)} inputMode="decimal" className={`${fieldBase} ${inputCls(mapLng !== orig.current.mapLng)}`} />
            </div>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}
