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
import type { Category } from "@/lib/types";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const linkCls = (active: boolean) =>
    cn(
      "font-label-caps text-label-caps transition-colors",
      active
        ? "border-b-2 border-tertiary-container pb-1 text-on-tertiary-container"
        : "text-on-surface-variant hover:text-primary",
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface">
      <Container className="flex h-20 items-center justify-between">
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
          <Link href="/" className={linkCls(pathname === "/")}>
            หน้าแรก
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
              สินค้าทั้งหมด
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
                    <span className="font-body-sm text-body-sm">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/contact"
            className={linkCls(isActive(pathname, "/contact"))}
          >
            ติดต่อเรา
          </Link>
          <Link href="/about" className={linkCls(isActive(pathname, "/about"))}>
            เกี่ยวกับเรา
          </Link>
        </nav>

        <div className="flex items-center gap-stack-md">
          <Link
            href="/products"
            aria-label="ค้นหา"
            className="rounded-full p-base text-primary transition-all hover:bg-surface-container-low"
          >
            <Icon name="search" />
          </Link>

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
                  หน้าแรก
                </Link>
                <Link
                  href="/products"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  สินค้าทั้งหมด
                </Link>

                <span className="mt-2 px-4 font-label-caps text-label-caps text-on-surface-variant/70">
                  หมวดหมู่
                </span>
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                  >
                    <Icon name={c.icon ?? "category"} className="text-lg" />
                    {c.name}
                  </Link>
                ))}

                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  ติดต่อเรา
                </Link>
                <Link
                  href="/about"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                >
                  เกี่ยวกับเรา
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
