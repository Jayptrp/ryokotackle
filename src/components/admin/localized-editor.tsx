"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SummaryEditor } from "@/components/admin/summary-editor";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/config";

type Values = Record<Locale, string>;

/** Treat Tiptap's empty doc ("<p></p>") / whitespace as no content. */
function isBlank(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim().length === 0;
}

/** Build the `{ en, vi, id, ms }` jsonb payload, dropping blank locales. */
function buildI18n(values: Values): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) {
    if (l === "th") continue;
    if (!isBlank(values[l])) out[l] = values[l];
  }
  return out;
}

interface LocalizedEditorProps {
  /** "summary" = compact editor; "full" = full Tiptap (description). */
  kind: "summary" | "full";
  /** Hidden-input name for the Thai (source) value, e.g. "summary". */
  thName: string;
  /** Hidden-input name for the i18n jsonb string, e.g. "summary_i18n". */
  i18nName: string;
  /** Thai source HTML. */
  defaultValue: string | null;
  /** Existing translations `{ en, vi, id, ms }`. */
  defaultI18n: Record<string, string> | null;
  /** Product id (full editor needs it for inline image upload). */
  productId?: string;
  /** English product name — gives the translate prompt useful context. */
  productName?: string;
  /** Fires when the Thai value changes (parent dirty tracking). */
  onThUpdate?: (html: string) => void;
  /** Fires when any translation changes (parent dirty tracking). */
  onI18nUpdate?: (map: Record<string, string>) => void;
}

/**
 * Wraps a rich-text editor with a Thai-source + 4-translation workflow.
 *
 * Only the active locale is mounted (the leaf editor is remounted on tab switch,
 * reusing the existing revert-by-remount pattern); per-locale HTML is held here
 * and emitted via two hidden inputs — `thName` (Thai source) and `i18nName`
 * (jsonb `{ en, vi, id, ms }`, blank locales dropped → Thai fallback on render).
 * The helper dialog hands the admin a ready-to-paste translation prompt.
 */
