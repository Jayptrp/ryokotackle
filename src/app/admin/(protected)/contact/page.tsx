import Link from "next/link";
import { ContactEditor, type ContactRow } from "@/components/admin/contact-editor";
import { Icon } from "@/components/icon";
import { getContactCards } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ContactAdminPage() {
  const supabase = await createAdminClient();
  const [{ data }, cards] = await Promise.all([
    supabase
      .from("contact_page")
      .select("intro, location_desc, address, map_lat, map_lng")
      .eq("id", 1)
      .maybeSingle(),
    getContactCards(),
  ]);

  const contact: ContactRow = {
    intro: data?.intro ?? null,
    locationDesc: data?.location_desc ?? null,
    address: data?.address ?? null,
    mapLat: data?.map_lat ?? null,
    mapLng: data?.map_lng ?? null,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-headline-md text-headline-md text-primary">แก้ไขหน้าติดต่อเรา</h1>
        <Link
          href="/contact"
          target="_blank"
          className="flex items-center gap-1 font-label-caps text-label-caps text-secondary hover:underline"
        >
          <Icon name="open_in_new" className="text-base" />
          ดูหน้าจริง
        </Link>
      </div>
      <ContactEditor contact={contact} cards={cards} />
    </div>
  );
}
