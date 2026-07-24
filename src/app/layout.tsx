import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { AnalyticsHead, GtmNoScript } from "@/components/analytics";
import { CustomCode } from "@/components/custom-code";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { getCategoryTree, getSiteSettings, getPageSeo } from "@/lib/queries";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

/**
 * Site-wide metadata, sourced from the admin-editable `site_settings` row (with
 * the `/` route's optional per-page override applied on top). `title.default`
 * covers the homepage and any page without its own generateMetadata; the
 * `%s | {siteName}` template wraps titles that individual pages do set.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [s, home] = await Promise.all([getSiteSettings(), getPageSeo("/")]);
  const title = home.metaTitle || s.siteTitle;
  const description = home.metaDescription || s.siteDescription;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${s.siteName}`,
    },
    description,
    keywords: s.siteKeywords,
    applicationName: s.siteName,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: s.siteName,
      title,
      description,
      url: SITE_URL,
      locale: "th_TH",
      images: [{ url: s.ogImageUrl, width: 1200, height: 630, alt: s.siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [s.ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    ...(s.gscVerification ? { verification: { google: s.gscVerification } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#001e40",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [categories, settings] = await Promise.all([
    getCategoryTree(),
    getSiteSettings(),
  ]);
  const { company } = settings;

  // Site-wide structured data: who the company is + sitewide search.
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: settings.siteName,
    legalName: company.legalName,
    slogan: company.slogan,
    url: SITE_URL,
    image: absoluteUrl(settings.ogImageUrl),
    email: company.email,
    telephone: company.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.street,
      addressLocality: company.address.locality,
      addressRegion: company.address.region,
      postalCode: company.address.postalCode,
      addressCountry: company.address.country,
    },
    sameAs: settings.socials.map((s) => s.url),
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: SITE_URL,
    inLanguage: "th",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="th" className={`${ibmPlexSansThai.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <AnalyticsHead ga4Id={settings.ga4Id} gtmId={settings.gtmId} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-on-background selection:bg-secondary-container">
        <GtmNoScript gtmId={settings.gtmId} />
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        <LanguageProvider>
          <SiteHeader categories={categories} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LanguageProvider>
        <CustomCode head={settings.customHeadHtml} body={settings.customBodyHtml} />
      </body>
    </html>
  );
}
