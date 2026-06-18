import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

interface SeoRow {
  id: string;
  name: string;
  nameTh: string | null;
  status: string;
  hasImage: boolean;
  hasSummary: boolean;
  hasDescription: boolean;
}

export default async function SeoOverviewPage() {
  const supabase = await createAdminClient();

  const [{ data: products }, { data: withDesc }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, name_th, status, summary, product_media(type, is_primary, sort_order)")
      .order("name"),
    supabase.from("products").select("id").not("description", "is", null).neq("description", ""),
  ]);

  const hasDescSet = new Set((withDesc ?? []).map((r) => r.id));

  const rows: SeoRow[] = (products ?? []).map((p) => {
    const media = (p.product_media ?? []) as { type: string; is_primary: boolean; sort_order: number }[];
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
    noImage: published.filter((r) => !r.hasImage).length,
    noNameTh: published.filter((r) => !r.nameTh).length,
    noSummary: published.filter((r) => !r.hasSummary).length,
    noDescription: published.filter((r) => !r.hasDescription).length,
  };
  const withAnyGap = published.filter(
    (r) => !r.hasImage || !r.nameTh || !r.hasSummary || !r.hasDescription,
  ).length;

  // All products (any status) with at least one SEO gap — sorted worst first
  const gapRows = rows
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

  function Dot({ ok, label }: { ok: boolean; label: string }) {
    return (
      <span
        title={label}
        className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-medium ${
          ok
            ? "bg-secondary-container/60 text-on-secondary-container"
            : "bg-error-container/60 text-error"
        }`}
      >
        <Icon name={ok ? "check" : "close"} className="text-[11px]" />
        {label}
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-headline-md text-headline-md text-primary">ภาพรวม SEO</h1>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "สินค้าเผยแพร่", value: total, icon: "inventory_2", accent: false },
          { label: "ไม่มีรูป", value: counts.noImage, icon: "hide_image", accent: counts.noImage > 0 },
          { label: "ไม่มีชื่อไทย", value: counts.noNameTh, icon: "translate", accent: counts.noNameTh > 0 },
          { label: "ไม่มีสรุป", value: counts.noSummary, icon: "short_text", accent: counts.noSummary > 0 },
          { label: "ไม่มีรายละเอียด", value: counts.noDescription, icon: "article", accent: counts.noDescription > 0 },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 shadow-sm ${
              card.accent
                ? "border-error/30 bg-error-container/20"
                : "border-outline-variant bg-surface-container-lowest"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <Icon
                name={card.icon}
                className={`text-lg ${card.accent ? "text-error" : "text-on-surface-variant"}`}
              />
            </div>
            <p className={`font-headline-md text-headline-md ${card.accent ? "text-error" : "text-primary"}`}>
              {card.value}
            </p>
            <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Gap summary */}
      <p className="mb-4 font-body-sm text-body-sm text-on-surface-variant">
        สินค้าเผยแพร่ที่ข้อมูลไม่ครบ:{" "}
        <span className="font-medium text-error">{withAnyGap}</span> จาก {total} รายการ
        {total > 0 && (
          <span className="ml-1 text-on-surface-variant/60">
            ({Math.round((withAnyGap / total) * 100)}%)
          </span>
        )}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container">
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">
                ชื่อสินค้า
              </th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">
                สถานะ
              </th>
              <th className="px-4 py-3 text-left font-label-caps text-label-caps text-on-surface-variant">
                ข้อมูล SEO
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {gapRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center font-body-sm text-body-sm text-on-surface-variant">
                  <Icon name="check_circle" className="mb-2 text-3xl text-secondary" />
                  <p>ข้อมูล SEO ครบทุกสินค้า</p>
                </td>
              </tr>
            )}
            {gapRows.map((r, i) => (
              <tr
                key={r.id}
                className={`border-b border-outline-variant transition-colors hover:bg-surface-container-low ${
                  i % 2 === 0 ? "" : "bg-surface-container-lowest"
                }`}
              >
                <td className="px-4 py-3">
                  <p className="font-body-sm text-body-sm font-medium text-on-surface">
                    {r.nameTh ?? r.name}
                  </p>
                  {r.nameTh && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{r.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 font-label-caps text-label-caps ${
                      r.status === "published"
                        ? "bg-secondary-container text-on-secondary-container"
                        : r.status === "hidden"
                        ? "bg-surface-container text-on-surface-variant"
                        : "bg-error-container text-on-error-container"
                    }`}
                  >
                    {r.status === "published" ? "เผยแพร่" : r.status === "hidden" ? "ซ่อน" : "ร่าง"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Dot ok={r.hasImage} label="รูป" />
                    <Dot ok={!!r.nameTh} label="ชื่อไทย" />
                    <Dot ok={r.hasSummary} label="สรุป" />
                    <Dot ok={r.hasDescription} label="รายละเอียด" />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/products/${r.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 font-label-caps text-label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                  >
                    <Icon name="edit" className="text-base" />
                    แก้ไข
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
