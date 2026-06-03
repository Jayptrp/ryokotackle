"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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

const NAV_LINKS = [
  { href: "/", label: "หน้าแรก" },
  { href: "/products", label: "สินค้าทั้งหมด" },
  { href: "/contact", label: "ติดต่อเรา" },
  { href: "/about", label: "เกี่ยวกับเรา" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface transition-all duration-300 ease-in-out">
      <Container className="flex h-20 items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-headline-md text-headline-md font-bold tracking-tight text-primary"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-highest">
            <Icon name="water_drop" className="text-primary/60 text-2xl" />
          </span>
          Ryoko
        </Link>

        {/* Desktop nav */}
        <nav className="hidden h-full items-center justify-center gap-stack-lg md:flex">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "font-label-caps text-label-caps transition-colors",
                  active
                    ? "border-b-2 border-tertiary-container pb-1 text-on-tertiary-container"
                    : "text-on-surface-variant hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Trailing actions */}
        <div className="flex items-center gap-stack-md">
          <button
            type="button"
            aria-label="ค้นหา"
            className="rounded-full p-base text-primary transition-all hover:bg-surface-container-low"
          >
            <Icon name="search" />
          </button>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="เมนู"
                  className="p-base text-primary md:hidden"
                />
              }
            >
              <Icon name="menu" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-surface">
              <SheetHeader>
                <SheetTitle className="font-headline-md text-headline-md text-primary">
                  Ryoko
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-base px-4">
                {NAV_LINKS.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "rounded-lg px-4 py-3 font-body-md text-body-md transition-colors",
                        active
                          ? "bg-surface-container text-on-tertiary-container"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
