import sanitizeHtml from "sanitize-html";
import { cn } from "@/lib/utils";

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
  const clean = sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "blockquote", "code", "pre",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "span", "div", "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      "*": ["style"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });

  return (
    <div
      className={cn(
        "prose-ryoko font-body-md text-body-md leading-relaxed text-on-surface-variant",
        "[&_h2]:font-headline-sm [&_h2]:text-headline-sm [&_h2]:text-primary [&_h2]:mt-6 [&_h2]:mb-2",
        "[&_h3]:font-medium [&_h3]:text-on-surface [&_h3]:mt-4 [&_h3]:mb-1",
        "[&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1",
        "[&_a]:text-secondary [&_a]:underline",
        "[&_img]:my-4 [&_img]:rounded-lg [&_img]:border [&_img]:border-outline-variant",
        "[&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:border-outline-variant",
        "[&_th]:bg-secondary [&_th]:text-on-secondary [&_th]:p-3 [&_th]:text-left [&_th]:font-label-caps [&_th]:text-label-caps",
        "[&_td]:border-t [&_td]:border-outline-variant [&_td]:p-3",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
