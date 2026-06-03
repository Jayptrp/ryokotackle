import type { Category, Product } from "@/lib/types";

export const CATEGORIES: Category[] = [
  { slug: "rods", label: "คันเบ็ด (Rods)", icon: "phishing" },
  { slug: "reels", label: "รอก (Reels)", icon: "rebase_edit" },
  { slug: "lures", label: "เหยื่อปลอม (Lures)", icon: "pets" },
  { slug: "apparel", label: "เสื้อผ้า (Apparel)", icon: "checkroom" },
  { slug: "accessories", label: "อุปกรณ์เสริม (Accessories)", icon: "backpack" },
];

/**
 * Seed catalog derived from the Stitch designs. These render the storefront
 * out of the box; once the Supabase `products` table is populated the getters
 * below will prefer live data automatically.
 */
export const SEED_PRODUCTS: Product[] = [
  {
    id: "1",
    slug: "ryoko-technical-series-baitcast-2024",
    name: "Ryoko Technical Series Baitcasting Reel 2024",
    tagline: "รอกหยดน้ำระดับพรีเมียม งานเนี๊ยบมาตรฐานญี่ปุ่น",
    category: "reels",
    badge: "NEW ARRIVAL",
    price: 4500,
    compareAtPrice: 5200,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCSH5wkDvno5mGskeMCgV0q5mJRl7IJL5_ghbpeHrhENOfEhCEKNnafeSjTuxclYri6ThsluNesJHChUV8Y-1eITYMRYlq6l1oN98IrzBcRriK0oIiWy_8NhWtEBn4VraK0eQQW594BC46Ind8CYJPxQ6s9prmbQfmddau0pWWClw3clizkHeE3cH5ClZ_-VHRLFHsNB7YsyfYzJfLi69Q4TesE7ETAVXFmsLL5dxlWtO1OvJwODJ6eROqlLmTfnwT-cFtaZqCvhVs",
    description: [
      "รอก Ryoko Technical Series รุ่นใหม่ล่าสุดปี 2024 พัฒนาต่อยอดจากรุ่นยอดฮิตด้วยการอัปเกรดระบบลูกปืนเป็น Ceramic Hybrid เพื่อความลื่นไหลที่เหนือระดับและการตีเหยื่อที่ไกลขึ้นถึง 20%",
      "ตัวบอดี้ผลิตจาก Carbon Composite น้ำหนักเบาแต่ทนทานต่อการกัดกร่อนของน้ำเค็ม ระบบเบรก X-Drag ให้พลังเบรกที่เนียนและหนักแน่น เหมาะสำหรับงานตีเหยื่อปลอมทั้งน้ำจืดและน้ำเค็ม",
    ],
    specs: [
      { label: "อัตราทดเกียร์", value: "7.2:1 (รอบเร็วพิเศษ)" },
      { label: "ลูกปืน", value: "10+1 BB (Ceramic Hybrid)" },
      { label: "น้ำหนักรอก", value: "165 กรัม" },
      { label: "กำลังเบรกสูงสุด", value: "8 กิโลกรัม" },
      { label: "ความจุสาย (PE)", value: "PE 2.0 - 150m / PE 2.5 - 120m" },
    ],
    videoTitle:
      "[Review] Ryoko Technical 2024: พลังเบรกสุดเนียน ตีไกลจนตกใจ!",
  },
  {
    id: "2",
    slug: "ryoko-master-jigging-rod",
    name: "Ryoko Master Jigging Rod",
    tagline: "Sensitivity meets strength.",
    category: "rods",
    badge: "NEW ARRIVAL",
    price: 8900,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBqaVByI_Ic_AkOwuBKl-p2vDyC1TRc9FderoJhxS5-sxQ3oDvC-50nr0eIAxC2gpgBNL0FH-XGGDjCsCKSPYjZ8rxlXlwriJ4-3aXge4NrOAwlCMM7oPjBoR25ak0eUu9ch3CMhJK7Ji047mU5HfwrIZ-OMc5MURLP7KgnoOfRgl-E_2VMFoJN0bfoLHE74HzjQxIgaQ9Ym-X7VSFYt_M3Hb-ZL6WqI_0W9RVN_yJmt3PJW6noMoB2zZECYty57MA14PQ0BYAgc4Q",
    description: [
      "คันจิ๊กกิ้งสำหรับงานหนักโดยเฉพาะ บลังค์คาร์บอนความไวสูงที่ถ่ายทอดทุกจังหวะการกินของปลาได้อย่างแม่นยำ",
    ],
    specs: [
      { label: "ความยาว", value: "6'2\" (1.88 ม.)" },
      { label: "Line Weight", value: "PE 2 - 4" },
      { label: "Action", value: "Fast" },
    ],
  },
  {
    id: "3",
    slug: "ryoko-precision-x1-baitcast",
    name: "Ryoko Precision X1 Baitcast",
    tagline: "Silky smooth drag system.",
    category: "reels",
    price: 12500,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBrs8HB5f8e9ZWDm0KKNBwVKw4VrhNzyEwx8AnsQyB2QNdI0GnUMQda40UdwmZPJo00ne0RwGGf1r9K9NM_JF1wVaVG3krA8tXUE9sxmaL2B5zTUmdTxtalyA6DYq1kdk0fpDYNJuLWLF8gqlo-x2vAwkb_owny48kWD2Nv9IjkLOxloqCXs5vDVoKFOFYDHg-ytjJ9HkqF--OttQKFKMWh2FCc6-bOey_bkHvxx7tFSg2ivgHSFTsFGnhRDqnWfn_psQVa3h8YTCg",
    description: [
      "รอกเบทระดับเรือธง อัตราทดสูงพร้อมระบบเบรกแม่เหล็กปรับละเอียด ควบคุมการตีเหยื่อได้ดั่งใจ",
    ],
    specs: [
      { label: "อัตราทดเกียร์", value: "8.1:1" },
      { label: "ลูกปืน", value: "12+1 BB" },
      { label: "น้ำหนักรอก", value: "172 กรัม" },
    ],
  },
  {
    id: "4",
    slug: "ryoko-ghost-minnow-110",
    name: "Ryoko Ghost Minnow 110",
    tagline: "Realistic swimming action.",
    category: "lures",
    price: 450,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCS0nFPgMyNxuasCm7SA43UuFXH-M9ZOmXKEGDZnOQelLfs1xC7XVbhYVXL-zFmTIPOHbBH2qaetQBeV4YeW_UeDWCwpwmPb277BDPLByLxCP2us9IcyZvYyqgt7KvHUZnFPr-qvXUytqgqOnuyCPgTtXYwY5iQA6cn_C5w-I58f-QgBCUTa5OOogS0J3ueGry_OKSqV1sO37R5U7_WNo8VSMwRP_E1qxm_U970nvU8K_aBl9jFpLyYYpwS-uBPqf_mOc4JxHzFKq0",
    description: [
      "เหยื่อ Minnow ดำตื้น แอ็คชั่นสมจริง พร้อมลายโฮโลแกรมสะท้อนแสงใต้น้ำ ใช้ได้ทั้งน้ำจืดและชายฝั่ง",
    ],
    specs: [
      { label: "ความยาว", value: "110 มม." },
      { label: "น้ำหนัก", value: "18 กรัม" },
      { label: "Depth", value: "0.5 - 1.2 ม." },
    ],
  },
  {
    id: "5",
    slug: "ryoko-storm-shield-jacket",
    name: "Ryoko Storm-Shield Jacket",
    tagline: "Waterproof and durable.",
    category: "apparel",
    price: 3200,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCSqJCcssRuLSW6THsspOL7T-2rzaIFvx2-cqkCt0ACbUCPXiZezl-E-GFuRQd5APVWGxPlYgXzyXf276B8PRapiQwJLnKXBV4leADrmskZ-QTDFmrDKEMjFbz2ILp_OWCb8Ypvzn_G-e5nRuvUmMScLMHp2t6yb47J6sT_3IpeLDRIiveD8tXdIK6GfxW1VrLyTASXngOsWGa1LkXzCoegRHAVw8VuALhwOjVqQExRTtRuhZCihOMPv5mFi-nvETuIKuWgIIZhmmE",
    description: [
      "แจ็คเก็ตกันน้ำกันลมสำหรับนักตกปลา ดีไซน์มินิมอลสไตล์ญี่ปุ่น ตะเข็บซีลกันน้ำและซิปคุณภาพสูง",
    ],
    specs: [
      { label: "วัสดุ", value: "3-Layer Waterproof Shell" },
      { label: "Waterproof", value: "10,000 มม." },
      { label: "ขนาด", value: "S - XXL" },
    ],
  },
  {
    id: "6",
    slug: "ryoko-cnc-precision-pliers",
    name: "Ryoko CNC Precision Pliers",
    tagline: "CNC-machined aluminium body.",
    category: "accessories",
    price: 1850,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCPdFey9GSokiL9VWpH2CrtpvG22IhKKdMwa8wTuh4_Aeo7U-s3GzDPz5VJALxpWGzGQGzcORm3GdL2ZTxQW0v4UGXsbnij1ZJhYSpgu2eGRdPZ281FLYO9O0B0OPUN6JfiVwlvy-8YvYTE0_Fq5g6NE8F6hpzO_VT_z1nqQsKw_h3t3Cg6Ww91Jw1zXhbrAYFWJtBujcJAKC-I0r6nzxd8gYUVP-Uk2b0RapShbUiS9qjVq8rB3nErRhE-zJIngi_jF8hkogQwtHc",
    description: [
      "คีมปลดเบ็ดอลูมิเนียม CNC น้ำหนักเบา ด้ามจับสีเทียลกระชับมือ พร้อมคัตเตอร์สแตนเลสตัดสาย PE ได้คม",
    ],
    specs: [
      { label: "วัสดุ", value: "อลูมิเนียม CNC + สแตนเลส" },
      { label: "ความยาว", value: "165 มม." },
      { label: "น้ำหนัก", value: "98 กรัม" },
    ],
  },
  {
    id: "7",
    slug: "ryoko-shore-master-100",
    name: "Ryoko Shore Master 100",
    tagline: "High-modulus surf casting rod.",
    category: "rods",
    badge: "TOP SELLER",
    price: 7500,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBfCn45ODFzmKtmkGeU-HgIYlYtZo-3x6VZpBJe0GM5ElGfmgwjTtnPm7RzL4xIktyiF6nrBtxQnUikews2WOfR1mLcE6jGlF-c4MwgQ_fBq1VAFQbMjqBaN5wk-e3U4q77VVcHDXpGTRCAJH6pS-afC_CQIuhmoknbpx3UPR3CsaJZ9jx_6znPuFo4yNfeVTFwB_u0oJAdYjMtvqZBjUPaN3OANBvtsZaTo4ga0urOTeANKobrJ_A_SeHplnqTd0jJkobCWdvOuWQ",
    description: [
      "คันเซิร์ฟคาสติ้งบลังค์คาร์บอนโมดูลัสสูง พร้อมไกด์ไทเทเนียมขนาดใหญ่ ตีไกลสุดขอบฟ้า",
    ],
    specs: [
      { label: "ความยาว", value: "10' (3.05 ม.)" },
      { label: "Cast Weight", value: "60 - 120 กรัม" },
      { label: "ท่อน", value: "3 ท่อน" },
    ],
  },
  {
    id: "8",
    slug: "ryoko-zen-spinning-3000",
    name: "Ryoko Zen Spinning 3000",
    tagline: "Carbon body, gold spool.",
    category: "reels",
    price: 5900,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBe1riHvW0F_5X5bzpXFDYaqmjdg7mnHroPkY4R0Hy8nCXp-Qf3YREAiCMsVw2TA2NT4sDwTKJM5IQdu_dbcYaLkE_BagDjz5Uzl6KXzMF3BJKYzv8WpFDsr-eNg87gWdBuBElaUtnIQTbEI5XfxooUedhcwBW9H6jXK-Ha4393-x5-f8edSXxmZFd_R2lSNvUWiGt6GqYdvHMmrhAIji0MY80Wu6cIEqhZt03W3HALSwR2pSAa5h4sFVDZqP2IhMkgzw65f42avnQ",
    description: [
      "รอกสปินคาร์บอนบอดี้ สปูลอลูมิเนียมชุบทอง เบาและทนทาน เหมาะกับงานตีเหยื่อทั่วไป",
    ],
    specs: [
      { label: "อัตราทดเกียร์", value: "5.2:1" },
      { label: "ลูกปืน", value: "9+1 BB" },
      { label: "น้ำหนักรอก", value: "228 กรัม" },
    ],
  },
  {
    id: "9",
    slug: "ryoko-grand-pe-x8-line",
    name: "Ryoko Grand PE X8 Line",
    tagline: "8-strand braided line.",
    category: "accessories",
    price: 1200,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBtJNqzuuJzyQ1XfVfwHY2DOVvoFPlFd7ZB3_31rvycMOuiyujPlBBZN9kcqFhGnMRng9obKiEwr2I3vl6eELJOjaASN3FSFBh6bXajbrZPmct7gwbk675PybYOASxn0Nv5nsFhSjlAqHGRo3ATzR6XuBSX76Yxbze2VxOUZ_BrE-nyrb5CpgJg5mUFCkrxHX-q7pPRw4lgZ-OWbKa8lyKKxaRyqCVFeHetOf8NfmiNJwjVWVZaKtaxwqNlzeTZGuy3xFO-9gRVE-U",
    description: [
      "สาย PE ถัก 8 ปลอกความหนาแน่นสูง ผิวลื่นตีไกล เคลือบสีคงทน ไม่ลอกง่าย",
    ],
    specs: [
      { label: "โครงสร้าง", value: "8 Strand Braided" },
      { label: "ความยาว", value: "300 ม." },
      { label: "ขนาด", value: "PE 0.8 - PE 5.0" },
    ],
  },
];

export function formatTHB(amount: number): string {
  return `฿${amount.toLocaleString("th-TH")}`;
}
