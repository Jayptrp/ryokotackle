"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "@/components/i18n/language-provider";
import { LocalizedName  } from "@/components/i18n/localized";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import type { Category } from "@/lib/types";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  // Expanded (big logo + full company name) at the top; shrinks to the compact
  // logo + "Ryoko" once the user scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // Hysteresis: once expanded, collapse only past 64px; once collapsed,
      // expand only back near the top (≤8px). The dead zone between keeps tiny
      // touchpad scrolls near the edge from rapidly flipping the header.
      setScrolled((prev) => (prev ? y > 8 : y > 64));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [logoSrc, setLogoSrc] = useState("/ryoko-logo.png");
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setLogoSrc(isDark ? "/original-ryoko-logo.png" : "/ryoko-logo.png");

    const observer = new MutationObserver(() => {
      const isDarkNow = document.documentElement.classList.contains("dark");
      setLogoSrc(isDarkNow ? "/original-ryoko-logo.png" : "/ryoko-logo.png");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const linkCls = (active: boolean) =>
    cn(
      "font-label-caps text-label-caps transition-colors",
      active
        ? "border-b-2 border-tertiary-container pb-1 text-on-tertiary-container"
        : "text-on-surface-variant hover:text-primary",
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface">
      <Container
        className={cn(
          "flex items-center justify-between gap-3 transition-all duration-300",
          scrolled ? "h-16 md:h-20" : "h-32 md:h-40",
        )}
      >
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src={logoSrc}
            alt="Ryoko Tackle"
            width={64}
            height={64}
            className={cn(
              "flex-none transition-all duration-300",
              scrolled ? "h-12 w-12 md:h-16 md:w-16" : "h-24 w-24 md:h-32 md:w-32",
            )}
            priority
            unoptimized
          />
          {scrolled ? (
            <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
              Ryoko
            </span>
          ) : (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-headline-sm text-sm font-bold text-primary md:text-base lg:text-headline-sm">
                บริษัท ที.อาร์.วาย.ฟิชชิ่ง แทคเคิล จำกัด
              </span>
              <span className="mt-0.5 text-[11px] leading-tight text-on-surface-variant md:text-xs">
                T.R.Y. Fishing Tackle Co., Ltd.
              </span>
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden h-full items-center justify-center gap-stack-lg md:flex">
          <Link href="/" className={linkCls(pathname === "/")}>
            {t("nav.home")}
          </Link>

          {/* Products with category dropdown */}
          <div className="group relative flex h-full items-center">
            <Link
              href="/products"
              className={cn(
                linkCls(
                  isActive(pathname, "/products") ||
                    isActive(pathname, "/category"),
                ),
                "flex items-center gap-1",
              )}
            >
              {t("nav.products")}
              <Icon name="expand_more" className="text-base" />
            </Link>
            <div className="invisible absolute left-1/2 top-full z-50 w-[560px] -translate-x-1/2 rounded-xl border border-outline-variant bg-surface-container-lowest p-stack-md opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
              <div className="grid grid-cols-2 gap-1">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                  >
                    <Icon name={c.icon ?? "category"} className="text-xl" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-body-sm text-body-sm font-medium">
                        <LocalizedName th={c.nameTh} other={c.name} />
                      </span>
                      {c.nameTh && c.nameTh !== c.name && (
                        <span className="text-xs opacity-75">
                          {c.name}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/warranty"
            className={linkCls(isActive(pathname, "/warranty"))}
          >
            {t("nav.warranty")}
          </Link>

          <Link
            href="/contact"
            className={linkCls(isActive(pathname, "/contact"))}
          >
            {t("nav.contact")}
          </Link>
          <Link href="/about" className={linkCls(isActive(pathname, "/about"))}>
            {t("nav.about")}
          </Link>
        </nav>

        <div className="flex items-center gap-stack-md">
          <DarkModeToggle />

          <LanguageSwitcher />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label={t("aria.menu")}
                  className="p-base text-primary md:hidden"
                />
              }
            >
              <Icon name="menu" />
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto bg-surface">
              <SheetHeader>
                <SheetTitle className="font-headline-md text-headline-md text-primary">
                  Ryoko
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 pb-8">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  {t("nav.home")}
                </Link>
                <Link
                  href="/products"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  {t("nav.products")}
                </Link>

                <span className="mt-2 px-4 font-label-caps text-label-caps text-on-surface-variant/70">
                  {t("nav.categories")}
                </span>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                  >
                    <Icon name={c.icon ?? "category"} className="text-lg" />
                    <LocalizedName th={c.nameTh} other={c.name} />
                  </Link>
                ))}

                <Link
                  href="/warranty"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  {t("nav.warranty")}
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  {t("nav.contact")}
                </Link>
                <Link
                  href="/about"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  {t("nav.about")}
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
