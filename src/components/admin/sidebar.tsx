"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/admin/auth/actions";
import { usePathname } from "next/navigation";

type NavChild = { href: string; label: string; icon: string };
type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  /** When present, this item is a collapsible parent; `href` is only its key. */
  children?: NavChild[];
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "สินค้า",
    items: [
      { href: "/admin", label: "สินค้าทั้งหมด", icon: "inventory_2", exact: true },
      { href: "/admin/products/new", label: "เพิ่มสินค้าใหม่", icon: "add_circle" },
      { href: "/admin/categories", label: "จัดการหมวดหมู่", icon: "category" },
    ],
  },
  {
    label: "หน้าเว็บไซต์",
    items: [
      {
        href: "/admin/home",
        label: "หน้าแรก",
        icon: "home",
        children: [
          { href: "/admin/home/carousel", label: "แก้ไข carousel", icon: "view_carousel" },
          { href: "/admin/home/categories", label: "แก้ไขรูปหมวดหมู่", icon: "grid_view" },
          { href: "/admin/home/featured", label: "แก้ไขสินค้าแนะนำ", icon: "star" },
        ],
      },
      { href: "/admin/warranty", label: "หน้าประกันและอะไหล่", icon: "verified_user" },
      { href: "/admin/contact", label: "หน้าติดต่อเรา", icon: "contact_mail" },
      { href: "/admin/pages/about", label: "หน้าเกี่ยวกับเรา", icon: "description" },
    ],
  },
  {
    label: "SEO",
    items: [
      {
        href: "/admin/seo/settings",
        label: "ตั้งค่า SEO",
        icon: "travel_explore",
        children: [
          { href: "/admin/seo/settings/website", label: "ข้อมูลเว็บไซต์", icon: "language" },
          { href: "/admin/seo/settings/company", label: "ข้อมูลบริษัท (NAP)", icon: "domain" },
          { href: "/admin/seo/settings/tools", label: "เครื่องมือวัดผล", icon: "monitoring" },
        ],
      },
    ],
  },
];

export function Sidebar({ userEmail }: { userEmail?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  const childActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

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
      <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-3 scrollbar-none">
        {GROUPS.map((group, gi) => (
          <div key={group.label} className={cn("flex flex-col gap-1", gi > 0 && "mt-6")}>
            {/* Group header */}
            <div
              className={cn(
                "mb-1 flex items-center transition-all duration-300",
                isCollapsed ? "justify-center px-0" : "px-3"
              )}
            >
              {isCollapsed ? (
                <div className="h-px w-8 bg-outline-variant" />
              ) : (
                <span className="font-label-caps text-label-caps tracking-wider text-on-surface-variant/50">
                  {group.label}
                </span>
              )}
            </div>

            {group.items.map((item) => {
              // ── Collapsible parent (has children) ──────────────────────────
              if (item.children) {
                const hasActiveChild = item.children.some((c) => childActive(c.href));
                const open = openParents[item.href] ?? hasActiveChild;
                return (
                  <div key={item.href} className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenParents((s) => ({ ...s, [item.href]: !open }))
                      }
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center rounded-xl px-3 py-2.5 transition-all duration-200",
                        hasActiveChild
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                        isCollapsed ? "justify-center px-0 mx-1" : "gap-3"
                      )}
                    >
                      <Icon
                        name={item.icon}
                        filled={hasActiveChild}
                        className={cn("text-xl flex-none", !hasActiveChild && "group-hover:scale-110 transition-transform")}
                      />
                      {!isCollapsed && (
                        <>
                          <span className={cn("flex-1 truncate text-left font-body-sm text-body-sm", hasActiveChild && "font-medium")}>
                            {item.label}
                          </span>
                          <Icon
                            name="expand_more"
                            className={cn("text-lg flex-none transition-transform duration-200", open && "rotate-180")}
                          />
                        </>
                      )}
                    </button>

                    {/* Children */}
                    {open && (
                      <div
                        className={cn(
                          "flex flex-col gap-1",
                          isCollapsed ? "items-center" : "ml-4 border-l border-outline-variant pl-2"
                        )}
                      >
                        {item.children.map((child) => {
                          const active = childActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              title={isCollapsed ? child.label : undefined}
                              className={cn(
                                "group flex items-center rounded-lg transition-all duration-200",
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                                isCollapsed ? "h-9 w-9 justify-center" : "gap-2.5 px-3 py-2"
                              )}
                            >
                              <Icon
                                name={child.icon}
                                filled={active}
                                className={cn("text-lg flex-none", !active && "group-hover:scale-110 transition-transform")}
                              />
                              {!isCollapsed && (
                                <span className={cn("truncate font-body-sm text-body-sm", active && "font-medium")}>
                                  {child.label}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Flat item ──────────────────────────────────────────────────
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
          </div>
        ))}
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
