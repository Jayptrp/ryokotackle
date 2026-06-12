"use client";

import Image from "@tiptap/extension-image";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useRef } from "react";

/**
 * Drag-to-resize image node view. Selecting an image shows a corner handle;
 * dragging it sets a pixel `width` (persisted as the img `width` attribute, which
 * the public RichContent renderer honours). Width is capped to the editor width
 * by `max-w-full`, so images never overflow.
 */
function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = imgRef.current?.offsetWidth ?? 0;

    function onMove(ev: MouseEvent) {
      const next = Math.max(60, Math.round(startWidth + ev.clientX - startX));
      updateAttributes({ width: next });
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const width = node.attrs.width as number | null;

  return (
    <NodeViewWrapper className="relative my-4 inline-block max-w-full leading-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- editor node view, arbitrary user image */}
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt ?? ""}
        style={width ? { width: `${width}px` } : undefined}
        draggable={false}
        className={`max-w-full rounded-lg border ${
          selected ? "border-primary ring-2 ring-primary/40" : "border-outline-variant"
        }`}
      />
      {selected && (
        <span
          onMouseDown={startResize}
          title="ลากเพื่อปรับขนาด"
          className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-primary shadow"
        />
      )}
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          const n = w ? parseInt(w, 10) : NaN;
          return Number.isFinite(n) ? n : null;
        },
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
