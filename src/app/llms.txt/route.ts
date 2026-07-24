import {
  getSiteSettings,
  getCategoryTree,
  getAllPublishedListItems,
} from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

/**
 * Served at /llms.txt — the emerging convention for giving AI assistants
 * (ChatGPT, Claude, Perplexity, Gemini) a clean, curated map of the site. It's a
 * plain-markdown index of the catalog so answer engines can find and cite the
 * right pages. Generated at build from the live catalog; refreshed on demand when
 * an admin edits a product (revalidatePath("/llms.txt") in the product save).
 */
export const dynamic = "force-static";

export async function GET() {
  const [settings, categories, products] = await Promise.all([
    getSiteSettings(),
    getCategoryTree(),
    getAllPublishedListItems(),
  ]);

  const lines: string[] = [];
  lines.push(`# ${settings.siteName}`);
  lines.push("");
  lines.push(`> ${settings.siteDescription}`);
  lines.push("");
  lines.push(
    `${settings.company.legalNameTh} — ร้านจำหน่ายอุปกรณ์ตกปลา (product catalog). ` +
      `ติดต่อ: ${settings.company.email} · โทร ${settings.company.phone} · LINE ${settings.company.line}.`,
  );
  lines.push("");

  lines.push("## หมวดหมู่สินค้า (Categories)");
  for (const c of categories) {
    const label = c.nameTh ?? c.name;
    lines.push(`- [${label}](${absoluteUrl(`/category/${c.slug}`)})`);
    for (const child of c.children ?? []) {
      const cl = child.nameTh ?? child.name;
      lines.push(`  - [${cl}](${absoluteUrl(`/category/${child.slug}`)})`);
    }
  }
  lines.push("");

  lines.push("## สินค้า (Products)");
  for (const p of products) {
    const label = p.nameTh ?? p.name;
    const summary = p.summary?.replace(/\s+/g, " ").trim();
    const suffix = summary ? `: ${summary}` : "";
    lines.push(`- [${label}](${absoluteUrl(`/products/${p.slug}`)})${suffix}`);
  }
  lines.push("");

  lines.push("## หน้าอื่น ๆ");
  lines.push(`- [เกี่ยวกับเรา](${absoluteUrl("/about")})`);
  lines.push(`- [ประกันและอะไหล่](${absoluteUrl("/warranty")})`);
  lines.push(`- [ติดต่อเรา](${absoluteUrl("/contact")})`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
