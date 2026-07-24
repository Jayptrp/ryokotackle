import { SeoPageHeader } from "@/components/admin/seo/seo-page-header";
import { SeoWebsiteEditor } from "@/components/admin/seo/website-editor";
import { getSiteSettings } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_ORDER = ["/", "/products", "/about", "/contact", "/warranty"];

export default async function SeoWebsitePage() {
  const supabase = await createAdminClient();
  const [settings, { data: pageRows }] = await Promise.all([
    getSiteSettings(),
    supabase.from("page_seo").select("path, label, meta_title, meta_description"),
  ]);

  const pageSeo = (pageRows ?? [])
    .map((r) => ({
      path: r.path,
      label: r.label,
      metaTitle: r.meta_title ?? "",
      metaDescription: r.meta_description ?? "",
    }))
    .sort((a, b) => {
      const ia = PAGE_ORDER.indexOf(a.path);
      const ib = PAGE_ORDER.indexOf(b.path);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return (
    <div className="mx-auto max-w-3xl">
      <SeoPageHeader
        title="ข้อมูลเว็บไซต์"
        subtitle="หัวข้อ คำอธิบาย คำสำคัญ และ Meta รายหน้า — แก้ไขได้เองโดยไม่ต้องแก้โค้ด"
      />
      <SeoWebsiteEditor settings={settings} pageSeo={pageSeo} />
    </div>
  );
}
