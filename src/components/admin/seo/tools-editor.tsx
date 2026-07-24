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
} from "@/components/admin/seo/shared";
import { saveSeoTools } from "@/app/admin/seo/actions";
import type { SiteSettings } from "@/lib/types";

interface Form {
  ga4Id: string;
  gtmId: string;
  gscVerification: string;
  gptbot: boolean;
  claudebot: boolean;
  perplexitybot: boolean;
  googleExtended: boolean;
  customHeadHtml: string;
  customBodyHtml: string;
}

const AI_BOTS: { key: "gptbot" | "claudebot" | "perplexitybot" | "googleExtended"; label: string; hint: string }[] = [
  { key: "gptbot", label: "OpenAI (ChatGPT)", hint: "GPTBot" },
  { key: "claudebot", label: "Anthropic (Claude)", hint: "ClaudeBot" },
  { key: "perplexitybot", label: "Perplexity", hint: "PerplexityBot" },
  { key: "googleExtended", label: "Google (Gemini)", hint: "Google-Extended" },
];

export function SeoToolsEditor({ settings }: { settings: SiteSettings }) {
  const [isPending, startTransition] = useTransition();
  const [f, setF] = useState<Form>(() => ({
    ga4Id: settings.ga4Id ?? "",
    gtmId: settings.gtmId ?? "",
    gscVerification: settings.gscVerification ?? "",
    gptbot: settings.aiCrawlers.gptbot,
    claudebot: settings.aiCrawlers.claudebot,
    perplexitybot: settings.aiCrawlers.perplexitybot,
    googleExtended: settings.aiCrawlers.googleExtended,
    customHeadHtml: settings.customHeadHtml ?? "",
    customBodyHtml: settings.customBodyHtml ?? "",
  }));
  const orig = useRef<Form>(clone(f));
  const up = (patch: Partial<Form>) => setF((s) => ({ ...s, ...patch }));

  const connectKeys = ["ga4Id", "gtmId", "gscVerification"] as const;
  const aiKeys = ["gptbot", "claudebot", "perplexitybot", "googleExtended"] as const;
  const advancedKeys = ["customHeadHtml", "customBodyHtml"] as const;
  const slice = (src: Form, keys: readonly (keyof Form)[]) =>
    Object.fromEntries(keys.map((k) => [k, src[k]]));

  const connectDirty = !eq(slice(f, connectKeys), slice(orig.current, connectKeys));
  const aiDirty = !eq(slice(f, aiKeys), slice(orig.current, aiKeys));
  const advancedDirty = !eq(slice(f, advancedKeys), slice(orig.current, advancedKeys));
  const isDirty = connectDirty || aiDirty || advancedDirty;

  function handleSave() {
    startTransition(async () => {
      await saveSeoTools({
        ga4Id: f.ga4Id,
        gtmId: f.gtmId,
        gscVerification: f.gscVerification,
        customHeadHtml: f.customHeadHtml,
        customBodyHtml: f.customBodyHtml,
        aiCrawlers: {
          gptbot: f.gptbot,
          claudebot: f.claudebot,
          perplexitybot: f.perplexitybot,
          googleExtended: f.googleExtended,
        },
      });
      orig.current = clone(f);
      setF((s) => ({ ...s }));
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SaveBar isDirty={isDirty} isPending={isPending} onSave={handleSave} />

      {/* ── เชื่อมต่อเครื่องมือวัดผล ── */}
      <SectionBlock
        title="เชื่อมต่อเครื่องมือวัดผล"
        subtitle="วาง ID จากเครื่องมือของ Google — ระบบจะติดตั้งสคริปต์ให้อัตโนมัติ"
        isDirty={connectDirty}
        onRevert={() => setF((s) => ({ ...s, ...slice(orig.current, connectKeys) }))}
      >
        <div className="flex flex-col gap-4">
          <LabeledField label="Google Analytics 4 — Measurement ID">
            <input value={f.ga4Id} onChange={(e) => up({ ga4Id: e.target.value })} placeholder="G-XXXXXXXXXX" className={`${fieldBase} ${inputCls(f.ga4Id !== orig.current.ga4Id)}`} />
          </LabeledField>
          <LabeledField label="Google Tag Manager — Container ID">
            <input value={f.gtmId} onChange={(e) => up({ gtmId: e.target.value })} placeholder="GTM-XXXXXXX" className={`${fieldBase} ${inputCls(f.gtmId !== orig.current.gtmId)}`} />
          </LabeledField>
          <LabeledField label="Google Search Console — รหัสยืนยัน (meta content)">
            <input value={f.gscVerification} onChange={(e) => up({ gscVerification: e.target.value })} placeholder="เช่น abcdef123... (เฉพาะค่า content)" className={`${fieldBase} ${inputCls(f.gscVerification !== orig.current.gscVerification)}`} />
          </LabeledField>
        </div>
      </SectionBlock>

      {/* ── การเข้าถึงของ AI ── */}
      <SectionBlock
        title="การเข้าถึงของ AI (ChatGPT, Claude, ฯลฯ)"
        subtitle="อนุญาตให้บอทของ AI อ่านเว็บ เพื่อให้สินค้าปรากฏในคำตอบของ AI — แนะนำให้เปิดทั้งหมด"
        isDirty={aiDirty}
        onRevert={() => setF((s) => ({ ...s, ...slice(orig.current, aiKeys) }))}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AI_BOTS.map((bot) => (
            <label key={bot.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline-variant px-4 py-3 transition-colors hover:bg-surface-container">
              <input
                type="checkbox"
                checked={f[bot.key]}
                onChange={(e) => up({ [bot.key]: e.target.checked } as Partial<Form>)}
                className="h-4 w-4 accent-primary"
              />
              <span className="flex-1">
                <span className="block font-body-md text-body-md text-on-surface">{bot.label}</span>
                <span className="block font-body-xs text-body-xs text-on-surface-variant/70">{bot.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </SectionBlock>

      {/* ── โค้ดขั้นสูง ── */}
      <SectionBlock
        title="โค้ดขั้นสูง (Custom code)"
        subtitle="สำหรับผู้ดูแลที่มีความรู้ทางเทคนิค — วางสคริปต์/พิกเซลเพิ่มเติม"
        isDirty={advancedDirty}
        onRevert={() => setF((s) => ({ ...s, ...slice(orig.current, advancedKeys) }))}
      >
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          <Icon name="warning" className="mt-0.5 text-base text-amber-600" />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            โค้ดที่วางที่นี่จะทำงานบนทุกหน้าของเว็บ หากใส่โค้ดผิดอาจทำให้เว็บมีปัญหาได้
            หากไม่แน่ใจ ให้ใช้ช่อง ID ด้านบนแทน
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <LabeledField label="โค้ดใน <head>">
            <textarea rows={4} value={f.customHeadHtml} onChange={(e) => up({ customHeadHtml: e.target.value })} spellCheck={false} className={`resize-y font-mono text-body-sm ${fieldBase} ${inputCls(f.customHeadHtml !== orig.current.customHeadHtml)}`} />
          </LabeledField>
          <LabeledField label="โค้ดท้าย <body>">
            <textarea rows={4} value={f.customBodyHtml} onChange={(e) => up({ customBodyHtml: e.target.value })} spellCheck={false} className={`resize-y font-mono text-body-sm ${fieldBase} ${inputCls(f.customBodyHtml !== orig.current.customBodyHtml)}`} />
          </LabeledField>
        </div>
      </SectionBlock>
    </div>
  );
}
