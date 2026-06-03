import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

const FOOTER_LINKS = [
  { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
  { href: "/terms", label: "ข้อกำหนดและเงื่อนไข" },
  { href: "/shipping", label: "การจัดส่ง" },
] as const;

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
      <Container className="flex flex-col items-start justify-between gap-base py-stack-lg md:flex-row md:items-center">
        <div className="mb-stack-md md:mb-0">
          <span className="font-headline-sm text-headline-sm font-bold text-primary">
            Ryoko
          </span>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            © 2024 Ryoko Tackle Thailand. Premium Japanese Craftsmanship.
          </p>
        </div>

        <nav className="flex flex-wrap gap-stack-lg">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-stack-md flex gap-stack-md md:mt-0">
          <a
            href="#"
            aria-label="เว็บไซต์"
            className="text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="public" />
          </a>
          <a
            href="#"
            aria-label="แชร์"
            className="text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="share" />
          </a>
        </div>
      </Container>
    </footer>
  );
}
