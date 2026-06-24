import { cn } from "@/lib/utils";
import { sanitizeRich } from "@/lib/sanitize-rich";
import { RICH_CONTENT_CLASSES } from "@/lib/rich-content-classes";

/**
 * Renders admin-authored rich text (Tiptap HTML) after sanitizing it. Allows the
 * tags Tiptap emits — including spec tables and inline images — but strips
 * scripts, event handlers and unsafe URLs.
 */
export function RichContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const clean = sanitizeRich(html);

  return (
    <div
      className={cn(RICH_CONTENT_CLASSES, className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
