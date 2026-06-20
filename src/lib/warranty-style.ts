/**
 * Shared warranty badge styling — the single source of truth for the public
 * warranty page and the admin manager picker. Class strings are spelled out in
 * full (no interpolation) so Tailwind keeps them in the build.
 */

/** color key → badge wrapper classes (background + icon color). */
export const WARRANTY_COLORS: Record<string, { label: string; badgeCls: string }> = {
  blue: { label: "ฟ้า", badgeCls: "bg-secondary-container text-on-secondary-container" },
  red: { label: "แดง", badgeCls: "bg-error-container text-error" },
  green: { label: "เขียว", badgeCls: "bg-green-100 text-green-700" },
  navy: { label: "น้ำเงินเข้ม", badgeCls: "bg-primary-container text-on-primary-container" },
  accent: { label: "ส้ม/เน้น", badgeCls: "bg-tertiary-container text-on-tertiary-container" },
  neutral: { label: "เทา", badgeCls: "bg-surface-container text-on-surface-variant" },
};

export const DEFAULT_WARRANTY_COLOR = "blue";
export const DEFAULT_WARRANTY_ICON = "verified_user";

/** Curated Material Symbols suitable for warranty types. */
export const WARRANTY_ICONS: { value: string; label: string }[] = [
  { value: "verified_user", label: "โล่ติ๊กถูก (ประกัน)" },
  { value: "shield", label: "โล่เปล่า" },
  { value: "gpp_bad", label: "โล่กากบาท (ไม่มีประกัน)" },
  { value: "gpp_good", label: "โล่ถูก" },
  { value: "gpp_maybe", label: "โล่เครื่องหมายตกใจ" },
  { value: "handyman", label: "เครื่องมือ/อะไหล่" },
  { value: "build", label: "ประแจ" },
  { value: "paid", label: "เหรียญเงิน" },
  { value: "schedule", label: "นาฬิกา" },
  { value: "check_circle", label: "วงกลมถูก" },
  { value: "block", label: "ห้าม" },
  { value: "help", label: "เครื่องหมายคำถาม" },
];

/** Resolve a warranty's badge classes, falling back to the default color. */
export function warrantyBadgeCls(color: string | null | undefined): string {
  return (WARRANTY_COLORS[color ?? ""] ?? WARRANTY_COLORS[DEFAULT_WARRANTY_COLOR]).badgeCls;
}
