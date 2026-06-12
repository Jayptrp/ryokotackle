import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCategories } from "@/lib/queries";
import { ProductEditor } from "@/components/admin/product-editor";
import type { ProductMedia } from "@/lib/types";
import type { ChannelRow } from "@/components/admin/channel-manager";

export const dynamic = "force-dynamic";

export default async function ProductEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: pageError } = await searchParams;
  const isNew = id === "new";

  const supabase = await createAdminClient();
  const categories = await getCategories();

  let product: {
    id: string; slug: string; name: string; nameTh: string | null;
    summary: string | null; description: string | null;
    categoryId: string | null; status: string; isFeatured: boolean;
    media: ProductMedia[]; channels: ChannelRow[];
  } | null = null;

  if (!isNew) {
    const { data } = await supabase
      .from("products")
      .select(
        "id, slug, name, name_th, summary, description, category_id, status, is_featured, media:product_media(id, type, provider, url, alt, sort_order, is_primary), channels:product_channels(id, channel, url, sort_order)",
      )
      .eq("id", id)
      .maybeSingle();

    if (!data) notFound();

    const raw = data as typeof data & { media: never[]; channels: never[] };

    product = {
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      nameTh: raw.name_th,
      summary: raw.summary,
      description: raw.description,
      categoryId: raw.category_id,
      status: raw.status,
      isFeatured: raw.is_featured ?? false,
      media: (raw.media ?? [])
        .sort((a: never, b: never) => (a as { sort_order: number }).sort_order - (b as { sort_order: number }).sort_order)
        .map((m: never) => {
          const mm = m as { id: string; type: string; provider: string | null; url: string; alt: string | null; sort_order: number; is_primary: boolean };
          return {
            id: mm.id,
            type: mm.type as "image" | "video",
            provider: mm.provider as never,
            url: mm.url,
            alt: mm.alt,
            sortOrder: mm.sort_order,
            isPrimary: mm.is_primary,
          } satisfies ProductMedia;
        }),
      channels: (raw.channels ?? [])
        .sort((a: never, b: never) => (a as { sort_order: number }).sort_order - (b as { sort_order: number }).sort_order)
        .map((c: never) => {
          const cc = c as { channel: string; url: string };
          return { channel: cc.channel as ChannelRow["channel"], url: cc.url };
        }),
    };
  }

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    label: c.nameTh ?? c.name,
    parentSlug: c.parentSlug ?? null,
  }));

  return (
    <ProductEditor
      isNew={isNew}
      pageError={pageError}
      product={product}
      categories={categoryOptions}
    />
  );
}
