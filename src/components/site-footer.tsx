import Link from "next/link";
import { Container } from "@/components/container";
import { BrandIcon } from "@/components/brand-icon";
import { getSiteSettings } from "@/lib/queries";

/** Human label for a social platform key (falls back to the key itself). */
const SOCIAL_LABEL: Record<string, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  line: "LINE",
  x: "X",
  twitter: "X",
};

/** Whether an href points outside the site (renders as a real anchor). */
const isExternal = (href: string) => /^https?:\/\//i.test(href) || href.startsWith("mailto:");

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const { company } = settings;
  const { address } = company;
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
      <Container className="grid grid-cols-1 gap-stack-lg py-section-gap md:grid-cols-12">
        {/* Brand + NAP */}
        <div className="md:col-span-5">
          <span className="font-headline-sm text-headline-sm font-bold text-primary">
            {settings.siteName}
          </span>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {company.slogan}
          </p>
          <address className="mt-stack-md not-italic font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
            {company.legalNameTh}
            <br />
            {address.street}, {address.locality}, {address.region} {address.postalCode}
            <br />
            โทร{" "}
            <a href={`tel:${company.phone}`} className="hover:text-primary">
              {company.phone}
            </a>{" "}
            ·{" "}
            <a href={`tel:${company.mobile}`} className="hover:text-primary">
              {company.mobile}
            </a>
            <br />
            <a href={`mailto:${company.email}`} className="hover:text-primary">
              {company.email}
            </a>{" "}
            · LINE {company.line}
          </address>
        </div>

        {/* Quick links */}
        <nav className="flex flex-col gap-stack-sm md:col-span-4">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            ลิงก์
          </span>
          {settings.footerLinks.map((link) =>
            isExternal(link.href) ? (
              <a
                key={link.href}
                href={link.href}
                className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-secondary"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-secondary"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        {/* Social */}
        {settings.socials.length > 0 && (
          <div className="flex flex-col gap-stack-sm md:col-span-3">
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              ติดตามเรา
            </span>
            <div className="flex gap-stack-md">
              {settings.socials.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={SOCIAL_LABEL[s.platform] ?? s.platform ?? "Social"}
                  className="text-on-surface-variant transition-colors hover:text-primary"
                >
                  <BrandIcon name={s.platform} fallback="link" className="text-xl" />
                </a>
              ))}
            </div>
          </div>
        )}
      </Container>

      <div className="border-t border-outline-variant">
        <Container className="py-stack-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            © {year} {company.legalName} — All Rights Reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
