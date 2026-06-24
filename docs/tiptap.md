# Tiptap Rich Text Editor Guide

This document describes how the Tiptap rich-text editors are structured, configured, and integrated within the Ryoko Tackle codebase.

---

## Editor Variants

The codebase contains two distinct editor components in `src/components/admin/`:

1. **`SummaryEditor` (`summary-editor.tsx`)**:
   - A compact, low-height text-only editor designed for product summaries (`คำอธิบายสั้น`).
   - Supports Bold, Italic, Underline, and Text Alignment.
   - Intentionally omits headings, lists, tables, and images.

2. **`TiptapEditor` (`tiptap-editor.tsx`)**:
   - The main rich-text editor designed for full product details (`รายละเอียดสินค้า`) and warranty descriptions (`คำบรรยาย`).
   - Supports headings (H2, H3), bullet/ordered lists, tables, image uploads, bold, italic, underline, alignment, and undo/redo.

---

## Core Configuration & Extensions

All Tiptap editors in this project configure the following extensions:

- **`StarterKit`**: Basic formatting commands (Bold, Italic, lists, headings, history/undo/redo).
- **`Underline`**: Custom mark for underlines.
- **`TextAlign`**: Configured with `types: ["heading", "paragraph"]` to allow aligning headers and text.
- **`Placeholder`**: Displays placeholder text when empty.
- **`AlignShortcuts` (Custom Extension)**: Honoring boss-requested keyboard shortcuts for alignment:
  - `Ctrl + L` / `Cmd + L`: Align Left
  - `Ctrl + E` / `Cmd + E`: Align Center
  - `Ctrl + R` / `Cmd + R`: Align Right

---

## Image Handling & Uploads (`TiptapEditor` only)

The `TiptapEditor` supports inline images via the **`ResizableImage`** extension.

### How Upload Works
1. When an image is **pasted**, **dropped**, or **inserted** via the toolbar icon, the editor checks for a valid `productId` prop.
2. If `productId` is present, it compresses the image client-side via `compressImage` (`src/lib/compress-image.ts`) and submits it to `/api/admin/upload` in a `POST` request.
3. The server saves the file under `product-media` bucket at path:  
   `${productId}/inline/${timestamp}-${random}.{ext}`
4. The uploaded public URL is returned and inserted as a Tiptap `<img src="..." />` element.

### Disabling Images
If a section should not support images (such as the warranty page subtitle), omit the `productId` prop on `<TiptapEditor>`. When `productId` is absent:
- The toolbar image insert button is automatically hidden.
- Pasting or dropping images is disabled.

---

## Sanitization and Rendering

Since Tiptap outputs raw HTML, we must sanitize it before displaying it publicly to prevent XSS attacks.

### Rendering Component: `RichContent` (`src/components/rich-content.tsx`)
Always use the `<RichContent>` component to render Tiptap HTML on public pages. It handles:
- **Sanitization**: Uses `sanitize-html` to whitelist formatting tags (`p`, `h2`, `h3`, `ul`, `ol`, `li`, `table`, `a`, `img`, etc.) and strip unsafe script injections.
- **Style Preservation**: Whitelists the `style` attribute (e.g. `style="text-align: center"`) to preserve text alignments applied inside the editor.
- **Tailwind Prose Styling**: Styles heading margins, list discs/spacing, and spec table borders consistently.

---

## SEO & Page Metadata

Tiptap HTML should **never** be output directly into `<meta>` tags (like `description`) as search engine crawlers don't parse raw HTML tags well.

### Stripping HTML for Meta Tags
Always use the `toMetaDescription` helper function before passing Tiptap output to Next.js metadata. It strips all HTML tags and collapses whitespace:

```typescript
function toMetaDescription(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
```

---

## Editor Revert Pattern

In line with `docs/admin-editor-pattern.md`, admin page sections support reverting to their original snapshot (captured in `useRef` at load).

Because Tiptap maintains its own internal state machine, simply updating its `defaultValue` prop will **not** trigger a reset.

### Force Remounting
To reset a Tiptap editor when the user clicks "คืนค่า" (Revert):
1. Maintain a stateful numeric key in the parent editor (e.g., `subtitleKey` or `descriptionKey`).
2. Attach it to the component: `<TiptapEditor key={`desc-${descriptionKey}`} ... />`.
3. Increment this key in the revert handler to force React to unmount and remount the editor with the fresh `orig.current` snapshot.
