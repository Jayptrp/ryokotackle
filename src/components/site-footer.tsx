import Link from "next/link";
import { Container } from "@/components/container";
import { BrandIcon } from "@/components/brand-icon";
import { COMPANY, SITE_NAME } from "@/lib/seo";

const FOOTER_LINKS = [
  { href: "/warranty", label: "ประกันและอะไหล่" },
  // { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
  // { href: "/terms", label: "ข้อกำหนดและเงื่อนไข" },
  // { href: "/shipping", label: "การจัดส่ง" },
] as const;

const SOCIAL = [
  { href: "https://www.facebook.com/ryoko.tackle", label: "Facebook", brand: "facebook" },
  { href: "https://www.tiktok.com/@ryoko.tackle", label: "TikTok", brand: "tiktok" },
  { href: "https://www.youtube.com/@ryoko.tackle", label: "YouTube", brand: "youtube" },
  { href: "https://www.instagram.com/ryoko.tackle", label: "Instagram", brand: "instagram" },
] as const;

export function SiteFooter() {
  const { address } = COMPANY;
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
      <Container className="grid grid-cols-1 gap-stack-lg py-section-gap md:grid-cols-12">
        {/* Brand + NAP */}
        <div className="md:col-span-5">
          <span className="font-headline-sm text-headline-sm font-bold text-primary">
            {SITE_NAME}
          </span>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            {COMPANY.slogan}
          </p>
          <address className="mt-stack-md not-italic font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
            {COMPANY.legalNameTh}
            <br />
            {address.street}, {address.locality}, {address.region} {address.postalCode}
            <br />
            โทร{" "}
            <a href={`tel:${COMPANY.phone}`} className="hover:text-primary">
              {COMPANY.phone}
            </a>{" "}
            ·{" "}
            <a href={`tel:${COMPANY.mobile}`} className="hover:text-primary">
              {COMPANY.mobile}
            </a>
            <br />
            <a href={`mailto:${COMPANY.email}`} className="hover:text-primary">
              {COMPANY.email}
            </a>{" "}
            · LINE {COMPANY.line}
          </address>
        </div>

        {/* Quick links */}
        <nav className="flex flex-col gap-stack-sm md:col-span-4">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            ลิงก์
          </span>
          <Link href="/products" className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-secondary">
            สินค้าทั้งหมด
          </Link>
          <Link href="/contact" className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-secondary">
            ติดต่อเรา
          </Link>
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Social */}
        <div className="flex flex-col gap-stack-sm md:col-span-3">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            ติดตามเรา
          </span>
          <div className="flex gap-stack-md">
            {SOCIAL.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                <BrandIcon name={s.brand} className="text-xl" />
              </a>
            ))}
          </div>
        </div>
      </Container>

      <div className="border-t border-outline-variant">
        <Container className="py-stack-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            © {year} {COMPANY.legalName} — All Rights Reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
