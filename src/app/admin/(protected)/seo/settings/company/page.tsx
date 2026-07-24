import { SeoPageHeader } from "@/components/admin/seo/seo-page-header";
import { SeoCompanyEditor } from "@/components/admin/seo/company-editor";
import { getSiteSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SeoCompanyPage() {
  const settings = await getSiteSettings();
  return (
    <div className="mx-auto max-w-3xl">
      <SeoPageHeader
        title="ข้อมูลบริษัท (NAP)"
        subtitle="ชื่อบริษัท ที่อยู่ ช่องทางติดต่อ โซเชียล และลิงก์ใน Footer"
      />
      <SeoCompanyEditor settings={settings} />
    </div>
  );
}
