"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { MetaField } from "@/components/admin/meta-length";
import {
  SectionBlock,
  LabeledField,
  SaveBar,
  inputCls,
  fieldBase,
  eq,
  clone,
  TITLE_BUDGET,
  DESC_BUDGET,
} from "@/components/admin/seo/shared";
import { saveSeoWebsite } from "@/app/admin/seo/actions";
import type { SiteSettings } from "@/lib/types";

export interface PageSeoRow {
  path: string;
  label: string;
  metaTitle: string;
  metaDescription: string;
}

interface Form {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  ogImageUrl: string;
  keywords: string[];
  pageSeo: PageSeoRow[];
}

export function SeoWebsiteEditor({
  settings,
  pageSeo,
}: {
  settings: SiteSettings;
  pageSeo: PageSeoRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [f, setF] = useState<Form>(() => ({
    siteName: settings.siteName,
    siteTitle: settings.siteTitle,
    siteDescription: settings.siteDescription,
    ogImageUrl: settings.ogImageUrl,
    keywords: settings.siteKeywords,
    pageSeo: pageSeo.map((p) => ({ ...p })),
  }));
  const orig = useRef<Form>(clone(f));
  const up = (patch: Partial<Form>) => setF((s) => ({ ...s, ...patch }));

  const infoKeys = ["siteName", "siteTitle", "siteDescription", "ogImageUrl", "keywords"] as const;
  const slice = (src: Form, keys: readonly (keyof Form)[]) =>
    Object.fromEntries(keys.map((k) => [k, src[k]]));
  const infoDirty = !eq(slice(f, infoKeys), slice(orig.current, infoKeys));
  const pageDirty = !eq(f.pageSeo, orig.current.pageSeo);
  const isDirty = infoDirty || pageDirty;

  function handleSave() {
    startTransition(async () => {
      await saveSeoWebsite({
        siteName: f.siteName,
        siteTitle: f.siteTitle,
        siteDescription: f.siteDescription,
        siteKeywords: f.keywords,
        ogImageUrl: f.ogImageUrl,
        pageSeo: f.pageSeo.map((p) => ({
          path: p.path,
          metaTitle: p.metaTitle,
          metaDescription: p.metaDescription,
        })),
      });
      orig.current = clone(f);
      setF((s) => ({ ...s }));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SaveBar isDirty={isDirty} isPending={isPending} onSave={handleSave} />

      {/* ── ข้อมูลเว็บไซต์ ── */}
      <SectionBlock
        title="ข้อมูลเว็บไซต์"
        subtitle="ชื่อ หัวข้อ และคำอธิบายหลักที่แสดงบน Google และเมื่อแชร์ลิงก์"
        isDirty={infoDirty}
        onRevert={() => setF((s) => ({ ...s, ...slice(orig.current, infoKeys) }))}
      >
        <div className="flex flex-col gap-4">
          <LabeledField label="ชื่อเว็บไซต์ (Site name)">
            <input value={f.siteName} onChange={(e) => up({ siteName: e.target.value })} className={`${fieldBase} ${inputCls(f.siteName !== orig.current.siteName)}`} />
          </LabeledField>
          <MetaField label="Meta Title (หัวข้อหน้าแรก)" text={f.siteTitle} budgetPx={TITLE_BUDGET}>
            <input value={f.siteTitle} onChange={(e) => up({ siteTitle: e.target.value })} className={`${fieldBase} ${inputCls(f.siteTitle !== orig.current.siteTitle)}`} />
          </MetaField>
          <MetaField label="Meta Description (คำอธิบายหน้าแรก)" text={f.siteDescription} budgetPx={DESC_BUDGET} fontPx={14}>
            <textarea rows={2} value={f.siteDescription} onChange={(e) => up({ siteDescription: e.target.value })} className={`resize-y ${fieldBase} ${inputCls(f.siteDescription !== orig.current.siteDescription)}`} />
          </MetaField>
          <LabeledField label="คำสำคัญ (Keywords) — บรรทัดละคำ">
            <textarea
              rows={4}
              value={f.keywords.join("\n")}
              onChange={(e) => up({ keywords: e.target.value.split("\n").map((k) => k.replace(/^\s+|\s+$/g, "")) })}
              className={`resize-y ${fieldBase} ${inputCls(!eq(f.keywords, orig.current.keywords))}`}
            />
          </LabeledField>
          <LabeledField label="รูปแชร์ลิงก์ (OG image URL)">
            <input value={f.ogImageUrl} onChange={(e) => up({ ogImageUrl: e.target.value })} placeholder="/og-default.png" className={`${fieldBase} ${inputCls(f.ogImageUrl !== orig.current.ogImageUrl)}`} />
          </LabeledField>
        </div>
      </SectionBlock>

      {/* ── Meta รายหน้า ── */}
      <SectionBlock
        title="Meta รายหน้า (หน้าหลัก)"
        subtitle="กำหนด Meta Title / Description เฉพาะแต่ละหน้า — เว้นว่างเพื่อใช้ค่าอัตโนมัติ (สินค้าตั้งค่าได้ในหน้าแก้ไขสินค้า)"
        isDirty={pageDirty}
        onRevert={() => setF((s) => ({ ...s, pageSeo: clone(orig.current.pageSeo) }))}
      >
        <div className="flex flex-col gap-5">
          {f.pageSeo.map((p, i) => (
            <div key={p.path} className="rounded-lg border border-outline-variant p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="description" className="text-base text-on-surface-variant" />
                <span className="font-body-md text-body-md font-medium text-on-surface">{p.label}</span>
                <span className="font-body-xs text-body-xs text-on-surface-variant/60">{p.path}</span>
              </div>
              <div className="flex flex-col gap-3">
                <MetaField label="Meta Title" text={p.metaTitle} budgetPx={TITLE_BUDGET}>
                  <input
                    value={p.metaTitle}
                    onChange={(e) => up({ pageSeo: f.pageSeo.map((r, j) => (j === i ? { ...r, metaTitle: e.target.value } : r)) })}
                    placeholder="เว้นว่าง = อัตโนมัติ"
                    className={`${fieldBase} ${inputCls(p.metaTitle !== orig.current.pageSeo[i]?.metaTitle)}`}
                  />
                </MetaField>
                <MetaField label="Meta Description" text={p.metaDescription} budgetPx={DESC_BUDGET} fontPx={14}>
                  <textarea
                    rows={2}
                    value={p.metaDescription}
                    onChange={(e) => up({ pageSeo: f.pageSeo.map((r, j) => (j === i ? { ...r, metaDescription: e.target.value } : r)) })}
                    placeholder="เว้นว่าง = อัตโนมัติ"
                    className={`resize-y ${fieldBase} ${inputCls(p.metaDescription !== orig.current.pageSeo[i]?.metaDescription)}`}
                  />
                </MetaField>
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}
