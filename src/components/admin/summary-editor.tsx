"use client";

import { Extension } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

// Compact rich-text editor for the short summary. Supports bold, underline,
// italic, paragraph alignment, and Enter for new paragraphs. Deliberately omits
// headings/lists/tables/images — this is a *short* description.
const CONTENT_CLASS = [
  "min-h-[96px] w-full rounded-b-lg border-x border-b border-outline-variant",
  "bg-white p-4 font-body-md text-body-md leading-relaxed text-on-surface outline-none focus:border-primary",
  "[&_p]:mb-2 last:[&_p]:mb-0",
].join(" ");

// Honor the exact Ctrl+L / Ctrl+E / Ctrl+R alignment shortcuts the boss asked
// for (the official TextAlign defaults are Ctrl+Shift+…). Returning true from a
// handler prevents the browser default while the editor is focused.
const AlignShortcuts = Extension.create({
  name: "alignShortcuts",
  addKeyboardShortcuts() {
    return {
      "Mod-l": () => this.editor.commands.setTextAlign("left"),
      "Mod-e": () => this.editor.commands.setTextAlign("center"),
      "Mod-r": () => this.editor.commands.setTextAlign("right"),
    };
  },
});

interface SummaryEditorProps {
  name: string;
  defaultValue?: string | null;
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

export function SummaryEditor({ name, defaultValue, onUpdate }: SummaryEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      AlignShortcuts,
      Placeholder.configure({
        placeholder: "เช่น: รอกหยดน้ำระดับพรีเมียม สเปคญี่ปุ่นแท้ พร้อมระบบเบรก X-Drag",
      }),
    ],
    content: defaultValue ?? "",
    editorProps: { attributes: { class: CONTENT_CLASS } },
  });

  // Tiptap v3 doesn't re-render the toolbar on every transaction; force it so
  // active-state highlighting stays in sync. Empty content submits as "" so the
  // server stores NULL (not Tiptap's "<p></p>").
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const rerender = () => setTick((t) => t + 1);
    editor.on("transaction", rerender);
    if (onUpdate) {
      const handler = () => onUpdate(editor.isEmpty ? "" : editor.getHTML());
      editor.on("update", handler);
      return () => { editor.off("transaction", rerender); editor.off("update", handler); };
    }
    return () => { editor.off("transaction", rerender); };
  }, [editor, onUpdate]);

  if (!editor) return null;

  const value = editor.isEmpty ? "" : editor.getHTML();

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-outline-variant bg-surface-container p-1">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="ตัวหนา (Ctrl+B)">
          <strong>B</strong>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="ตัวเอียง (Ctrl+I)">
          <em>I</em>
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="ขีดเส้นใต้ (Ctrl+U)">
          <span className="underline">U</span>
        </ToolBtn>

        <div className="mx-1 h-5 w-px bg-outline-variant" />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="ชิดซ้าย (Ctrl+L)">
          <Icon name="format_align_left" className="text-base" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="กึ่งกลาง (Ctrl+E)">
          <Icon name="format_align_center" className="text-base" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="ชิดขวา (Ctrl+R)">
          <Icon name="format_align_right" className="text-base" />
        </ToolBtn>
      </div>

      <EditorContent editor={editor} />

      {/* Hidden input carries HTML on form submit */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
