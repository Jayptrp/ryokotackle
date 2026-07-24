"use client";

import { Icon } from "@/components/icon";

/** Pixel budgets used across the SEO editors (see src/lib/seo.ts). */
export const TITLE_BUDGET = 580;
export const DESC_BUDGET = 1000;

export const labelCls = "font-label-caps text-label-caps text-on-surface-variant";
export const fieldBase =
  "w-full rounded-lg border bg-white px-3 py-2.5 font-body-md text-body-md outline-none transition-all";

export function inputCls(dirty: boolean) {
  return dirty
    ? "border-error/60 ring-1 ring-error/20 focus:border-error/60 focus:ring-error/20"
    : "border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/20";
}

export const SOCIAL_PLATFORMS = [
  "facebook",
  "tiktok",
  "youtube",
  "instagram",
  "line",
  "x",
  "other",
] as const;

/** Deep-equality + deep-clone helpers for orig-snapshot dirty tracking. */
export const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function SectionBlock({
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

export function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

/** Shared sticky save bar — badge sits directly left of the save button. */
export function SaveBar({
  isDirty,
  isPending,
  onSave,
}: {
  isDirty: boolean;
  isPending: boolean;
  onSave: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-1 flex items-center justify-end gap-3 bg-surface/80 px-1 py-2 backdrop-blur">
      {isDirty && !isPending && (
        <span className="font-body-sm text-body-sm text-error">มีการแก้ไข</span>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={!isDirty || isPending}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-label-caps text-label-caps text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name={isPending ? "hourglass_top" : "save"} className={`text-base ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </div>
  );
}
