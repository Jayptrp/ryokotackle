import { SeoPageHeader } from "@/components/admin/seo/seo-page-header";
import { SeoFilesCard } from "@/components/admin/seo/seo-files-card";
import { SeoToolsEditor } from "@/components/admin/seo/tools-editor";
import { getSiteSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SeoToolsPage() {
  const settings = await getSiteSettings();
  return (
    <div className="mx-auto max-w-3xl">
      <SeoPageHeader
        title="เครื่องมือวัดผล"
        subtitle="ไฟล์ SEO, Google Analytics / Tag Manager / Search Console, การเข้าถึงของ AI และโค้ดขั้นสูง"
      />
      <div className="mb-6">
        <SeoFilesCard />
      </div>
      <SeoToolsEditor settings={settings} />
    </div>
  );
}
