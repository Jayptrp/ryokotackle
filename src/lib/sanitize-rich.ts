import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes admin-authored Tiptap HTML: allows the tags Tiptap emits (incl.
 * spec tables and inline images) and forces safe link attributes, while
 * stripping scripts, event handlers and unsafe URLs. Server-only — keep
 * `sanitize-html` out of the client bundle.
 */
export function sanitizeRich(html: string): string {
  return sanitizeHtml(html, {
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
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
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
}
