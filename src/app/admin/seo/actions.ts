"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SocialLink, FooterLink } from "@/lib/types";

const str = (v: string) => (v.trim() ? v.trim() : null);

/**
 * A settings change can affect every page, so each save revalidates the whole
 * layout tree plus the standalone metadata routes (robots reads the AI-crawler
 * flags; llms.txt/sitemap read the catalog + settings).
 */
function revalidateEverything() {
  revalidatePath("/", "layout");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
}

/* ───────────────────────────────── ข้อมูลเว็บไซต์ + Meta รายหน้า ── */

export interface PageSeoInput {
  path: string;
  metaTitle: string;
  metaDescription: string;
}

export interface WebsiteInput {
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string[];
  ogImageUrl: string;
  pageSeo: PageSeoInput[];
}

export async function saveSeoWebsite(input: WebsiteInput): Promise<void> {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("site_settings")
    .update({
      site_name: str(input.siteName),
      site_title: str(input.siteTitle),
      site_description: str(input.siteDescription),
      site_keywords: input.siteKeywords.map((k) => k.trim()).filter(Boolean),
      og_image_url: str(input.ogImageUrl),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;

  const results = await Promise.all(
    input.pageSeo.map((p) =>
      supabase
        .from("page_seo")
        .update({
          meta_title: str(p.metaTitle),
          meta_description: str(p.metaDescription),
          updated_at: new Date().toISOString(),
        })
        .eq("path", p.path),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  revalidateEverything();
}

/* ─────────────────────────── ข้อมูลบริษัท (NAP) + โซเชียล + Footer ── */

export interface CompanyInput {
  company: {
    legalName: string;
    legalNameTh: string;
    slogan: string;
    email: string;
    phone: string;
    mobile: string;
    fax: string;
    street: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
    line: string;
  };
  socials: SocialLink[];
  footerLinks: FooterLink[];
}

export async function saveSeoCompany(input: CompanyInput): Promise<void> {
  const supabase = await createAdminClient();
  const { company: c } = input;

  const { error } = await supabase
    .from("site_settings")
    .update({
      company_legal_name: str(c.legalName),
      company_legal_name_th: str(c.legalNameTh),
      company_slogan: str(c.slogan),
      company_email: str(c.email),
      company_phone: str(c.phone),
      company_mobile: str(c.mobile),
      company_fax: str(c.fax),
      address_street: str(c.street),
      address_locality: str(c.locality),
      address_region: str(c.region),
      address_postal_code: str(c.postalCode),
      address_country: str(c.country),
      line_id: str(c.line),
      socials: input.socials
        .filter((s) => s.url.trim())
        .map((s) => ({ platform: s.platform.trim(), url: s.url.trim() })),
      footer_links: input.footerLinks
        .filter((l) => l.label.trim() && l.href.trim())
        .map((l) => ({ label: l.label.trim(), href: l.href.trim() })),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;

  revalidateEverything();
}

/* ───────────────────── เครื่องมือวัดผล + AI + โค้ดขั้นสูง ── */

export interface ToolsInput {
  ga4Id: string;
  gtmId: string;
  gscVerification: string;
  customHeadHtml: string;
  customBodyHtml: string;
  aiCrawlers: {
    gptbot: boolean;
    claudebot: boolean;
    perplexitybot: boolean;
    googleExtended: boolean;
  };
}

export async function saveSeoTools(input: ToolsInput): Promise<void> {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("site_settings")
    .update({
      ga4_id: str(input.ga4Id),
      gtm_id: str(input.gtmId),
      gsc_verification: str(input.gscVerification),
      custom_head_html: str(input.customHeadHtml),
      custom_body_html: str(input.customBodyHtml),
      allow_gptbot: input.aiCrawlers.gptbot,
      allow_claudebot: input.aiCrawlers.claudebot,
      allow_perplexitybot: input.aiCrawlers.perplexitybot,
      allow_google_extended: input.aiCrawlers.googleExtended,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;

  revalidateEverything();
}
