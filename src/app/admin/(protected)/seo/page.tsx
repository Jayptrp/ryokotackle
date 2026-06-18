import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icon";
import { SeoGapsTable, type SeoGapRow } from "@/components/admin/seo-gaps-table";

export const dynamic = "force-dynamic";

export default async function SeoOverviewPage() {
  const supabase = await createAdminClient();

  const [{ data: products }, { data: withDesc }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, name_th, status, summary, product_media(type)")
      .order("name"),
    supabase.from("products").select("id").not("description", "is", null).neq("description", ""),
  ]);

  const hasDescSet = new Set((withDesc ?? []).map((r) => r.id));

  const rows = (products ?? []).map((p) => {
    const media = (p.product_media ?? []) as { type: string }[];
    const hasImage = media.some((m) => m.type === "image");
    return {
      id: p.id,
      name: p.name,
      nameTh: p.name_th,
      status: p.status,
      hasImage,
      hasSummary: !!p.summary?.trim(),
      hasDescription: hasDescSet.has(p.id),
    };
  });

  const published = rows.filter((r) => r.status === "published");
  const total = published.length;

  const counts = {
    noImage:       published.filter((r) => !r.hasImage).length,
    noNameTh:      published.filter((r) => !r.nameTh).length,
    noSummary:     published.filter((r) => !r.hasSummary).length,
    noDescription: published.filter((r) => !r.hasDescription).length,
  };
  const withAnyGap = published.filter(
    (r) => !r.hasImage || !r.nameTh || !r.hasSummary || !r.hasDescription,
  ).length;

  const gapRows: SeoGapRow[] = rows
    .map((r) => ({
      ...r,
      gapCount:
        (r.hasImage ? 0 : 1) +
        (r.nameTh ? 0 : 1) +
        (r.hasSummary ? 0 : 1) +
        (r.hasDescription ? 0 : 1),
    }))
    .filter((r) => r.gapCount > 0)
    .sort((a, b) => b.gapCount - a.gapCount || a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-headline-md text-headline-md text-primary">ภาพรวม SEO</h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "สินค้าเผยแพร่",   value: total,                icon: "inventory_2", accent: false },
          { label: "ไม่มีรูป",         value: counts.noImage,       icon: "hide_image",  accent: counts.noImage > 0 },
          { label: "ไม่มีชื่อไทย",     value: counts.noNameTh,      icon: "translate",   accent: counts.noNameTh > 0 },
          { label: "ไม่มีสรุป",        value: counts.noSummary,     icon: "short_text",  accent: counts.noSummary > 0 },
          { label: "ไม่มีรายละเอียด", value: counts.noDescription, icon: "article",     accent: counts.noDescription > 0 },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 shadow-sm ${
              card.accent
                ? "border-error/30 bg-error-container/20"
                : "border-outline-variant bg-surface-container-lowest"
            }`}
          >
            <Icon
              name={card.icon}
              className={`mb-1 text-lg ${card.accent ? "text-error" : "text-on-surface-variant"}`}
            />
            <p className={`font-headline-md text-headline-md ${card.accent ? "text-error" : "text-primary"}`}>
              {card.value}
            </p>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{card.label}</p>
          </div>
        ))}
      </div>

      <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
        สินค้าเผยแพร่ที่ข้อมูลไม่ครบ:{" "}
        <span className="font-medium text-error">{withAnyGap}</span> จาก {total} รายการ
        {total > 0 && (
          <span className="ml-1 text-on-surface-variant/60">
            ({Math.round((withAnyGap / total) * 100)}%)
          </span>
        )}
      </p>

      <SeoGapsTable rows={gapRows} />
    </div>
  );
}
