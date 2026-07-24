/**
 * Server-rendered analytics tags driven by the admin SEO settings (site_settings).
 * These are the "safe, paste-an-id" integrations from the SEO panel — Google
 * Analytics 4 and Google Tag Manager — emitted into the initial HTML so they load
 * as early as Google recommends. IDs are sanitized to the characters Google uses,
 * so an admin can never break the inline script by pasting stray markup.
 *
 * (Google Search Console verification is handled separately via Next metadata's
 * `verification.google`; arbitrary snippets go through <CustomCode />.)
 */

/** Keep only the characters that appear in GA4 / GTM ids (defensive). */
const cleanId = (id: string) => id.replace(/[^A-Za-z0-9_-]/g, "");

export function AnalyticsHead({
  ga4Id,
  gtmId,
}: {
  ga4Id: string | null;
  gtmId: string | null;
}) {
  const ga4 = ga4Id ? cleanId(ga4Id) : "";
  const gtm = gtmId ? cleanId(gtmId) : "";

  return (
    <>
      {gtm && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`,
          }}
        />
      )}
      {ga4 && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`,
            }}
          />
        </>
      )}
    </>
  );
}

/** The GTM <noscript> fallback — must sit immediately after <body> opens. */
export function GtmNoScript({ gtmId }: { gtmId: string | null }) {
  if (!gtmId) return null;
  const gtm = cleanId(gtmId);
  if (!gtm) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm"
      />
    </noscript>
  );
}
