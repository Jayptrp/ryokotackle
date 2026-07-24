"use client";

/**
 * Approximate on-screen pixel width of SEO text. Google truncates titles/meta
 * descriptions by pixel width, not character count — and Thai glyphs are wide —
 * so a plain char counter misleads. We estimate width with a pure per-character
 * heuristic (no canvas, no effect) so it renders identically on server and
 * client. Guidance, not a guarantee; compared against the project's budgets
 * (title ~580px, desc ~1000px; see src/lib/seo.ts).
 */
function estimatePx(text: string, fontPx: number): number {
  let units = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0e00 && code <= 0x0e7f)
      units += 0.62; // Thai glyphs are wide
    else if (ch === " ") units += 0.3;
    else if ("iIl.,:;'|!ft".includes(ch)) units += 0.3;
    else if ("mwMW".includes(ch)) units += 0.85;
    else units += 0.55;
  }
  return Math.round(units * fontPx);
}

/**
 * Compact pixel-budget indicator: a short bar + "~833/1000px", right-aligned to
 * sit inline with a field's label. Same caps font as the label. No char count.
 */
export function MetaLengthInline({
  text,
  budgetPx,
  fontPx = 18,
}: {
  text: string;
  budgetPx: number;
  fontPx?: number;
}) {
  const px = estimatePx(text, fontPx);
  const pct = Math.min(100, budgetPx ? (px / budgetPx) * 100 : 0);
  const over = px > budgetPx;
  const near = !over && pct > 85;
  const bar = over ? "bg-error" : near ? "bg-amber-500" : "bg-secondary";
  const txt = over ? "text-error" : near ? "text-amber-600" : "text-on-surface-variant/60";

  return (
    <span className="flex flex-none items-center gap-1.5" title={`${text.length} ตัวอักษร`}>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-surface-container">
        <span className={`block h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`font-label-caps text-label-caps tabular-nums ${txt}`}>
        ~{px}/{budgetPx}px
      </span>
    </span>
  );
}

/**
 * A labelled meta field: the label sits on the left, the pixel-budget indicator
 * inline on the far right, and the input/textarea (passed as children) below.
 */
export function MetaField({
  label,
  text,
  budgetPx,
  fontPx,
  children,
}: {
  label: string;
  text: string;
  budgetPx: number;
  fontPx?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="font-label-caps text-label-caps text-on-surface-variant">{label}</label>
        <MetaLengthInline text={text} budgetPx={budgetPx} fontPx={fontPx} />
      </div>
      {children}
    </div>
  );
}
