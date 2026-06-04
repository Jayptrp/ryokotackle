import Link from "next/link";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";

/** Builds a query string from the current params with an overridden page. */
function hrefFor(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "page") sp.set(k, v);
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  const items: (number | "…")[] = [];
  let last = 0;
  for (const p of pages) {
    if (last && p - last > 1) items.push("…");
    items.push(p);
    last = p;
  }

  const linkCls =
    "flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 font-label-caps text-label-caps transition-all";

  return (
    <nav className="mt-stack-lg flex items-center justify-center gap-stack-sm">
      {page > 1 && (
        <Link
          href={hrefFor(basePath, searchParams, page - 1)}
          className={cn(linkCls, "border-outline-variant hover:border-primary")}
          aria-label="ก่อนหน้า"
        >
          <Icon name="chevron_left" className="text-lg" />
        </Link>
      )}
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-on-surface-variant">
            …
          </span>
        ) : (
          <Link
            key={it}
            href={hrefFor(basePath, searchParams, it)}
            className={cn(
              linkCls,
              it === page
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant hover:border-primary",
            )}
          >
            {it}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link
          href={hrefFor(basePath, searchParams, page + 1)}
          className={cn(linkCls, "border-outline-variant hover:border-primary")}
          aria-label="ถัดไป"
        >
          <Icon name="chevron_right" className="text-lg" />
        </Link>
      )}
    </nav>
  );
}
