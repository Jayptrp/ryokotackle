import Link from "next/link";
import { notFound } from "next/navigation";
import { PageEditor } from "@/components/admin/page-editor";
import { Icon } from "@/components/icon";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PageEditorRoute({
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

      <PageEditor
        page={{
          id: page.id,
          slug: page.slug,
          title: page.title,
          titleTh: page.title_th,
          content: page.content,
          status: page.status,
        }}
      />
    </div>
  );
}
