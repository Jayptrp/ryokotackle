/**
 * Shared Tailwind class string for rendering admin-authored rich text.
 *
 * Lives apart from `rich-content.tsx` so the client-side localized renderer
 * (`LocalizedRichContent`) can reuse the exact same styling without pulling the
 * server-only `sanitize-html` dependency into the client bundle.
 */
export const RICH_CONTENT_CLASSES = [
  "prose-ryoko font-body-md text-body-md leading-relaxed text-on-surface-variant",
  "[&_h2]:font-headline-sm [&_h2]:text-headline-sm [&_h2]:text-primary [&_h2]:mt-6 [&_h2]:mb-2",
  "[&_h3]:font-medium [&_h3]:text-on-surface [&_h3]:mt-4 [&_h3]:mb-1",
  "[&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1",
  "[&_a]:text-secondary [&_a]:underline",
  "[&_img]:my-4 [&_img]:rounded-lg [&_img]:border [&_img]:border-outline-variant",
  "[&_table]:w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:border-spacing-0 [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:border-outline-variant",
  "[&_th]:border [&_th]:border-outline-variant [&_th]:bg-secondary [&_th]:text-on-secondary [&_th]:p-3 [&_th]:text-left [&_th]:font-label-caps [&_th]:text-label-caps",
  "[&_td]:border [&_td]:border-outline-variant [&_td]:p-3",
].join(" ");
