import { signIn } from "@/app/admin/auth/actions";
import { Icon } from "@/components/icon";

export const metadata = { title: "Admin Login — Ryoko Tackle" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Icon name="water_drop" filled className="text-white text-xl" />
          </span>
          <span className="font-headline-md text-headline-md font-bold text-primary">
            Ryoko Admin
          </span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
          <h1 className="mb-6 font-headline-sm text-headline-sm text-primary">
            เข้าสู่ระบบ
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-error-container px-4 py-3 font-body-sm text-body-sm text-on-error-container">
              อีเมลหรือรหัสผ่านไม่ถูกต้อง
            </div>
          )}

          <form action={signIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                อีเมล
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="admin@example.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant">
                รหัสผ่าน
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="rounded-lg border border-outline-variant bg-white px-4 py-3 font-body-md text-body-md outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="mt-2 rounded-lg bg-primary py-3 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
            >
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
