"use client";

import { useRef, useState, useTransition } from "react";
import { savePageAll } from "@/app/admin/pages/actions";
import { Icon } from "@/components/icon";
import { TiptapEditor } from "@/components/admin/tiptap-editor";

interface PageData {
  id: string;
  slug: string;
  title: string;
  titleTh: string | null;
  content: string | null;
  status: string;
}

const labelCls = "font-label-caps text-label-caps text-on-surface-variant";
const fieldBase =
  "rounded-lg border bg-white px-4 py-3 font-body-md text-body-md outline-none transition-all";

function inputCls(dirty: boolean) {
  return dirty
    ? "border-error/60 ring-1 ring-error/20 focus:border-error/60 focus:ring-error/20"
    : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20";
}

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

export function PageEditor({ page }: { page: PageData }) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(page.title);
  const [titleTh, setTitleTh] = useState(page.titleTh ?? "");
  const [status, setStatus] = useState(page.status);
  const [content, setContent] = useState(page.content ?? "");
  const [contentKey, setContentKey] = useState(0);

  const orig = useRef({
    title: page.title,
    titleTh: page.titleTh ?? "",
    status: page.status,
    content: page.content ?? "",
  });

  const infoDirty =
    title !== orig.current.title ||
    titleTh !== orig.current.titleTh ||
    status !== orig.current.status;
  const contentDirty = content !== orig.current.content;
  const isDirty = infoDirty || contentDirty;

  function revertInfo() {
    setTitle(orig.current.title);
    setTitleTh(orig.current.titleTh);
    setStatus(orig.current.status);
  }
  function revertContent() {
    setContent(orig.current.content);
    setContentKey((k) => k + 1); // force the Tiptap editor to remount from orig
  }

  function handleSave() {
    if (!title.trim()) {
      alert("กรุณากรอกหัวข้อ (อังกฤษ)");
      return;
    }
    startTransition(async () => {
      try {
        const fresh = await savePageAll({
          id: page.id,
          slug: page.slug,
          title,
          titleTh,
          content,
          status,
        });
        setTitle(fresh.title);
        setTitleTh(fresh.titleTh ?? "");
        setStatus(fresh.status);
        setContent(fresh.content ?? "");
        orig.current = {
          title: fresh.title,
          titleTh: fresh.titleTh ?? "",
          status: fresh.status,
          content: fresh.content ?? "",
        };
      } catch (e) {
        alert(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      }
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

      {/* ── Page info ── */}
      <SectionBlock title="ข้อมูลหน้า" isDirty={infoDirty} onRevert={revertInfo}>
        <div className="grid gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>
              หัวข้อ (อังกฤษ) <span className="text-error">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${fieldBase} ${inputCls(title !== orig.current.title)}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>หัวข้อ (ไทย)</label>
            <input
              value={titleTh}
              onChange={(e) => setTitleTh(e.target.value)}
              className={`${fieldBase} ${inputCls(titleTh !== orig.current.titleTh)}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>สถานะ</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${fieldBase} ${inputCls(status !== orig.current.status)}`}
            >
              <option value="published">เผยแพร่</option>
              <option value="draft">ฉบับร่าง</option>
              <option value="hidden">ซ่อน</option>
            </select>
          </div>
        </div>
      </SectionBlock>

      {/* ── Content ── */}
      <SectionBlock
        title="เนื้อหา"
        subtitle="จัดรูปแบบข้อความ หัวข้อ ตาราง รูปภาพ และลิงก์ได้"
        isDirty={contentDirty}
        onRevert={revertContent}
      >
        <div className={contentDirty ? "rounded-lg ring-1 ring-error/40" : ""}>
          <TiptapEditor
            key={`content-${contentKey}`}
            name="content"
            defaultValue={orig.current.content}
            onUpdate={setContent}
          />
        </div>
      </SectionBlock>
    </div>
  );
}
