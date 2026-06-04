"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  name: string;
  defaultValue?: string | null;
  productId?: string; // for inline image upload
}

export function TiptapEditor({ name, defaultValue, productId }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "เขียนรายละเอียดสินค้า..." }),
    ],
    content: defaultValue ?? "",
    editorProps: {
      attributes: {
        class:
          "min-h-[300px] w-full rounded-b-lg border-x border-b border-outline-variant bg-white p-4 font-body-md text-body-md leading-relaxed text-on-surface outline-none focus:border-primary prose prose-sm max-w-none",
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
      const formData = new FormData();
      formData.set("file", file);
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

  if (!editor) return null;

  const ToolBtn = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
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
              <Icon name="table_rows_delete" className="text-base" />
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
