import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/auth/actions";
import { Icon } from "@/components/icon";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin — Ryoko Tackle" };

const NAV = [
  { href: "/admin", label: "สินค้าทั้งหมด", icon: "inventory_2", exact: true },
  { href: "/admin/products/new", label: "เพิ่มสินค้าใหม่", icon: "add_circle" },
  { href: "/admin/pages/about", label: "แก้ไขหน้าเกี่ยวกับเรา", icon: "description" },
] as const;

// Grouped section for editing the homepage.
const HOME_NAV = {
  label: "แก้ไขหน้าแรก",
  items: [
    { href: "/admin/home/carousel", label: "แก้ไข carousel", icon: "view_carousel" },
    { href: "/admin/home/categories", label: "แก้ไขรูปหมวดหมู่", icon: "grid_view" },
    { href: "/admin/home/featured", label: "แก้ไขสินค้าแนะนำ", icon: "star" },
  ],
} as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // Verify admin_users membership
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) redirect("/admin/login?error=forbidden");

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-outline-variant bg-surface-container-lowest">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2 border-b border-outline-variant px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary">
            <Icon name="water_drop" filled className="text-sm text-white" />
          </span>
          <span className="font-headline-sm text-headline-sm font-bold text-primary">
            Ryoko Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            >
              <Icon name={item.icon} className="text-xl" />
              {item.label}
            </Link>
          ))}

          {/* Homepage editing group */}
          <p className="mt-4 mb-1 px-3 font-label-caps text-label-caps text-on-surface-variant/70">
            {HOME_NAV.label}
          </p>
          {HOME_NAV.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            >
              <Icon name={item.icon} className="text-xl" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="border-t border-outline-variant p-3">
          {user && (
            <p className="mb-2 truncate px-3 font-body-sm text-body-sm text-on-surface-variant">
              {user.email}
            </p>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body-sm text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
            >
              <Icon name="logout" className="text-xl" />
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