export function LocalizedEditor({
  kind,
  thName,
  i18nName,
  defaultValue,
  defaultI18n,
  productId,
  productName,
  onThUpdate,
  onI18nUpdate,
}: LocalizedEditorProps) {
  const [active, setActive] = useState<Locale>("th");
  const [values, setValues] = useState<Values>(() => ({
    th: defaultValue ?? "",
    en: defaultI18n?.en ?? "",
    vi: defaultI18n?.vi ?? "",
    id: defaultI18n?.id ?? "",
    ms: defaultI18n?.ms ?? "",
  }));

  // Surface changes to the parent for dirty tracking.
  useEffect(() => {
    onThUpdate?.(values.th);
    onI18nUpdate?.(buildI18n(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const i18nJson = useMemo(() => JSON.stringify(buildI18n(values)), [values]);

  const handleLeafUpdate = (html: string) =>
    setValues((prev) => (prev[active] === html ? prev : { ...prev, [active]: html }));

  const leaf =
    kind === "summary" ? (
      <SummaryEditor
        key={active}
        name=""
        defaultValue={values[active]}
        onUpdate={handleLeafUpdate}
      />
    ) : (
      <TiptapEditor
        key={active}
        name=""
        defaultValue={values[active]}
        productId={productId}
        onUpdate={handleLeafUpdate}
      />
    );

  return (
    <div>
      {leaf}

      {/* Language tab bar */}
      <div className="mt-2 flex items-center gap-1">
        <div className="flex items-center gap-1 rounded-lg border border-outline-variant bg-surface-container p-1">
          {LOCALES.map((l) => {
            const isActive = l === active;
            const hasContent = !isBlank(values[l]);
            return (
              <button
                key={l}
                type="button"
                onClick={() => setActive(l)}
                title={LOCALE_META[l].label}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 font-label-caps text-label-caps transition-colors",
                  isActive
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high",
                )}
              >
                {LOCALE_META[l].short}
                {l !== "th" && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      hasContent
                        ? isActive
                          ? "bg-on-primary"
                          : "bg-primary"
                        : "bg-outline-variant",
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <TranslateHelper
          thHtml={values.th}
          productName={productName}
          kind={kind}
        />

        {active !== "th" && (
          <span className="ml-1 font-body-sm text-xs text-on-surface-variant">
            กำลังแก้ไข {LOCALE_META[active].label} · เว้นว่างไว้จะใช้ภาษาไทยแทน
          </span>
        )}
      </div>

      {/* Hidden inputs carry Thai + translations on form submit */}
      <input type="hidden" name={thName} value={values.th} />
      <input type="hidden" name={i18nName} value={i18nJson} />
    </div>
  );
}

/** "?" button → dialog with how-to + a ready-to-paste translation prompt. */
function TranslateHelper({
  thHtml,
  productName,
  kind,
}: {
  thHtml: string;
  productName?: string;
  kind: "summary" | "full";
}) {
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(
    () => buildPrompt(thHtml, productName, kind),
    [thHtml, productName, kind],
  );
  const blank = isBlank(thHtml);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — admin can select the text manually */
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            title="ตัวช่วยแปลภาษา"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
          />
        }
      >
        <Icon name="auto_awesome" className="text-base" />
        <span className="sr-only">ตัวช่วยแปลภาษา</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ตัวช่วยแปลภาษา (TH → EN / VI / ID / MS)</DialogTitle>
        </DialogHeader>

        <ol className="ml-4 list-decimal space-y-1 text-sm text-on-surface-variant">
          <li>กดปุ่ม “คัดลอกพรอมป์” ด้านล่าง</li>
          <li>วางลงใน ChatGPT, Claude หรือ AI แปลภาษาที่ใช้</li>
          <li>
            AI จะตอบกลับเป็น JSON <code>{`{ "en": ..., "vi": ..., "id": ..., "ms": ... }`}</code>
          </li>
          <li>คัดลอกข้อความของแต่ละภาษา มาวางในแท็บภาษานั้น (EN/VI/ID/MS) แล้วกดบันทึก</li>
        </ol>

        {blank ? (
          <p className="rounded-lg bg-surface-container p-3 text-sm text-on-surface-variant">
            ยังไม่มีข้อความภาษาไทยในช่องนี้ — พิมพ์ข้อความไทยก่อน แล้วค่อยเปิดตัวช่วยแปล
          </p>
        ) : (
          <>
            <pre className="max-h-56 overflow-auto rounded-lg border border-outline-variant bg-surface-container p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-on-surface">
              {prompt}
            </pre>
            <div className="flex items-center justify-end gap-2">
              <DialogClose
                render={
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:bg-surface-container"
                  />
                }
              >
                ปิด
              </DialogClose>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
              >
                <Icon name={copied ? "check" : "content_copy"} className="text-base" />
                {copied ? "คัดลอกแล้ว" : "คัดลอกพรอมป์"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function buildPrompt(
  thHtml: string,
  productName: string | undefined,
  kind: "summary" | "full",
): string {
  const field = kind === "summary" ? "short product summary" : "product description";
  const context = productName ? ` for the product "${productName}"` : "";
  return `You are a professional translator for a Thai fishing-tackle catalog.
Translate the Thai ${field}${context} below into English (en), Vietnamese (vi), Indonesian (id), and Malay (ms).

Rules:
- Preserve the HTML structure EXACTLY — same tags, attributes, <br>, tables, list items, and emojis. Translate only the human-readable text.
- Keep brand names, model names, measurements and spec numbers unchanged (e.g. 7.1:1, 220g, lb, PE, mm).
- Use natural fishing-gear terminology native to each language.
- Return ONLY a single JSON object, no commentary:
  {"en":"<html>","vi":"<html>","id":"<html>","ms":"<html>"}

Thai source:
\`\`\`html
${thHtml}
\`\`\``;
}
