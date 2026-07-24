import { Icon } from "@/components/icon";

/** Auto-generated files the admin (or their SEO agency) may want to view/export. */
const SEO_FILES = [
  {
    path: "/robots.txt",
    label: "robots.txt",
    desc: "คำสั่งสำหรับบอทค้นหา รวมถึงการเข้าถึงของ AI",
    icon: "smart_toy",
  },
  {
    path: "/sitemap.xml",
    label: "sitemap.xml",
    desc: "แผนผังทุกหน้าของเว็บสำหรับ Google / Bing",
    icon: "account_tree",
  },
  {
    path: "/llms.txt",
    label: "llms.txt",
    desc: "แผนผังเว็บสำหรับ AI (ChatGPT, Claude, Perplexity)",
    icon: "auto_awesome",
  },
] as const;

/** Read-only card: view / download the auto-generated SEO files. Server component. */
export function SeoFilesCard() {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <h2 className="font-headline-sm text-headline-sm text-primary">ไฟล์ SEO (สร้างอัตโนมัติ)</h2>
      <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">
        ระบบสร้างไฟล์เหล่านี้ให้อัตโนมัติจากข้อมูลสินค้าและการตั้งค่า — เปิดดูหรือดาวน์โหลดเพื่อส่งให้ทีม SEO
        (แสดงค่าล่าสุดหลังกดบันทึก)
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {SEO_FILES.map((f) => (
          <div
            key={f.path}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant p-3"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
              <Icon name={f.icon} className="text-lg" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-body-md text-body-md font-medium text-on-surface">{f.label}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{f.desc}</p>
            </div>
            <a
              href={f.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-none items-center gap-1 rounded-lg border border-outline-variant px-3 py-2 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              <Icon name="open_in_new" className="text-base" />
              ดู
            </a>
            <a
              href={f.path}
              download
              className="flex flex-none items-center gap-1 rounded-lg bg-primary px-3 py-2 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              <Icon name="download" className="text-base" />
              ดาวน์โหลด
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
