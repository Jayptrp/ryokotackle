"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/admin/auth/actions";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string; icon: string; exact?: boolean }[] = [
  { href: "/admin", label: "สินค้าทั้งหมด", icon: "inventory_2", exact: true },
  { href: "/admin/products/new", label: "เพิ่มสินค้าใหม่", icon: "add_circle" },
  { href: "/admin/pages/about", label: "แก้ไขหน้าเกี่ยวกับเรา", icon: "description" },
];

const HOME_NAV = {
  label: "แก้ไขหน้าแรก",
  items: [
    { href: "/admin/home/carousel", label: "แก้ไข carousel", icon: "view_carousel" },
    { href: "/admin/home/categories", label: "แก้ไขรูปหมวดหมู่", icon: "grid_view" },
    { href: "/admin/home/featured", label: "แก้ไขสินค้าแนะนำ", icon: "star" },
  ],
} as const;

const OPTIMIZE_NAV = {
  label: "เพิ่มประสิทธิภาพ",
  items: [
    { href: "/admin/seo", label: "ภาพรวม SEO", icon: "query_stats" },
  ],
} as const;

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-outline-variant bg-surface-container-lowest transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-outline-variant px-4 overflow-hidden whitespace-nowrap",
          isCollapsed ? "justify-center px-0" : "gap-3"
        )}
      >
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary shadow-sm">
          <Icon name="water_drop" filled className="text-lg text-white" />
        </span>
        {!isCollapsed && (
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary">
            Ryoko Admin
          </span>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface shadow-sm transition-transform hover:scale-110 hover:bg-surface-container"
      >
        <Icon
          name="chevron_left"
          className={cn("text-sm transition-transform duration-300", isCollapsed && "rotate-180")}
        />
      </button>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-none">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                isCollapsed ? "justify-center px-0 mx-1" : "gap-3"
              )}
            >
              <Icon
                name={item.icon}
                filled={active}
                className={cn("text-xl flex-none", !active && "group-hover:scale-110 transition-transform")}
              />
              {!isCollapsed && (
                <span className={cn("truncate font-body-sm text-body-sm", active && "font-medium")}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Homepage editing group */}
        <div
          className={cn(
            "mt-6 mb-2 flex items-center transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "px-3"
          )}
        >
          {isCollapsed ? (
            <div className="h-px w-8 bg-outline-variant" />
          ) : (
            <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant/50">
              {HOME_NAV.label}
            </span>
          )}
        </div>

        {HOME_NAV.items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                isCollapsed ? "justify-center px-0 mx-1" : "gap-3"
              )}
            >
              <Icon
                name={item.icon}
                filled={active}
                className={cn("text-xl flex-none", !active && "group-hover:scale-110 transition-transform")}
              />
              {!isCollapsed && (
                <span className={cn("truncate font-body-sm text-body-sm", active && "font-medium")}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Optimize group */}
        <div
          className={cn(
            "mt-6 mb-2 flex items-center transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "px-3"
          )}
        >
          {isCollapsed ? (
            <div className="h-px w-8 bg-outline-variant" />
          ) : (
            <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant/50">
              {OPTIMIZE_NAV.label}
            </span>
          )}
        </div>

        {OPTIMIZE_NAV.items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "group flex items-center rounded-xl px-3 py-2.5 transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                isCollapsed ? "justify-center px-0 mx-1" : "gap-3"
              )}
            >
              <Icon
                name={item.icon}
                filled={active}
                className={cn("text-xl flex-none", !active && "group-hover:scale-110 transition-transform")}
              />
              {!isCollapsed && (
                <span className={cn("truncate font-body-sm text-body-sm", active && "font-medium")}>
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className={cn("border-t border-outline-variant p-3", isCollapsed ? "px-2" : "px-3")}>
        {userEmail && !isCollapsed && (
          <div className="mb-3 px-3">
            <p className="truncate font-body-xs text-body-xs text-on-surface-variant/60">เข้าสู่ระบบโดย</p>
            <p className="truncate font-body-sm text-body-sm font-medium text-on-surface">{userEmail}</p>
          </div>
        )}
        <form action={signOut}>
          <button
            type="submit"
            title={isCollapsed ? "ออกจากระบบ" : undefined}
            className={cn(
              "flex w-full items-center rounded-xl px-3 py-2.5 text-on-surface-variant transition-all duration-200 hover:bg-error/10 hover:text-error",
              isCollapsed ? "justify-center px-0" : "gap-3"
            )}
          >
            <Icon name="logout" className="text-xl flex-none" />
            {!isCollapsed && <span className="font-body-sm text-body-sm">ออกจากระบบ</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
