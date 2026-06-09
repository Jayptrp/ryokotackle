import Link from "next/link";
import { notFound } from "next/navigation";
import { savePage } from "@/app/admin/pages/actions";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Icon } from "@/components/icon";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PageEditor({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createAdminClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, slug, title, title_th, content, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="arrow_back" className="text-base" />
            กลับ
          </Link>
          <span className="text-outline-variant">/</span>
          <h1 className="font-headline-md text-headline-md text-primary">
            แก้ไขหน้า: {page.title}
          </h1>
        </div>
        <Link
          href={`/${page.slug}`}
          target="_blank"
          className="flex items-center gap-1 font-label-caps text-label-caps text-secondary hover:underline"
        >
          <Icon name="open_in_new" className="text-base" />
          ดูหน้าจริง
        </Link>
      </div>

      <form action={savePage} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={page.id} />
        <input type="hidden" name="slug" value={page.slug} />

        {/* Titles + status */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                หัวข้อ (อังกฤษ) <span className="text-error">*</span>
              </label>
              <input
                name="title"
                required
                defaultValue={page.title}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                หัวข้อ (ไทย)
              </label>
              <input
                name="title_th"
                defaultValue={page.title_th ?? ""}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                สถานะ
              </label>
              <select
                name="status"
                defaultValue={page.status}
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                <option value="published">เผยแพร่</option>
                <option value="draft">ฉบับร่าง</option>
                <option value="hidden">ซ่อน</option>
              </select>
            </div>
          </div>
        </section>

        {/* Rich-text body */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="mb-1 font-headline-sm text-headline-sm text-primary">
            เนื้อหา
          </h2>
          <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
            จัดรูปแบบข้อความ หัวข้อ ตาราง รูปภาพ และลิงก์ได้
          </p>
          <TiptapEditor name="content" defaultValue={page.content} />
        </section>

        <button
          type="submit"
          className="flex items-center gap-2 self-start rounded-lg bg-primary px-8 py-3 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
        >
          <Icon name="save" className="text-base" />
          บันทึกหน้า
        </button>
      </form>
    </div>
  );
}
