"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";
import { ResizableImage } from "@/components/admin/resizable-image";

// Tailwind preflight strips list/heading/table defaults and there is no
// typography plugin, so the editor content is styled explicitly here (mirrors
// the public RichContent look). Tables get a full grid for clear editing.
const CONTENT_CLASS = [
  "min-h-[300px] w-full max-w-none rounded-b-lg border-x border-b border-outline-variant",
  "bg-white p-4 font-body-md text-body-md leading-relaxed text-on-surface outline-none focus:border-primary",
  "[&_h2]:font-headline-sm [&_h2]:text-headline-sm [&_h2]:text-primary [&_h2]:mt-6 [&_h2]:mb-2",
  "[&_h3]:font-medium [&_h3]:text-on-surface [&_h3]:mt-4 [&_h3]:mb-1",
  "[&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1",
  "[&_a]:text-secondary [&_a]:underline",
  "[&_table]:my-4 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse",
  "[&_th]:border [&_th]:border-outline-variant [&_th]:bg-secondary [&_th]:text-on-secondary [&_th]:p-2 [&_th]:text-left [&_th]:font-label-caps [&_th]:text-label-caps",
  "[&_td]:border [&_td]:border-outline-variant [&_td]:p-2 [&_td]:align-top",
].join(" ");

interface TiptapEditorProps {
  name: string;
  defaultValue?: string | null;
  productId?: string;
  onUpdate?: (html: string) => void;
}

function ToolBtn({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded text-sm transition-colors",
        active
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container",
      )}
    >
      {children}
    </button>
  );
}

export function TiptapEditor({ name, defaultValue, productId, onUpdate }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      ResizableImage.configure({ allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "เขียนรายละเอียดสินค้า..." }),
    ],
    content: defaultValue ?? "",
    editorProps: {
      attributes: { class: CONTENT_CLASS },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const files = items
          .filter((item) => item.type.startsWith("image/"))
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null);

        if (files.length > 0 && productId) {
          files.forEach(async (file) => {
            const upload = await compressImage(file);
            const formData = new FormData();
            formData.set("file", upload);
            formData.set("productId", productId);
            formData.set("folder", "inline");
            const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
            if (res.ok) {
              const { url } = await res.json();
              setTimeout(() => {
                if (editor && !editor.isDestroyed) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              }, 0);
            }
          });
          return true; // prevent default paste
        }
        return false; // let Tiptap handle other types (text, etc)
      },
      handleDrop: (view, event, slice, moved) => {
        if (moved) return false; // let Tiptap handle internal moves
        const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
          file.type.startsWith("image/")
        );

        if (files.length > 0 && productId) {
          event.preventDefault();
          event.stopPropagation();

          // Try to get drop position
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const pos = coordinates?.pos ?? view.state.selection.from;

          files.forEach(async (file) => {
            const upload = await compressImage(file);
            const formData = new FormData();
            formData.set("file", upload);
            formData.set("productId", productId);
            formData.set("folder", "inline");
            const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
            if (res.ok) {
              const { url } = await res.json();
              setTimeout(() => {
                if (editor && !editor.isDestroyed) {
                  editor.chain().focus().insertContentAt(pos, { type: "image", attrs: { src: url } }).run();
                }
              }, 0);
            }
          });
          return true;
        }
        return false;
      },
    },
  });

  const uploadInlineImage = useCallback(async () => {
    if (!editor || !productId) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const upload = await compressImage(file);
      const formData = new FormData();
      formData.set("file", upload);
      formData.set("productId", productId);
      formData.set("folder", "inline");
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        editor.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  }, [editor, productId]);

  // Tiptap v3's useEditor doesn't re-render on every transaction, so toolbar
  // state (active marks, and the table-only buttons gated on isActive("table"))
  // would go stale. Re-render the toolbar on each transaction/selection change.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const rerender = () => setTick((t) => t + 1);
    editor.on("transaction", rerender);
    if (onUpdate) {
      const handler = () => onUpdate(editor.getHTML());
      editor.on("update", handler);
      return () => { editor.off("transaction", rerender); editor.off("update", handler); };
    }
    return () => { editor.off("transaction", rerender); };
  }, [editor, onUpdate]);

  if (!editor) return null;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-outline-variant bg-surface-container p-1">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <em>I</em>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <span className="underline">U</span>
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-outline-variant" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">
          H2
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">
          H3
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-outline-variant" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <Icon name="format_list_bulleted" className="text-base" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
          <Icon name="format_list_numbered" className="text-base" />
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-outline-variant" />

        <ToolBtn
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run()
          }
          title="Insert table"
        >
          <Icon name="table_chart" className="text-base" />
        </ToolBtn>
        {editor.isActive("table") && (
          <>
            <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column">
              <Icon name="add_column_right" className="text-base" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row">
              <Icon name="add_row_below" className="text-base" />
            </ToolBtn>
            <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table">
              <Icon name="delete" className="text-base" />
            </ToolBtn>
          </>
        )}

        {productId && (
          <>
            <div className="mx-1 h-5 w-px bg-outline-variant" />
            <ToolBtn onClick={uploadInlineImage} title="Insert image">
              <Icon name="image" className="text-base" />
            </ToolBtn>
          </>
        )}

        <div className="mx-1 h-5 w-px bg-outline-variant" />

        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Icon name="undo" className="text-base" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Icon name="redo" className="text-base" />
        </ToolBtn>
      </div>

      <EditorContent editor={editor} />

      {/* Hidden input carries HTML on form submit */}
      <input type="hidden" name={name} value={editor.getHTML()} />
    </div>
  );
}
