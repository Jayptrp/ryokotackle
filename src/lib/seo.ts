/**
 * Central SEO configuration for Ryoko Tackle.
 *
 * Values migrated from the legacy ReadyPlanet site (trytackle.com / ryokotackle.com)
 * to preserve hard-won keyword equity and keep company NAP (Name/Address/Phone)
 * consistent for local SEO.
 */

/** Production origin. Override per-environment with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ryokotackle.com"
).replace(/\/$/, "");

export const SITE_NAME = "Ryoko Tackle";

/**
 * Brand-forward default title, trimmed to fit Google's ~580px SERP budget
 * (Thai glyphs are wide). Dropped keywords ("พรีเมียม") live in the homepage
 * H1/body instead, where they stay visible and indexable.
 *
 * Previous version (~752px, truncated in SERPs — kept for reference):
 *   "Ryoko Tackle | อุปกรณ์ตกปลาพรีเมียม คันเบ็ด รอก เหยื่อปลอม"
 */
export const SITE_TITLE = "Ryoko Tackle | อุปกรณ์ตกปลา คันเบ็ด รอก เหยื่อ";

/**
 * Concise Thai description (~110 chars) sized to Google's snippet budget. The
 * brand roster was moved out (it overflowed the budget and the keywords meta is
 * ignored by Google anyway) — brands live in SITE_KEYWORDS, the homepage copy,
 * and structured data.
 *
 * Previous version (~1482px, truncated — kept for reference):
 *   "ร้านอุปกรณ์ตกปลา Ryoko Tackle จำหน่ายคันเบ็ดตกปลา รอกตกปลา เหยื่อปลอม เหยื่อจิ๊ก สายเอ็น PE และอุปกรณ์ตกปลาคุณภาพสูง แบรนด์ RYOKO, Ballista, Sakura, Kaido, G-Luck, Akari"
 */
export const SITE_DESCRIPTION =
  "ร้านอุปกรณ์ตกปลา Ryoko Tackle จำหน่ายคันเบ็ด รอก เหยื่อปลอม สายเอ็น PE และอุปกรณ์ตกปลาคุณภาพสูงครบวงจร";

/** High-value Thai + brand keywords carried over from the legacy meta keywords. */
export const SITE_KEYWORDS = [
  "อุปกรณ์ตกปลา",
  "คันเบ็ดตกปลา",
  "รอกตกปลา",
  "เหยื่อปลอม",
  "เหยื่อจิ๊ก",
  "คันจิ๊ก",
  "สายเอ็น PE",
  "เบ็ดตกปลา",
  "กล่องอุปกรณ์ตกปลา",
  "ร้านอุปกรณ์ตกปลา",
  "คันเบ็ด ryoko",
  "รอก kaido",
  "RYOKO",
  "Ballista",
  "Sakura",
  "Kaido",
  "G-Luck",
  "Akari",
];

/** Company / contact details (NAP) — from the legacy site footer. */
export const COMPANY = {
  legalName: "T.R.Y. Fishing Tackle Co., Ltd.",
  legalNameTh: "บริษัท ที.อาร์.วาย.ฟิชชิ่ง แทคเคิล จำกัด",
  brand: SITE_NAME,
  slogan: "คิดถึงอุปกรณ์ตกปลา คิดถึง Ryoko Tackle",
  email: "info@trytackle.com",
  phone: "+66-2-183-7857",
  mobile: "+66-95-951-4519",
  fax: "+66-2-183-7859",
  address: {
    street: "289/11 Moo 13, Soi Kingkeaw 25/1",
    locality: "Rachathewa, Bang Phli",
    region: "Samut Prakan",
    postalCode: "10540",
    country: "TH",
  },
  social: [
    "https://www.facebook.com/ryoko.tackle",
    "https://www.tiktok.com/@ryoko.tackle",
    "https://www.youtube.com/@ryoko.tackle",
    "https://www.instagram.com/ryoko.tackle",
  ],
  line: "@ryokothailand",
} as const;

/** Build an absolute URL from a path (for canonical / OG / sitemap). */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
