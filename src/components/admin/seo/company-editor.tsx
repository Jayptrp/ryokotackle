"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import {
  SectionBlock,
  LabeledField,
  SaveBar,
  inputCls,
  fieldBase,
  eq,
  clone,
  SOCIAL_PLATFORMS,
} from "@/components/admin/seo/shared";
import { saveSeoCompany } from "@/app/admin/seo/actions";
import type { SiteSettings } from "@/lib/types";

interface Form {
  legalName: string;
  legalNameTh: string;
  slogan: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  street: string;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
  line: string;
  socials: { platform: string; url: string }[];
  footerLinks: { label: string; href: string }[];
}

export function SeoCompanyEditor({ settings }: { settings: SiteSettings }) {
  const [isPending, startTransition] = useTransition();
  const [f, setF] = useState<Form>(() => ({
    legalName: settings.company.legalName,
    legalNameTh: settings.company.legalNameTh,
    slogan: settings.company.slogan,
    email: settings.company.email,
    phone: settings.company.phone,
    mobile: settings.company.mobile,
    fax: settings.company.fax,
    street: settings.company.address.street,
    locality: settings.company.address.locality,
    region: settings.company.address.region,
    postalCode: settings.company.address.postalCode,
    country: settings.company.address.country,
    line: settings.company.line,
    socials: settings.socials.map((x) => ({ platform: x.platform, url: x.url })),
    footerLinks: settings.footerLinks.map((x) => ({ label: x.label, href: x.href })),
  }));
  const orig = useRef<Form>(clone(f));
  const up = (patch: Partial<Form>) => setF((s) => ({ ...s, ...patch }));

  const napKeys = [
    "legalName", "legalNameTh", "slogan", "email", "phone", "mobile", "fax",
    "street", "locality", "region", "postalCode", "country", "line",
  ] as const;
  const slice = (src: Form, keys: readonly (keyof Form)[]) =>
    Object.fromEntries(keys.map((k) => [k, src[k]]));
  const napDirty = !eq(slice(f, napKeys), slice(orig.current, napKeys));
  const socialsDirty = !eq(f.socials, orig.current.socials);
  const footerDirty = !eq(f.footerLinks, orig.current.footerLinks);
  const isDirty = napDirty || socialsDirty || footerDirty;

  function handleSave() {
    startTransition(async () => {
      await saveSeoCompany({
        company: {
          legalName: f.legalName,
          legalNameTh: f.legalNameTh,
          slogan: f.slogan,
          email: f.email,
          phone: f.phone,
          mobile: f.mobile,
          fax: f.fax,
          street: f.street,
          locality: f.locality,
          region: f.region,
          postalCode: f.postalCode,
          country: f.country,
          line: f.line,
        },
        socials: f.socials,
        footerLinks: f.footerLinks,
      });
      orig.current = clone(f);
      setF((s) => ({ ...s }));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SaveBar isDirty={isDirty} isPending={isPending} onSave={handleSave} />

      {/* ── ข้อมูลบริษัท (NAP) ── */}
      <SectionBlock
        title="ข้อมูลบริษัท (NAP)"
        subtitle="ชื่อบริษัท ที่อยู่ และช่องทางติดต่อ — ใช้ใน Footer และข้อมูลโครงสร้าง (Schema) เพื่อ Local SEO"
        isDirty={napDirty}
        onRevert={() => setF((s) => ({ ...s, ...slice(orig.current, napKeys) }))}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledField label="ชื่อบริษัท (EN)"><input value={f.legalName} onChange={(e) => up({ legalName: e.target.value })} className={`${fieldBase} ${inputCls(f.legalName !== orig.current.legalName)}`} /></LabeledField>
          <LabeledField label="ชื่อบริษัท (ไทย)"><input value={f.legalNameTh} onChange={(e) => up({ legalNameTh: e.target.value })} className={`${fieldBase} ${inputCls(f.legalNameTh !== orig.current.legalNameTh)}`} /></LabeledField>
          <LabeledField label="สโลแกน"><input value={f.slogan} onChange={(e) => up({ slogan: e.target.value })} className={`${fieldBase} ${inputCls(f.slogan !== orig.current.slogan)}`} /></LabeledField>
          <LabeledField label="อีเมล"><input value={f.email} onChange={(e) => up({ email: e.target.value })} className={`${fieldBase} ${inputCls(f.email !== orig.current.email)}`} /></LabeledField>
          <LabeledField label="โทรศัพท์"><input value={f.phone} onChange={(e) => up({ phone: e.target.value })} className={`${fieldBase} ${inputCls(f.phone !== orig.current.phone)}`} /></LabeledField>
          <LabeledField label="มือถือ"><input value={f.mobile} onChange={(e) => up({ mobile: e.target.value })} className={`${fieldBase} ${inputCls(f.mobile !== orig.current.mobile)}`} /></LabeledField>
          <LabeledField label="แฟกซ์"><input value={f.fax} onChange={(e) => up({ fax: e.target.value })} className={`${fieldBase} ${inputCls(f.fax !== orig.current.fax)}`} /></LabeledField>
          <LabeledField label="LINE"><input value={f.line} onChange={(e) => up({ line: e.target.value })} className={`${fieldBase} ${inputCls(f.line !== orig.current.line)}`} /></LabeledField>
          <LabeledField label="ที่อยู่ (ถนน/ซอย)"><input value={f.street} onChange={(e) => up({ street: e.target.value })} className={`${fieldBase} ${inputCls(f.street !== orig.current.street)}`} /></LabeledField>
          <LabeledField label="ตำบล/อำเภอ"><input value={f.locality} onChange={(e) => up({ locality: e.target.value })} className={`${fieldBase} ${inputCls(f.locality !== orig.current.locality)}`} /></LabeledField>
          <LabeledField label="จังหวัด"><input value={f.region} onChange={(e) => up({ region: e.target.value })} className={`${fieldBase} ${inputCls(f.region !== orig.current.region)}`} /></LabeledField>
          <LabeledField label="รหัสไปรษณีย์"><input value={f.postalCode} onChange={(e) => up({ postalCode: e.target.value })} className={`${fieldBase} ${inputCls(f.postalCode !== orig.current.postalCode)}`} /></LabeledField>
          <LabeledField label="ประเทศ (รหัส เช่น TH)"><input value={f.country} onChange={(e) => up({ country: e.target.value })} className={`${fieldBase} ${inputCls(f.country !== orig.current.country)}`} /></LabeledField>
        </div>
      </SectionBlock>

      {/* ── โซเชียลมีเดีย ── */}
      <SectionBlock
        title="โซเชียลมีเดีย"
        subtitle="ลิงก์โปรไฟล์โซเชียล — แสดงใน Footer และในข้อมูลโครงสร้าง (sameAs)"
        isDirty={socialsDirty}
        onRevert={() => setF((s) => ({ ...s, socials: clone(orig.current.socials) }))}
      >
        <div className="flex flex-col gap-2">
          {f.socials.map((soc, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select
                value={soc.platform}
                onChange={(e) => up({ socials: f.socials.map((s, j) => (j === i ? { ...s, platform: e.target.value } : s)) })}
                className="w-32 flex-none rounded-lg border border-outline-variant bg-white px-2 py-2.5 font-body-sm text-body-sm outline-none"
              >
                {SOCIAL_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                value={soc.url}
                onChange={(e) => up({ socials: f.socials.map((s, j) => (j === i ? { ...s, url: e.target.value } : s)) })}
                placeholder="https://..."
                className={`min-w-0 flex-1 ${fieldBase} border-outline-variant focus:border-primary`}
              />
              <button type="button" onClick={() => up({ socials: f.socials.filter((_, j) => j !== i) })} className="flex-none rounded-lg border border-outline-variant p-2.5 text-on-surface-variant transition-colors hover:border-error hover:text-error" title="ลบ">
                <Icon name="delete" className="text-base" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => up({ socials: [...f.socials, { platform: "facebook", url: "" }] })} className="mt-2 flex w-fit items-center gap-1 rounded-lg border border-dashed border-outline-variant px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary">
            <Icon name="add" className="text-base" /> เพิ่มโซเชียล
          </button>
        </div>
      </SectionBlock>

      {/* ── ลิงก์ใน Footer ── */}
      <SectionBlock
        title="ลิงก์ใน Footer"
        subtitle="ลิงก์ด่วนที่แสดงส่วนท้ายเว็บ — ช่วยให้ Google และผู้ใช้นำทางไปหน้าสำคัญ"
        isDirty={footerDirty}
        onRevert={() => setF((s) => ({ ...s, footerLinks: clone(orig.current.footerLinks) }))}
      >
        <div className="flex flex-col gap-2">
          {f.footerLinks.map((link, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={link.label}
                onChange={(e) => up({ footerLinks: f.footerLinks.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)) })}
                placeholder="ข้อความ (เช่น สินค้าทั้งหมด)"
                className={`w-48 flex-none ${fieldBase} border-outline-variant focus:border-primary`}
              />
              <input
                value={link.href}
                onChange={(e) => up({ footerLinks: f.footerLinks.map((l, j) => (j === i ? { ...l, href: e.target.value } : l)) })}
                placeholder="/products หรือ https://..."
                className={`min-w-0 flex-1 ${fieldBase} border-outline-variant focus:border-primary`}
              />
              <button type="button" onClick={() => up({ footerLinks: f.footerLinks.filter((_, j) => j !== i) })} className="flex-none rounded-lg border border-outline-variant p-2.5 text-on-surface-variant transition-colors hover:border-error hover:text-error" title="ลบ">
                <Icon name="delete" className="text-base" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => up({ footerLinks: [...f.footerLinks, { label: "", href: "" }] })} className="mt-2 flex w-fit items-center gap-1 rounded-lg border border-dashed border-outline-variant px-4 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary">
            <Icon name="add" className="text-base" /> เพิ่มลิงก์
          </button>
        </div>
      </SectionBlock>
    </div>
  );
}
