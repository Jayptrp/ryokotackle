import Link from "next/link";
import { Icon } from "@/components/icon";

/** Shared header for the SEO sub-pages: title + subtitle + "view live" link. */
export function SeoPageHeader({
  title,
  subtitle,
  viewHref = "/",
}: {
  title: string;
  subtitle?: string;
  viewHref?: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3">
      <div>
        <h1 className="font-headline-md text-headline-md text-primary">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 font-body-sm text-body-sm text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      <Link
        href={viewHref}
        target="_blank"
        className="flex flex-none items-center gap-1 font-label-caps text-label-caps text-secondary hover:underline"
      >
        <Icon name="open_in_new" className="text-base" />
        ดูหน้าจริง
      </Link>
    </div>
  );
}
