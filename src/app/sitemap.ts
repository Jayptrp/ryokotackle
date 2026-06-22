import type { MetadataRoute } from "next";
import { getCategories, getPublishedSlugs } from "@/lib/queries";
import { absoluteUrl } from "@/lib/seo";

/**
 * Dynamic sitemap: static routes + every category + every published product.
 * Served at /sitemap.xml. Submit this URL in Google Search Console.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, slugs] = await Promise.all([
    getCategories(),
    getPublishedSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/products"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/warranty"), changeFrequency: "yearly", priority: 0.4 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: absoluteUrl(`/category/${c.slug}`),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: absoluteUrl(`/products/${slug}`),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
