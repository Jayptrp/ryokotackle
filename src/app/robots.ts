import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { getSiteSettings } from "@/lib/queries";

/**
 * Served at /robots.txt. Admin + API are always private; everything else is
 * crawlable. AI answer-engine crawlers (ChatGPT, Claude, Perplexity, Gemini) are
 * allowed by default so the catalog can appear in AI answers — each can be turned
 * off individually from /admin/seo/settings (stored in site_settings).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { aiCrawlers } = await getSiteSettings();

  // Map each admin toggle to the crawler user-agent tokens it governs.
  const aiBots: { enabled: boolean; agents: string[] }[] = [
    { enabled: aiCrawlers.gptbot, agents: ["GPTBot", "OAI-SearchBot", "ChatGPT-User"] },
    { enabled: aiCrawlers.claudebot, agents: ["ClaudeBot", "anthropic-ai", "Claude-Web"] },
    { enabled: aiCrawlers.perplexitybot, agents: ["PerplexityBot", "Perplexity-User"] },
    { enabled: aiCrawlers.googleExtended, agents: ["Google-Extended"] },
  ];

  const blocked = aiBots
    .filter((b) => !b.enabled)
    .map((b) => ({ userAgent: b.agents, disallow: "/" }));

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
      ...blocked,
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
