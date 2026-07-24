import { redirect } from "next/navigation";

/** "ตั้งค่า SEO" landing → first sub-page. */
export default function SeoSettingsIndex() {
  redirect("/admin/seo/settings/website");
}
